<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LoginMfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly LoginMfaService $mfa) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $accessStatus = $user->access_status ?? 'active';

        if ($accessStatus !== 'active') {
            $user->tokens()->delete();

            return response()->json([
                'message' => $accessStatus === 'suspended'
                    ? 'This account has been suspended. Contact the platform administrator.'
                    : 'This account is awaiting institution or platform approval.',
            ], 403);
        }

        if ($this->mfa->requiredFor($user)) {
            $challenge = $this->mfa->start($user, LoginMfaService::CONTEXT_LEGACY_API);

            return response()->json([
                'message' => 'Enter the verification code sent to your email address.',
                'mfa_required' => true,
                ...$challenge,
            ], 202);
        }

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
            LoginMfaService::CONTEXT_LEGACY_API,
        );

        $this->ensureActive($result['user']);

        return $this->authenticatedResponse($result['user']);
    }

    public function resendMfa(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => ['required', 'string', 'size:64'],
        ]);
        $challenge = $this->mfa->resend(
            $validated['challenge_token'],
            LoginMfaService::CONTEXT_LEGACY_API,
        );

        return response()->json([
            'message' => 'A new sign-in code has been sent.',
            'mfa_required' => true,
            ...$challenge,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    private function authenticatedResponse(User $user): JsonResponse
    {
        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => $user->only(['id', 'name', 'email', 'role', 'school_id']),
        ]);
    }

    private function ensureActive(User $user): void
    {
        $accessStatus = $user->access_status ?? 'active';

        if ($accessStatus === 'active') {
            return;
        }

        $user->tokens()->delete();

        abort(403, $accessStatus === 'suspended'
            ? 'This account has been suspended. Contact the platform administrator.'
            : 'This account is awaiting institution or platform approval.');
    }
}
