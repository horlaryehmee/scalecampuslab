<?php

namespace App\Services;

use App\Models\LoginChallenge;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Notifications\LoginVerificationCode;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class LoginMfaService
{
    public const CONTEXT_WEB = 'web';

    public const CONTEXT_LEGACY_API = 'legacy_api';

    public const CONTEXT_API_V1 = 'api_v1';

    public function requiredFor(User $user): bool
    {
        if ($user->two_factor_enabled) {
            return true;
        }

        if (! $user->isAdmin()) {
            return false;
        }

        $settings = PlatformSetting::query()->find('admin.global')?->value ?? [];

        return (bool) data_get($settings, 'security.adminMfaRequired', false);
    }

    /** @return array{challenge_token: string, masked_email: string, expires_at: string} */
    public function start(User $user, string $context, bool $remember = false): array
    {
        $this->assertContext($context);

        $plainToken = Str::random(64);
        $plainCode = $this->generateCode();
        $expiresAt = now()->addMinutes($this->codeTtlMinutes());

        LoginChallenge::query()
            ->where('user_id', $user->id)
            ->where('context', $context)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $challenge = LoginChallenge::create([
            'user_id' => $user->id,
            'token_hash' => $this->tokenHash($plainToken),
            'code_hash' => Hash::make($plainCode),
            'context' => $context,
            'remember' => $remember,
            'attempts' => 0,
            'max_attempts' => $this->maxAttempts(),
            'resend_count' => 0,
            'last_sent_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        try {
            $user->notify(new LoginVerificationCode($plainCode, $expiresAt));
        } catch (Throwable $exception) {
            $challenge->delete();
            report($exception);

            throw ValidationException::withMessages([
                'email' => ['We could not send a sign-in code. Please try again shortly.'],
            ]);
        }

        return $this->challengePayload($plainToken, $user, $expiresAt);
    }

    /** @return array{user: User, remember: bool} */
    public function verify(string $plainToken, string $plainCode, string $context): array
    {
        $this->assertContext($context);

        /** @var array{challenge?: LoginChallenge, error?: string} $result */
        $result = DB::transaction(function () use ($plainToken, $plainCode, $context): array {
            $challenge = LoginChallenge::query()
                ->with('user')
                ->where('token_hash', $this->tokenHash($plainToken))
                ->where('context', $context)
                ->lockForUpdate()
                ->first();

            if (! $challenge || $challenge->consumed_at) {
                return ['error' => 'This verification challenge is no longer valid. Sign in again.'];
            }

            if ($challenge->expires_at->isPast()) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                return ['error' => 'This verification code has expired. Sign in again.'];
            }

            if ($challenge->attempts >= $challenge->max_attempts) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                return ['error' => 'Too many incorrect attempts. Sign in again to request a new code.'];
            }

            if (! Hash::check($plainCode, $challenge->code_hash)) {
                $attempts = $challenge->attempts + 1;
                $challenge->forceFill([
                    'attempts' => $attempts,
                    'consumed_at' => $attempts >= $challenge->max_attempts ? now() : null,
                ])->save();

                return ['error' => $attempts >= $challenge->max_attempts
                    ? 'Too many incorrect attempts. Sign in again to request a new code.'
                    : 'The verification code is incorrect.'];
            }

            $challenge->forceFill(['consumed_at' => now()])->save();

            return ['challenge' => $challenge];
        });

        if (isset($result['error'])) {
            throw ValidationException::withMessages(['code' => [$result['error']]]);
        }

        /** @var LoginChallenge $challenge */
        $challenge = $result['challenge'];

        return [
            'user' => $challenge->user,
            'remember' => $challenge->remember,
        ];
    }

    /** @return array{challenge_token: string, masked_email: string, expires_at: string} */
    public function resend(string $plainToken, string $context): array
    {
        $this->assertContext($context);
        $plainCode = $this->generateCode();
        $expiresAt = now()->addMinutes($this->codeTtlMinutes());

        /** @var array{challenge?: LoginChallenge, error?: string} $result */
        $result = DB::transaction(function () use ($plainToken, $plainCode, $expiresAt, $context): array {
            $challenge = LoginChallenge::query()
                ->with('user')
                ->where('token_hash', $this->tokenHash($plainToken))
                ->where('context', $context)
                ->lockForUpdate()
                ->first();

            if (! $challenge || $challenge->consumed_at) {
                return ['error' => 'This verification challenge is no longer valid. Sign in again.'];
            }

            if ($challenge->expires_at->isPast()) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                return ['error' => 'This verification challenge is no longer valid. Sign in again.'];
            }

            if ($challenge->resend_count >= $this->maxResends()) {
                $challenge->forceFill(['consumed_at' => now()])->save();

                return ['error' => 'The resend limit has been reached. Sign in again to request a new code.'];
            }

            $availableAt = $challenge->last_sent_at->addSeconds($this->resendCooldownSeconds());
            if ($availableAt->isFuture()) {
                return ['error' => 'Please wait before requesting another code.'];
            }

            $challenge->forceFill([
                'code_hash' => Hash::make($plainCode),
                'attempts' => 0,
                'resend_count' => $challenge->resend_count + 1,
                'last_sent_at' => now(),
                'expires_at' => $expiresAt,
            ])->save();

            return ['challenge' => $challenge];
        });

        if (isset($result['error'])) {
            throw ValidationException::withMessages(['challenge_token' => [$result['error']]]);
        }

        /** @var LoginChallenge $challenge */
        $challenge = $result['challenge'];

        try {
            $challenge->user->notify(new LoginVerificationCode($plainCode, $expiresAt));
        } catch (Throwable $exception) {
            $challenge->forceFill(['consumed_at' => now()])->save();
            report($exception);

            throw ValidationException::withMessages([
                'challenge_token' => ['We could not send a new code. Sign in again and retry.'],
            ]);
        }

        return $this->challengePayload($plainToken, $challenge->user, $expiresAt);
    }

    /** @return array{challenge_token: string, masked_email: string, expires_at: string} */
    private function challengePayload(string $plainToken, User $user, Carbon $expiresAt): array
    {
        return [
            'challenge_token' => $plainToken,
            'masked_email' => $this->maskEmail($user->email),
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = mb_substr($local, 0, 1);
        $maskLength = max(2, min(6, mb_strlen($local) - 1));

        return $visible.str_repeat('*', $maskLength).'@'.$domain;
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function tokenHash(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }

    private function codeTtlMinutes(): int
    {
        return max(1, min(30, (int) config('login_mfa.code_ttl_minutes', 10)));
    }

    private function maxAttempts(): int
    {
        return max(3, min(10, (int) config('login_mfa.max_attempts', 5)));
    }

    private function resendCooldownSeconds(): int
    {
        return max(15, min(300, (int) config('login_mfa.resend_cooldown_seconds', 60)));
    }

    private function maxResends(): int
    {
        return max(1, min(5, (int) config('login_mfa.max_resends', 3)));
    }

    private function assertContext(string $context): void
    {
        if (! in_array($context, [self::CONTEXT_WEB, self::CONTEXT_LEGACY_API, self::CONTEXT_API_V1], true)) {
            throw new \InvalidArgumentException('Unsupported login MFA context.');
        }
    }
}
