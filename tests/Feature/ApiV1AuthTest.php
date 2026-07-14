<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiV1AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_allows_universities_but_not_admins(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/register', [
            'name' => 'Scale University',
            'email' => 'admissions@scale.example',
            'password' => 'Campus2026',
            'password_confirmation' => 'Campus2026',
            'role' => 'university',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'university')
            ->assertJsonPath('user.dashboard_path', '/dashboard/university')
            ->assertJsonPath('user.email_verified', false)
            ->assertJsonStructure(['token', 'token_type', 'user']);

        $user = User::query()->where('email', 'admissions@scale.example')->firstOrFail();
        $this->assertNull($user->school_id);
        Notification::assertSentTo($user, VerifyEmail::class);

        $this->postJson('/api/v1/register', [
            'name' => 'Public Admin',
            'email' => 'public-admin@example.com',
            'password' => 'Campus2026',
            'password_confirmation' => 'Campus2026',
            'role' => 'admin',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'public-admin@example.com']);
    }

    public function test_school_registration_atomically_creates_and_links_a_real_school(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/register', [
            'name' => 'Ada Coordinator',
            'email' => 'ada@brightfuture.example',
            'phone' => '+2348000000000',
            'password' => 'Campus2026',
            'password_confirmation' => 'Campus2026',
            'role' => 'school',
            'school_name' => 'Bright Future School',
            'school_location' => 'Lagos',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'school')
            ->assertJsonPath('user.school.name', 'Bright Future School')
            ->assertJsonPath('user.dashboard_path', '/dashboard/school');

        $schoolId = $response->json('user.school_id');

        $this->assertDatabaseHas('schools', [
            'id' => $schoolId,
            'name' => 'Bright Future School',
            'coordinator_email' => 'ada@brightfuture.example',
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'ada@brightfuture.example',
            'role' => 'school',
            'school_id' => $schoolId,
        ]);
    }

    public function test_student_registration_requires_and_preserves_school_integrity(): void
    {
        Notification::fake();

        $payload = [
            'name' => 'Student One',
            'email' => 'student-one@example.com',
            'password' => 'Campus2026',
            'password_confirmation' => 'Campus2026',
            'role' => 'student',
        ];

        $this->postJson('/api/v1/register', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('school_id');

        $school = School::create(['name' => 'Linked School', 'location' => 'Abuja']);

        $this->postJson('/api/v1/register', $payload + [
            'school_id' => $school->id,
            'student_identifier' => 'STU-001',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'student')
            ->assertJsonPath('user.school_id', $school->id)
            ->assertJsonPath('user.dashboard_path', '/dashboard/student');

        $this->assertDatabaseHas('users', [
            'email' => 'student-one@example.com',
            'school_id' => $school->id,
            'student_identifier' => 'STU-001',
        ]);
    }

    public function test_suspended_users_cannot_login_or_use_an_existing_api_identity(): void
    {
        $user = User::factory()->create([
            'role' => 'student',
            'access_status' => 'suspended',
            'password' => Hash::make('Campus2026'),
        ]);

        $user->createToken('old-session');

        $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
        ])->assertForbidden()
            ->assertJsonPath('message', 'This account has been suspended. Contact the platform administrator.');

        $this->assertDatabaseCount('personal_access_tokens', 0);

        Sanctum::actingAs($user);
        $this->getJson('/api/v1/me')->assertForbidden();
    }

    public function test_pending_users_can_finish_email_setup_but_cannot_access_workflows(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create([
            'role' => 'university',
            'access_status' => 'pending',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('user.access_status', 'pending')
            ->assertJsonPath('user.email_verified', false);

        $this->postJson('/api/v1/email/verification-notification')->assertOk();
        Notification::assertSentTo($user, VerifyEmail::class);

        $this->getJson('/api/v1/dashboard')
            ->assertForbidden()
            ->assertJsonPath('message', 'This account is awaiting institution or platform approval.');
    }

    public function test_login_replaces_only_duplicate_spa_tokens_and_me_returns_auth_context(): void
    {
        $user = User::factory()->create([
            'role' => 'university',
            'password' => Hash::make('Campus2026'),
        ]);
        $user->createToken('integration-token');
        $user->createToken('scale-campus-spa');

        $this->postJson('/api/v1/login', [
            'email' => strtoupper($user->email),
            'password' => 'Campus2026',
        ])->assertOk()
            ->assertJsonPath('user.role', 'university');

        $this->assertSame(1, $user->tokens()->where('name', 'scale-campus-spa')->count());
        $this->assertSame(1, $user->tokens()->where('name', 'integration-token')->count());

        Sanctum::actingAs($user);
        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.dashboard_path', '/dashboard/university')
            ->assertJsonPath('user.email_verified', true);
    }

    public function test_stateful_spa_login_establishes_the_web_session_for_the_existing_dashboard(): void
    {
        $user = User::factory()->create([
            'role' => 'university',
            'password' => Hash::make('Campus2026'),
        ]);

        $this->withHeaders([
            'Origin' => config('app.url'),
            'Referer' => config('app.url').'/login',
        ])->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
        ])->assertOk()
            ->assertJsonPath('user.dashboard_path', '/dashboard/university');

        $this->assertAuthenticatedAs($user);
        $this->get('/dashboard/university')->assertOk();
    }

    public function test_me_restores_the_web_session_for_a_saved_spa_token(): void
    {
        $user = User::factory()->create(['role' => 'school']);
        $token = $user->createToken('scale-campus-spa')->plainTextToken;

        $this->assertGuest();

        $this->withToken($token)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('user.dashboard_path', '/dashboard/school');

        $this->assertAuthenticatedAs($user);
        $this->get('/dashboard/school')->assertOk();
    }

    public function test_logout_revokes_the_spa_token_without_revoking_integration_tokens(): void
    {
        $user = User::factory()->create(['role' => 'university']);
        $integrationToken = $user->createToken('integration-token');
        $spaToken = $user->createToken('scale-campus-spa');

        $this->withToken($spaToken->plainTextToken)
            ->postJson('/api/v1/logout')
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $spaToken->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $integrationToken->accessToken->id]);
    }

    public function test_password_reset_request_sends_laravel_reset_notification_and_reset_changes_password(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'password' => Hash::make('Campus2026'),
        ]);

        $this->postJson('/api/v1/forgot-password', ['email' => $user->email])
            ->assertOk();

        $token = null;
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$token): bool {
                $token = $notification->token;

                return true;
            },
        );

        $this->postJson('/api/v1/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'NewCampus2026',
            'password_confirmation' => 'NewCampus2026',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewCampus2026', $user->fresh()->password));
    }

    public function test_verification_notification_and_signed_handler_verify_the_email(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create(['role' => 'student']);

        Sanctum::actingAs($user);
        $this->postJson('/api/v1/email/verification-notification')
            ->assertOk();
        Notification::assertSentTo($user, VerifyEmail::class);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(30),
            ['id' => $user->id, 'hash' => sha1($user->email)],
        );

        $this->get($verificationUrl)
            ->assertRedirect('/login?verified=1');

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }
}
