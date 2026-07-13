<?php

namespace Tests\Feature;

use App\Http\Controllers\ApplicationPaymentController;
use App\Models\AdmissionApplication;
use App\Models\ApplicationPayment;
use App\Models\InstitutionProgram;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApplicationPaymentTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'sk_test_scale_campus_lab';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.paystack.base_url' => 'https://api.paystack.co',
            'services.paystack.secret_key' => self::SECRET,
            'services.paystack.callback_url' => 'https://scalecampuslab.test/payments/paystack/callback',
            'services.paystack.supported_currencies' => ['NGN'],
            'services.paystack.retries' => 1,
        ]);

        Route::middleware('web')->group(function (): void {
            Route::post('/_payments/applications/{application}/initialize', [ApplicationPaymentController::class, 'initialize']);
            Route::get('/_payments/callback', [ApplicationPaymentController::class, 'callback']);
            Route::get('/_payments/{payment}/receipt', [ApplicationPaymentController::class, 'receipt']);
            Route::get('/_payments/{payment}/receipt/download', [ApplicationPaymentController::class, 'downloadReceipt']);
        });

        Route::post('/_payments/webhook', [ApplicationPaymentController::class, 'webhook']);
    }

    public function test_student_can_initialize_a_payment_once_and_reuse_the_pending_checkout(): void
    {
        [$student, , $application] = $this->application();

        Http::fake(function (ClientRequest $request) {
            return Http::response([
                'status' => true,
                'message' => 'Authorization URL created',
                'data' => [
                    'authorization_url' => 'https://checkout.paystack.com/session-123',
                    'access_code' => 'access-123',
                    'reference' => $request['reference'],
                ],
            ]);
        });

        $response = $this->actingAs($student)->postJson("/_payments/applications/{$application->id}/initialize");

        $response->assertCreated()
            ->assertJsonPath('payment.status', 'pending')
            ->assertJsonPath('payment.authorization_url', 'https://checkout.paystack.com/session-123');

        Http::assertSent(function (ClientRequest $request): bool {
            return $request->url() === 'https://api.paystack.co/transaction/initialize'
                && $request->method() === 'POST'
                && $request['amount'] === 125000
                && $request['currency'] === 'NGN'
                && $request['email'] === 'student@example.com'
                && $request['callback_url'] === 'https://scalecampuslab.test/payments/paystack/callback'
                && $request->hasHeader('Authorization', 'Bearer '.self::SECRET);
        });

        $this->actingAs($student)
            ->postJson("/_payments/applications/{$application->id}/initialize")
            ->assertOk()
            ->assertJsonPath('message', 'Existing payment session returned.');

        Http::assertSentCount(1);
        $this->assertDatabaseCount('application_payments', 1);
        $this->assertDatabaseHas('application_payments', [
            'admission_application_id' => $application->id,
            'student_user_id' => $student->id,
            'amount' => 1250.00,
            'currency' => 'NGN',
            'status' => 'pending',
        ]);
    }

    public function test_student_cannot_initialize_another_students_application_payment(): void
    {
        [, , $application] = $this->application();
        $otherStudent = $this->user('student', 'other-student@example.com');

        $this->actingAs($otherStudent)
            ->postJson("/_payments/applications/{$application->id}/initialize")
            ->assertForbidden();

        Http::assertNothingSent();
        $this->assertDatabaseCount('application_payments', 0);
    }

    public function test_verified_callback_settles_exact_payment_and_is_idempotent(): void
    {
        Queue::fake();
        [$student, , $application] = $this->application();
        $payment = $this->payment($application, $student);

        Http::fake([
            "https://api.paystack.co/transaction/verify/{$payment->reference}" => Http::response([
                'status' => true,
                'data' => $this->successfulGatewayData($payment),
            ]),
        ]);

        $this->getJson('/_payments/callback?reference='.$payment->reference)
            ->assertOk()
            ->assertJsonPath('payment.status', 'paid');

        $payment->refresh();
        $this->assertSame('paid', $payment->status);
        $this->assertSame('845921', $payment->gateway_reference);
        $this->assertNotNull($payment->paid_at);
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $student->id,
            'notification_type' => 'payment.confirmed',
        ]);

        $this->getJson('/_payments/callback?reference='.$payment->reference)
            ->assertOk()
            ->assertJsonPath('payment.status', 'paid');

        $this->assertDatabaseCount('platform_notifications', 1);
    }

    public function test_callback_rejects_amount_mismatch_without_settling_payment(): void
    {
        [$student, , $application] = $this->application();
        $payment = $this->payment($application, $student);
        $data = $this->successfulGatewayData($payment);
        $data['amount'] = 124999;

        Http::fake([
            "https://api.paystack.co/transaction/verify/{$payment->reference}" => Http::response([
                'status' => true,
                'data' => $data,
            ]),
        ]);

        $this->getJson('/_payments/callback?reference='.$payment->reference)
            ->assertStatus(422)
            ->assertJsonPath('message', 'The Paystack payment amount does not match.');

        $this->assertDatabaseHas('application_payments', [
            'id' => $payment->id,
            'status' => 'pending',
            'gateway_reference' => null,
        ]);
    }

    public function test_callback_records_an_exact_but_unsuccessful_transaction_as_failed(): void
    {
        [$student, , $application] = $this->application();
        $payment = $this->payment($application, $student);
        $data = $this->successfulGatewayData($payment);
        $data['status'] = 'failed';

        Http::fake([
            "https://api.paystack.co/transaction/verify/{$payment->reference}" => Http::response([
                'status' => true,
                'data' => $data,
            ]),
        ]);

        $this->getJson('/_payments/callback?reference='.$payment->reference)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Paystack reports that this payment was not successful.');

        $this->assertDatabaseHas('application_payments', [
            'id' => $payment->id,
            'status' => 'failed',
        ]);
    }

    public function test_signed_webhook_settles_once_and_rejects_an_invalid_signature(): void
    {
        Queue::fake();
        [$student, , $application] = $this->application();
        $payment = $this->payment($application, $student);
        $payload = json_encode([
            'event' => 'charge.success',
            'data' => $this->successfulGatewayData($payment),
        ], JSON_THROW_ON_ERROR);

        $this->postRawWebhook($payload, str_repeat('0', 128))->assertUnauthorized();
        $this->assertSame('pending', $payment->fresh()->status);

        $signature = hash_hmac('sha512', $payload, self::SECRET);
        $this->postRawWebhook($payload, $signature)
            ->assertOk()
            ->assertJsonPath('already_processed', false);

        $this->postRawWebhook($payload, $signature)
            ->assertOk()
            ->assertJsonPath('already_processed', true);

        $this->assertSame('paid', $payment->fresh()->status);
        $this->assertDatabaseCount('platform_notifications', 1);
    }

    public function test_paid_receipts_are_available_only_to_authorized_parties(): void
    {
        [$student, $university, $application] = $this->application();
        $payment = $this->payment($application, $student, 'paid');
        $outsider = $this->user('university', 'outsider@example.com');

        $this->actingAs($student)
            ->get("/_payments/{$payment->id}/receipt")
            ->assertOk()
            ->assertSee($payment->reference)
            ->assertSee('NGN 1,250.00');

        $this->actingAs($university)
            ->get("/_payments/{$payment->id}/receipt")
            ->assertOk();

        $this->actingAs($outsider)
            ->get("/_payments/{$payment->id}/receipt")
            ->assertForbidden();

        $this->actingAs($student)
            ->get("/_payments/{$payment->id}/receipt/download")
            ->assertOk()
            ->assertHeader('content-disposition', 'attachment; filename="ScaleCampusLab-receipt-'.$payment->reference.'.html"')
            ->assertHeader('x-content-type-options', 'nosniff');
    }

    /** @return array{User, User, AdmissionApplication} */
    private function application(): array
    {
        $student = $this->user('student', 'student@example.com');
        $university = $this->user('university', 'university@example.com');
        $program = InstitutionProgram::create([
            'university_user_id' => $university->id,
            'institution_type' => 'university',
            'name' => 'Computer Science',
            'code' => 'CS-'.Str::upper(Str::random(5)),
            'application_fee' => '1250.00',
            'currency' => 'NGN',
            'status' => 'published',
        ]);
        $application = AdmissionApplication::create([
            'student_user_id' => $student->id,
            'institution_program_id' => $program->id,
            'reference' => 'SCL-APP-'.Str::upper(Str::random(10)),
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return [$student, $university, $application];
    }

    private function payment(
        AdmissionApplication $application,
        User $student,
        string $status = 'pending',
    ): ApplicationPayment {
        return ApplicationPayment::create([
            'admission_application_id' => $application->id,
            'student_user_id' => $student->id,
            'provider' => 'paystack',
            'reference' => 'SCLPAY-'.Str::ulid(),
            'gateway_reference' => $status === 'paid' ? 'paid-'.Str::random(8) : null,
            'amount' => '1250.00',
            'currency' => 'NGN',
            'status' => $status,
            'paid_at' => $status === 'paid' ? now() : null,
        ]);
    }

    /** @return array<string, mixed> */
    private function successfulGatewayData(ApplicationPayment $payment): array
    {
        return [
            'id' => 845921,
            'status' => 'success',
            'reference' => $payment->reference,
            'amount' => 125000,
            'currency' => 'NGN',
            'paid_at' => '2026-07-13T12:30:00.000Z',
            'channel' => 'card',
            'fees' => 1875,
        ];
    }

    private function postRawWebhook(string $payload, string $signature)
    {
        return $this->call(
            'POST',
            '/_payments/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
            ],
            $payload,
        );
    }

    private function user(string $role, string $email): User
    {
        return User::create([
            'name' => ucfirst($role).' User',
            'email' => $email,
            'role' => $role,
            'access_status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
    }
}
