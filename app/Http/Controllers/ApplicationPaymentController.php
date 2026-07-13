<?php

namespace App\Http\Controllers;

use App\Exceptions\PaymentVerificationException;
use App\Models\AdmissionApplication;
use App\Models\ApplicationPayment;
use App\Models\User;
use App\Services\PaystackService;
use App\Services\PlatformNotifier;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use JsonException;
use Throwable;

class ApplicationPaymentController extends Controller
{
    public function __construct(
        private readonly PaystackService $paystack,
        private readonly PlatformNotifier $notifier,
    ) {}

    public function initialize(Request $request, AdmissionApplication $application): JsonResponse|RedirectResponse
    {
        $student = $request->user();
        abort_unless($student?->role === 'student', 403);

        [$payment, $reused] = $this->reservePaymentAttempt($application, $student);

        if ($reused) {
            return $this->initializationResponse($request, $payment, true);
        }

        try {
            $data = $this->paystack->initializeTransaction(
                $student->email,
                $this->paystack->toSubunit($payment->amount),
                $payment->currency,
                $payment->reference,
                $this->callbackUrl(),
                [
                    'application_payment_id' => $payment->id,
                    'admission_application_id' => $application->id,
                    'application_reference' => $application->reference,
                    'student_user_id' => $student->id,
                ],
            );

            $payment = DB::transaction(function () use ($payment, $data): ApplicationPayment {
                $lockedPayment = ApplicationPayment::query()->lockForUpdate()->findOrFail($payment->id);

                if ($lockedPayment->status === 'pending') {
                    $metadata = $lockedPayment->metadata ?? [];
                    $metadata['paystack_access_code'] = (string) ($data['access_code'] ?? '');
                    $metadata['initialized_at'] = now()->toIso8601String();

                    $lockedPayment->update([
                        'authorization_url' => $data['authorization_url'],
                        'metadata' => $metadata,
                    ]);
                }

                return $lockedPayment->fresh();
            });
        } catch (Throwable $exception) {
            report($exception);

            DB::transaction(function () use ($payment): void {
                $failedPayment = ApplicationPayment::query()->lockForUpdate()->find($payment->id);

                if ($failedPayment?->status === 'pending') {
                    $failedPayment->update([
                        'status' => 'failed',
                        'metadata' => array_merge($failedPayment->metadata ?? [], [
                            'failure_stage' => 'initialization',
                            'failed_at' => now()->toIso8601String(),
                        ]),
                    ]);
                }
            });

            return $this->errorResponse(
                $request,
                'The payment provider could not start this payment. Please try again.',
                502,
            );
        }

        return $this->initializationResponse($request, $payment, false);
    }

    public function callback(Request $request): JsonResponse|RedirectResponse
    {
        $reference = $this->referenceFromRequest($request);

        if ($reference === null) {
            return $this->callbackErrorResponse($request, 'The payment callback reference is invalid.', 422);
        }

        $payment = ApplicationPayment::query()->where('reference', $reference)->first();

        if (! $payment) {
            return $this->callbackErrorResponse($request, 'The payment reference was not found.', 404);
        }

        try {
            $data = $this->paystack->verifyTransaction($reference);
            [$payment, $newlyPaid] = $this->settlePayment($payment, $data, 'callback');
        } catch (PaymentVerificationException $exception) {
            Log::warning('Paystack callback verification failed.', [
                'payment_id' => $payment->id,
                'reference' => $reference,
                'reason' => $exception->getMessage(),
            ]);

            return $this->callbackErrorResponse($request, $exception->getMessage(), 422);
        } catch (Throwable $exception) {
            report($exception);

            return $this->callbackErrorResponse(
                $request,
                'We could not verify the payment with Paystack yet. Please try again.',
                502,
            );
        }

        if ($newlyPaid) {
            $this->sendConfirmationNotification($payment);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Payment verified successfully.',
                'payment' => $this->paymentPayload($payment),
            ]);
        }

        if ($request->user() && $this->canView($request->user(), $payment)) {
            return redirect('/application-payments/'.$payment->id.'/receipt')
                ->with('status', 'Payment confirmed successfully.');
        }

        return redirect('/login')->with('status', 'Payment confirmed successfully. Sign in to view your receipt.');
    }

    public function webhook(Request $request): JsonResponse
    {
        $rawPayload = $request->getContent();

        try {
            $signatureIsValid = $this->paystack->hasValidWebhookSignature(
                $rawPayload,
                $request->header('x-paystack-signature'),
            );
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'Payment webhook is not configured.'], 503);
        }

        if (! $signatureIsValid) {
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        try {
            $payload = json_decode($rawPayload, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return response()->json(['message' => 'Invalid webhook payload.'], 422);
        }

        if (! is_array($payload) || ! is_string($payload['event'] ?? null)) {
            return response()->json(['message' => 'Invalid webhook payload.'], 422);
        }

        if ($payload['event'] !== 'charge.success') {
            return response()->json(['received' => true]);
        }

        $data = $payload['data'] ?? null;
        $reference = is_array($data) ? ($data['reference'] ?? null) : null;

        if (! is_string($reference) || ! preg_match('/^[A-Za-z0-9._-]{8,80}$/', $reference)) {
            return response()->json(['message' => 'Invalid payment reference.'], 422);
        }

        $payment = ApplicationPayment::query()->where('reference', $reference)->first();

        if (! $payment) {
            Log::notice('Paystack webhook referenced an unknown local payment.', ['reference' => $reference]);

            return response()->json(['received' => true]);
        }

        try {
            [$payment, $newlyPaid] = $this->settlePayment($payment, $data, 'webhook');
        } catch (PaymentVerificationException $exception) {
            Log::warning('Paystack webhook verification failed.', [
                'payment_id' => $payment->id,
                'reference' => $reference,
                'reason' => $exception->getMessage(),
            ]);

            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if ($newlyPaid) {
            $this->sendConfirmationNotification($payment);
        }

        return response()->json([
            'received' => true,
            'already_processed' => ! $newlyPaid,
        ]);
    }

    public function receipt(Request $request, ApplicationPayment $payment): Response
    {
        $this->authorizeViewer($request, $payment);
        abort_unless($payment->status === 'paid', 404);

        return response()
            ->view('payments.receipt', ['payment' => $this->receiptPayment($payment)])
            ->header('Cache-Control', 'private, no-store');
    }

    public function downloadReceipt(Request $request, ApplicationPayment $payment): Response
    {
        $this->authorizeViewer($request, $payment);
        abort_unless($payment->status === 'paid', 404);

        $payment = $this->receiptPayment($payment);
        $html = view('payments.receipt', compact('payment'))->render();

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="ScaleCampusLab-receipt-'.$payment->reference.'.html"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @return array{ApplicationPayment, bool} */
    private function reservePaymentAttempt(AdmissionApplication $application, User $student): array
    {
        return DB::transaction(function () use ($application, $student): array {
            $application = AdmissionApplication::query()
                ->with('program')
                ->lockForUpdate()
                ->findOrFail($application->id);

            abort_unless($application->student_user_id === $student->id, 403);
            abort_unless(
                in_array($application->status, ['submitted', 'under_review', 'waitlisted', 'accepted'], true),
                422,
                'Submit the application before paying its application fee.',
            );

            $amount = $this->paystack->toSubunit($application->program->application_fee);
            abort_if($amount < 1, 422, 'This application does not require a payment.');

            $currency = strtoupper($application->program->currency);
            $supportedCurrencies = config('services.paystack.supported_currencies', ['NGN']);
            abort_unless(
                is_array($supportedCurrencies) && in_array($currency, $supportedCurrencies, true),
                422,
                'Payments are not configured for this program currency.',
            );

            abort_if(
                $application->payments()->where('status', 'paid')->exists(),
                409,
                'This application fee has already been paid.',
            );

            $pending = $application->payments()
                ->where('status', 'pending')
                ->latest('id')
                ->first();

            if ($pending?->authorization_url
                && $this->paystack->toSubunit($pending->amount) === $amount
                && strtoupper($pending->currency) === $currency) {
                return [$pending, true];
            }

            if ($pending) {
                $staleAfterMinutes = max(1, (int) config('services.paystack.initialization_stale_after_minutes', 5));

                abort_if(
                    ! $pending->authorization_url
                        && $pending->created_at->greaterThan(now()->subMinutes($staleAfterMinutes)),
                    409,
                    'This payment is already being initialized. Please wait a moment and try again.',
                );

                $pending->update([
                    'status' => 'failed',
                    'metadata' => array_merge($pending->metadata ?? [], [
                        'failure_stage' => 'stale_initialization',
                        'failed_at' => now()->toIso8601String(),
                    ]),
                ]);
            }

            $payment = $application->payments()->create([
                'student_user_id' => $student->id,
                'provider' => 'paystack',
                'reference' => 'SCLPAY-'.Str::ulid(),
                'amount' => $application->program->application_fee,
                'currency' => $currency,
                'status' => 'pending',
                'metadata' => [
                    'application_reference' => $application->reference,
                    'created_at' => now()->toIso8601String(),
                ],
            ]);

            return [$payment, false];
        }, 3);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{ApplicationPayment, bool}
     */
    private function settlePayment(ApplicationPayment $payment, array $data, string $source): array
    {
        [$payment, $newlyPaid, $successful] = DB::transaction(function () use ($payment, $data, $source): array {
            $payment = ApplicationPayment::query()->lockForUpdate()->findOrFail($payment->id);
            $this->assertGatewayValuesMatch($payment, $data);

            if (($data['status'] ?? null) !== 'success') {
                if ($payment->status === 'pending') {
                    $payment->update([
                        'status' => 'failed',
                        'metadata' => array_merge($payment->metadata ?? [], [
                            'failure_stage' => 'verification',
                            'verification_source' => $source,
                            'gateway_status' => (string) ($data['status'] ?? 'unknown'),
                            'failed_at' => now()->toIso8601String(),
                        ]),
                    ]);
                }

                return [$payment->fresh(), false, false];
            }

            $gatewayReference = trim((string) ($data['id'] ?? ''));

            if ($gatewayReference === '' || strlen($gatewayReference) > 120) {
                throw new PaymentVerificationException('Paystack did not return a valid transaction identifier.');
            }

            if (ApplicationPayment::query()
                ->where('gateway_reference', $gatewayReference)
                ->where('id', '!=', $payment->id)
                ->exists()) {
                throw new PaymentVerificationException('This Paystack transaction was already used for another payment.');
            }

            if (in_array($payment->status, ['paid', 'refunded'], true)) {
                if ($payment->gateway_reference !== $gatewayReference) {
                    throw new PaymentVerificationException('The Paystack transaction identifier does not match the settled record.');
                }

                return [$payment, false, true];
            }

            $metadata = array_merge($payment->metadata ?? [], [
                'verification_source' => $source,
                'gateway_status' => 'success',
                'channel' => is_string($data['channel'] ?? null) ? $data['channel'] : null,
                'fees_subunit' => is_int($data['fees'] ?? null) ? $data['fees'] : null,
                'verified_at' => now()->toIso8601String(),
            ]);

            $payment->update([
                'gateway_reference' => $gatewayReference,
                'status' => 'paid',
                'paid_at' => $this->paidAt($data['paid_at'] ?? null),
                'metadata' => $metadata,
            ]);

            return [$payment->fresh(), true, true];
        }, 3);

        if (! $successful) {
            throw new PaymentVerificationException('Paystack reports that this payment was not successful.');
        }

        return [$payment, $newlyPaid];
    }

    /** @param array<string, mixed> $data */
    private function assertGatewayValuesMatch(ApplicationPayment $payment, array $data): void
    {
        if (($data['reference'] ?? null) !== $payment->reference) {
            throw new PaymentVerificationException('The Paystack payment reference does not match.');
        }

        $amount = $data['amount'] ?? null;
        if ((! is_int($amount) && ! (is_string($amount) && ctype_digit($amount)))
            || (int) $amount !== $this->paystack->toSubunit($payment->amount)) {
            throw new PaymentVerificationException('The Paystack payment amount does not match.');
        }

        if (! is_string($data['currency'] ?? null)
            || strtoupper($data['currency']) !== strtoupper($payment->currency)) {
            throw new PaymentVerificationException('The Paystack payment currency does not match.');
        }
    }

    private function paidAt(mixed $value): CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            return CarbonImmutable::now();
        }

        try {
            return CarbonImmutable::parse($value);
        } catch (Throwable) {
            return CarbonImmutable::now();
        }
    }

    private function sendConfirmationNotification(ApplicationPayment $payment): void
    {
        try {
            $payment->loadMissing(['student', 'application.program']);
            $this->notifier->notify(
                $payment->student,
                'Application fee payment confirmed',
                'Your payment for '.$payment->application->program->name.' was confirmed. Reference: '.$payment->reference.'.',
                'payment.confirmed',
                [
                    'application_id' => $payment->admission_application_id,
                    'payment_id' => $payment->id,
                    'reference' => $payment->reference,
                ],
            );
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function authorizeViewer(Request $request, ApplicationPayment $payment): void
    {
        abort_unless($request->user() && $this->canView($request->user(), $payment), 403);
    }

    private function canView(User $user, ApplicationPayment $payment): bool
    {
        if ($user->role === 'admin' || ($user->role === 'student' && $payment->student_user_id === $user->id)) {
            return true;
        }

        $payment->loadMissing('application.program');
        $program = $payment->application->program;

        return ($user->role === 'university' && $program->university_user_id === $user->id)
            || ($user->isSchool() && $user->school_id && $program->school_id === $user->school_id);
    }

    private function receiptPayment(ApplicationPayment $payment): ApplicationPayment
    {
        return $payment->loadMissing([
            'student:id,name,email',
            'application:id,institution_program_id,reference',
            'application.program:id,university_user_id,school_id,institution_type,name,code',
            'application.program.university:id,name',
            'application.program.school:id,name',
        ]);
    }

    private function referenceFromRequest(Request $request): ?string
    {
        $reference = $request->query('reference', $request->query('trxref'));

        return is_string($reference) && preg_match('/^[A-Za-z0-9._-]{8,80}$/', $reference)
            ? $reference
            : null;
    }

    private function callbackUrl(): string
    {
        $configured = trim((string) config('services.paystack.callback_url'));

        return $configured !== '' ? $configured : url('/payments/paystack/callback');
    }

    private function initializationResponse(
        Request $request,
        ApplicationPayment $payment,
        bool $reused,
    ): JsonResponse|RedirectResponse {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $reused ? 'Existing payment session returned.' : 'Payment initialized successfully.',
                'payment' => $this->paymentPayload($payment),
            ], $reused ? 200 : 201);
        }

        return redirect()->away($payment->authorization_url);
    }

    private function errorResponse(Request $request, string $message, int $status): JsonResponse|RedirectResponse
    {
        return $request->expectsJson()
            ? response()->json(['message' => $message], $status)
            : back()->withErrors(['payment' => $message]);
    }

    private function callbackErrorResponse(Request $request, string $message, int $status): JsonResponse|RedirectResponse
    {
        return $request->expectsJson()
            ? response()->json(['message' => $message], $status)
            : redirect('/login')->withErrors(['payment' => $message]);
    }

    /** @return array<string, mixed> */
    private function paymentPayload(ApplicationPayment $payment): array
    {
        return [
            'id' => $payment->id,
            'application_id' => $payment->admission_application_id,
            'reference' => $payment->reference,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'status' => $payment->status,
            'authorization_url' => $payment->authorization_url,
            'paid_at' => $payment->paid_at?->toIso8601String(),
        ];
    }
}
