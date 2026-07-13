<?php

namespace Tests\Feature;

use App\Models\LoginChallenge;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Notifications\LoginVerificationCode;
use App\Services\AccountSessionRevoker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LoginMfaTest extends TestCase
{
    use RefreshDatabase;

    public function test_web_login_does_not_authenticate_until_the_emailed_code_is_verified(): void
    {
        Notification::fake();
        $user = $this->mfaUser('university');

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
            'remember' => '1',
        ])->assertRedirect('/two-factor-challenge');

        $this->assertGuest();
        $this->assertDatabaseCount('personal_access_tokens', 0);

        $code = $this->latestCodeFor($user);
        $challenge = LoginChallenge::query()->sole();
        $this->assertNotSame($code, $challenge->code_hash);
        $this->assertTrue(Hash::check($code, $challenge->code_hash));

        $this->get('/two-factor-challenge')
            ->assertOk()
            ->assertSee('data-page="mfa-challenge"', false);

        $this->post('/two-factor-challenge', ['code' => $code])
            ->assertRedirect('/dashboard/university');

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($challenge->fresh()->consumed_at);
    }

    public function test_challenge_is_invalidated_after_the_configured_number_of_wrong_attempts(): void
    {
        Notification::fake();
        $user = $this->mfaUser('student');

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
        ])->assertRedirect('/two-factor-challenge');

        $sentCode = $this->latestCodeFor($user);
        $wrongCode = $sentCode === '000000' ? '999999' : '000000';

        foreach (range(1, 5) as $attempt) {
            $this->post('/two-factor-challenge', ['code' => $wrongCode])
                ->assertSessionHasErrors('code');
        }

        $challenge = LoginChallenge::query()->sole();
        $this->assertSame(5, $challenge->attempts);
        $this->assertNotNull($challenge->consumed_at);
        $this->assertGuest();
    }

    public function test_legacy_api_issues_no_token_and_cannot_use_a_v1_challenge_endpoint(): void
    {
        Notification::fake();
        $user = $this->mfaUser('student');

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
        ])->assertStatus(202)
            ->assertJsonPath('mfa_required', true)
            ->assertJsonMissingPath('token');

        $this->assertDatabaseCount('personal_access_tokens', 0);
        $token = $login->json('challenge_token');
        $code = $this->latestCodeFor($user);
        $challenge = LoginChallenge::query()->sole();
        $this->assertNotSame($token, $challenge->token_hash);
        $this->assertSame(hash('sha256', $token), $challenge->token_hash);

        $this->postJson('/api/v1/mfa/verify', [
            'challenge_token' => $token,
            'code' => $code,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->postJson('/api/mfa/verify', [
            'challenge_token' => $token,
            'code' => $code,
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role']]);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_v1_mfa_verification_establishes_the_stateful_session_only_after_success(): void
    {
        Notification::fake();
        $user = $this->mfaUser('university');
        $this->withHeaders([
            'Origin' => config('app.url'),
            'Referer' => config('app.url').'/login',
        ]);

        $login = $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
            'remember' => true,
        ])->assertStatus(202)
            ->assertJsonPath('mfa_required', true)
            ->assertJsonMissingPath('token');

        $this->assertGuest();
        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->postJson('/api/v1/mfa/verify', [
            'challenge_token' => $login->json('challenge_token'),
            'code' => $this->latestCodeFor($user),
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonStructure(['token', 'token_type', 'user']);

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_resend_rotates_the_code_and_the_old_code_cannot_complete_login(): void
    {
        Notification::fake();
        $user = $this->mfaUser('student');

        $login = $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
        ])->assertStatus(202);
        $token = $login->json('challenge_token');
        $oldCode = $this->latestCodeFor($user);

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/mfa/resend', ['challenge_token' => $token])
            ->assertOk()
            ->assertJsonPath('challenge_token', $token);
        $newCode = $this->latestCodeFor($user);

        $this->postJson('/api/v1/mfa/verify', [
            'challenge_token' => $token,
            'code' => $oldCode,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->postJson('/api/v1/mfa/verify', [
            'challenge_token' => $token,
            'code' => $newCode,
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_expired_codes_are_rejected_and_consumed(): void
    {
        Notification::fake();
        config()->set('login_mfa.code_ttl_minutes', 1);
        $user = $this->mfaUser('student');

        $login = $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
        ])->assertStatus(202);
        $code = $this->latestCodeFor($user);

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/mfa/verify', [
            'challenge_token' => $login->json('challenge_token'),
            'code' => $code,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->assertNotNull(LoginChallenge::query()->sole()->consumed_at);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_saved_global_admin_policy_requires_mfa_even_when_the_user_toggle_is_off(): void
    {
        Notification::fake();
        PlatformSetting::create([
            'key' => 'admin.global',
            'value' => ['security' => ['adminMfaRequired' => true]],
        ]);
        $admin = $this->mfaUser('admin', false);

        $this->postJson('/api/v1/login', [
            'email' => $admin->email,
            'password' => 'Campus2026',
        ])->assertStatus(202)
            ->assertJsonPath('mfa_required', true)
            ->assertJsonMissingPath('token');

        Notification::assertSentTo($admin, LoginVerificationCode::class);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_security_session_revocation_also_invalidates_pending_login_challenges(): void
    {
        Notification::fake();
        $user = $this->mfaUser('student');

        $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'Campus2026',
        ])->assertStatus(202);

        $this->assertNull(LoginChallenge::query()->sole()->consumed_at);
        app(AccountSessionRevoker::class)->revokeAll($user);
        $this->assertNotNull(LoginChallenge::query()->sole()->fresh()->consumed_at);
    }

    private function mfaUser(string $role, bool $enabled = true): User
    {
        return User::factory()->create([
            'role' => $role,
            'password' => Hash::make('Campus2026'),
            'two_factor_enabled' => $enabled,
        ]);
    }

    private function latestCodeFor(User $user): string
    {
        /** @var LoginVerificationCode $notification */
        $notification = Notification::sent($user, LoginVerificationCode::class)->last();
        $this->assertNotNull($notification);

        return $notification->code;
    }
}
