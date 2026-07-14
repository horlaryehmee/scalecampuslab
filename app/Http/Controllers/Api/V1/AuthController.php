<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use App\Services\AccountSessionRevoker;
use App\Services\LoginMfaService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private const SPA_TOKEN_NAME = 'scale-campus-spa';

    public function __construct(
        private readonly AccountSessionRevoker $sessionRevoker,
        private readonly LoginMfaService $mfa,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:180', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:60'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
            'role' => ['required', Rule::in(['university', 'school', 'student'])],
            'school_name' => ['required_if:role,school', 'nullable', 'string', 'max:180'],
            'school_location' => ['required_if:role,school', 'nullable', 'string', 'max:180'],
            'school_id' => ['required_if:role,student', 'nullable', 'integer', 'exists:schools,id'],
            'student_identifier' => ['nullable', 'string', 'max:120'],
            'grade_level' => ['nullable', 'string', 'max:40'],
            'interest_major' => ['nullable', 'string', 'max:120'],
        ]);

        /** @var User $user */
        $user = DB::transaction(function () use ($validated): User {
            $school = null;

            if ($validated['role'] === 'school') {
                $school = School::create([
                    'name' => trim($validated['school_name']),
                    'location' => trim($validated['school_location']),
                    'coordinator_name' => trim($validated['name']),
                    'coordinator_email' => $validated['email'],
                    'coordinator_phone' => $validated['phone'] ?? null,
                ]);
            }

            return User::create([
                'name' => trim($validated['name']),
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'password' => $validated['password'],
                'role' => $validated['role'],
                'access_status' => 'pending',
                'school_id' => $school?->id ?? ($validated['school_id'] ?? null),
                'student_identifier' => $validated['role'] === 'student'
                    ? ($validated['student_identifier'] ?? null)
                    : null,
                'grade_level' => $validated['role'] === 'student'
                    ? ($validated['grade_level'] ?? null)
                    : null,
                'interest_major' => $validated['role'] === 'student'
                    ? ($validated['interest_major'] ?? null)
                    : null,
            ]);
        });

        $this->startWebSessionWhenAvailable($request, $user, true);
        $token = $this->issueSpaToken($user);
        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Account created. Check your email to verify your address.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);

        $credentials = $request->validate([
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $this->ensureActive($user);

        if ($this->mfa->requiredFor($user)) {
            $challenge = $this->mfa->start(
                $user,
                LoginMfaService::CONTEXT_API_V1,
                $request->boolean('remember'),
            );

            return response()->json([
                'message' => 'Enter the verification code sent to your email address.',
                'mfa_required' => true,
                ...$challenge,
            ], 202);
        }

        $this->startWebSessionWhenAvailable($request, $user, $request->boolean('remember'));

        return $this->authenticatedResponse($user);
    }

    public function demoLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'university', 'school', 'student'])],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $role = $validated['role'];
            $school = null;

            if (in_array($role, ['school', 'student'], true)) {
                $school = School::query()->updateOrCreate(
                    ['coordinator_email' => 'demo-school@scalecampuslab.test'],
                    [
                        'name' => 'Lincoln High School (Demo)',
                        'location' => '123 Education Blvd, Cityville, ST 12345',
                        'coordinator_name' => 'Jane Doe',
                        'coordinator_phone' => '(555) 123-4567',
                        'website' => 'https://lincolnhigh.scalecampuslab.test',
                        'address' => '123 Education Boulevard',
                        'city' => 'Cityville',
                        'state' => 'ST',
                        'country' => 'United States',
                        'principal_name' => 'Dr. Evelyn Carter',
                        'counselor_name' => 'Jane Doe',
                        'counselor_email' => 'jane.doe@lincolnhigh.edu',
                        'grade_range' => 'Grades 9-12',
                        'student_count' => 1240,
                        'visit_notes' => 'Demo school profile for ScaleCampusLab campus visit workflows.',
                        'email_notifications' => true,
                    ],
                );
            }

            $profile = match ($role) {
                'admin' => ['name' => 'Platform Admin', 'email' => 'admin@scalecampuslab.test', 'phone' => '+1 555 0100'],
                'university' => ['name' => 'University Demo', 'email' => 'university@scalecampuslab.test', 'phone' => '+1 555 0110'],
                'school' => ['name' => 'School Demo', 'email' => 'school@scalecampuslab.test', 'phone' => '+1 555 0120'],
                default => ['name' => 'Student Demo', 'email' => 'student@scalecampuslab.test', 'phone' => '+1 555 0130'],
            };

            return User::query()->updateOrCreate(
                ['email' => $profile['email']],
                [
                    'name' => $profile['name'],
                    'phone' => $profile['phone'],
                    'password' => 'password',
                    'role' => $role,
                    'access_status' => 'active',
                    'email_verified_at' => now(),
                    'school_id' => $school?->id,
                    'student_identifier' => $role === 'student' ? 'DEMO-STUDENT' : null,
                    'grade_level' => $role === 'student' ? '12th' : null,
                    'interest_major' => $role === 'student' ? 'Campus Visits' : null,
                    'is_demo' => true,
                    'two_factor_enabled' => false,
                ],
            );
        });

        $this->startWebSessionWhenAvailable($request, $user, true);

        return $this->authenticatedResponse($user);
    }

    public function verifyMfa(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => ['required', 'string', 'size:64'],
            'code' => ['required', 'digits:6'],
        ]);
        $result = $this->mfa->verify(
            $validated['challenge_token'],
            $validated['code'],
            LoginMfaService::CONTEXT_API_V1,
        );
        $user = $result['user'];

        $this->ensureActive($user);
        $this->startWebSessionWhenAvailable($request, $user, $result['remember']);

        return $this->authenticatedResponse($user);
    }

    public function resendMfa(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => ['required', 'string', 'size:64'],
        ]);
        $challenge = $this->mfa->resend(
            $validated['challenge_token'],
            LoginMfaService::CONTEXT_API_V1,
        );

        return response()->json([
            'message' => 'A new sign-in code has been sent.',
            'mfa_required' => true,
            ...$challenge,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $accessToken = $user?->currentAccessToken();

        if ($accessToken instanceof PersonalAccessToken) {
            $accessToken->delete();
        }

        // Stateful Sanctum requests use a transient token, so also remove the
        // SPA token by its bounded name without touching integration tokens.
        $user?->tokens()->where('name', self::SPA_TOKEN_NAME)->delete();

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Signed out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->ensureNotSuspended($user);
        $this->startWebSessionWhenAvailable($request, $user, true);

        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:180'],
        ]);

        Password::sendResetLink($validated);

        // The same response for every address prevents account enumeration.
        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $credentials = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email:rfc', 'max:180'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
        ]);

        $status = Password::reset(
            $credentials,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $this->sessionRevoker->revokeAll($user);
                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => __($status)]);
    }

    public function sendVerificationNotification(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->ensureNotSuspended($user);

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Your email address is already verified.',
                'user' => $this->userPayload($user),
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'A new verification link has been sent.']);
    }

    public function verifyEmail(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::findOrFail($id);
        abort_unless(hash_equals((string) $hash, sha1($user->getEmailForVerification())), 403, 'This verification link is invalid.');

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect()->to('/login?verified=1');
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        $user->loadMissing('school:id,name,location');
        $role = $user->role === 'high_school' ? 'school' : $user->role;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $role,
            'access_status' => $user->access_status ?? 'active',
            'school_id' => $user->school_id,
            'school' => $user->school ? [
                'id' => $user->school->id,
                'name' => $user->school->name,
                'location' => $user->school->location,
            ] : null,
            'email_verified' => $user->hasVerifiedEmail(),
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'dashboard_path' => match ($role) {
                'admin' => '/dashboard/admin',
                'university' => '/dashboard/university',
                'school' => '/dashboard/school',
                default => '/dashboard/student',
            },
        ];
    }

    private function normalizeEmail(Request $request): void
    {
        if ($request->has('email') && is_string($request->input('email'))) {
            $request->merge(['email' => Str::lower(trim($request->string('email')->toString()))]);
        }
    }

    private function issueSpaToken(User $user): string
    {
        $user->tokens()->where('name', self::SPA_TOKEN_NAME)->delete();

        return $user->createToken(self::SPA_TOKEN_NAME)->plainTextToken;
    }

    private function authenticatedResponse(User $user): JsonResponse
    {
        return response()->json([
            'message' => 'Signed in successfully.',
            'token' => $this->issueSpaToken($user),
            'token_type' => 'Bearer',
            'user' => $this->userPayload($user),
        ]);
    }

    private function startWebSessionWhenAvailable(Request $request, User $user, bool $remember): void
    {
        if (! $request->hasSession()) {
            return;
        }

        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();
    }

    private function ensureActive(User $user): void
    {
        if (($user->access_status ?? 'active') === 'active') {
            return;
        }

        $user->tokens()->delete();

        $message = $user->access_status === 'suspended'
            ? 'This account has been suspended. Contact the platform administrator.'
            : 'This account is awaiting institution or platform approval.';

        throw new HttpResponseException(response()->json(['message' => $message], 403));
    }

    private function ensureNotSuspended(User $user): void
    {
        if (($user->access_status ?? 'active') !== 'suspended') {
            return;
        }

        $user->tokens()->delete();

        throw new HttpResponseException(response()->json([
            'message' => 'This account has been suspended. Contact the platform administrator.',
        ], 403));
    }
}
