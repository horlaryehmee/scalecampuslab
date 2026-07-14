<?php

namespace App\Http\Controllers;

use App\Models\School;
use App\Models\User;
use App\Services\LoginMfaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthController extends Controller
{
    private const SPA_TOKEN_NAME = 'scale-campus-spa';

    public function __construct(private readonly LoginMfaService $mfa) {}

    public function generalLogin(): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->to($this->redirectPath(Auth::user()->role));
        }

        return view('app', [
            'page' => 'login',
            'props' => [
                'mode' => 'general',
                'title' => 'Sign in',
                'subtitle' => 'Access your campus visit workspace.',
                'action' => route('login.authenticate'),
            ],
        ]);
    }

    public function adminLogin(): View|RedirectResponse
    {
        if (Auth::check() && Auth::user()->isAdmin()) {
            return redirect()->route('dashboard.admin');
        }

        return view('app', [
            'page' => 'login',
            'props' => [
                'mode' => 'admin',
                'title' => 'Admin sign in',
                'subtitle' => 'Manage users, analytics, events, and platform operations.',
                'action' => route('admin.login.authenticate'),
            ],
        ]);
    }

    public function authenticate(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string'],
        ]);

        $email = Str::lower(trim($credentials['email']));
        $user = User::query()->where('email', $email)->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        $this->ensureActive($user);

        if ($request->routeIs('admin.login.authenticate') && ! $user->isAdmin()) {
            throw ValidationException::withMessages([
                'email' => 'This account does not have admin access.',
            ]);
        }

        if ($this->mfa->requiredFor($user)) {
            $challenge = $this->mfa->start(
                $user,
                LoginMfaService::CONTEXT_WEB,
                $request->boolean('remember'),
            );

            $request->session()->regenerate();
            $request->session()->put([
                'login_mfa.challenge_token' => $challenge['challenge_token'],
                'login_mfa.masked_email' => $challenge['masked_email'],
                'login_mfa.expires_at' => $challenge['expires_at'],
            ]);

            return redirect()->route('login.mfa.challenge');
        }

        Auth::guard('web')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        if (! $request->routeIs('admin.login.authenticate') && $user->isAdmin()) {
            return redirect()->route('dashboard.admin');
        }

        return redirect()->intended($this->redirectPath($user->role));
    }

    public function demoLogin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'university', 'school', 'student'])],
        ]);

        $role = $validated['role'];
        $school = null;

        if (in_array($role, ['school', 'student'], true)) {
            $school = School::query()->updateOrCreate(
                ['name' => 'Lincoln High School'],
                [
                    'location' => '123 Education Blvd, Cityville, ST 12345',
                    'coordinator_name' => 'Jane Doe',
                    'coordinator_email' => 'jane.doe@lincolnhigh.edu',
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
                    'sms_alerts' => false,
                ],
            );
        }

        $profile = match ($role) {
            'admin' => ['name' => 'Platform Admin', 'email' => 'admin@scalecampuslab.test', 'phone' => '+1 555 0100'],
            'university' => ['name' => 'University Demo', 'email' => 'university@scalecampuslab.test', 'phone' => '+1 555 0110'],
            'school' => ['name' => 'School Demo', 'email' => 'school@scalecampuslab.test', 'phone' => '+1 555 0120'],
            default => ['name' => 'Student Demo', 'email' => 'student@scalecampuslab.test', 'phone' => '+1 555 0130'],
        };

        $user = User::query()->updateOrCreate(
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

        Auth::guard('web')->login($user, true);
        $request->session()->regenerate();

        return redirect()->to($this->redirectPath($user->role));
    }

    public function mfaChallenge(Request $request): View|RedirectResponse
    {
        if (! $request->session()->has('login_mfa.challenge_token')) {
            return redirect()->route('login');
        }

        return view('app', [
            'page' => 'mfa-challenge',
            'props' => [
                'maskedEmail' => $request->session()->get('login_mfa.masked_email'),
                'expiresAt' => $request->session()->get('login_mfa.expires_at'),
                'action' => route('login.mfa.verify'),
                'resendAction' => route('login.mfa.resend'),
            ],
        ]);
    }

    public function verifyMfa(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'digits:6'],
        ]);
        $plainToken = (string) $request->session()->get('login_mfa.challenge_token', '');

        if ($plainToken === '') {
            return redirect()->route('login')->withErrors([
                'email' => 'Your sign-in session expired. Please sign in again.',
            ]);
        }

        $result = $this->mfa->verify($plainToken, $validated['code'], LoginMfaService::CONTEXT_WEB);
        $user = $result['user'];
        $this->ensureActive($user);

        Auth::guard('web')->login($user, $result['remember']);
        $request->session()->forget('login_mfa');
        $request->session()->regenerate();

        return redirect()->intended($this->redirectPath($user->role));
    }

    public function resendMfa(Request $request): RedirectResponse
    {
        $plainToken = (string) $request->session()->get('login_mfa.challenge_token', '');

        if ($plainToken === '') {
            return redirect()->route('login')->withErrors([
                'email' => 'Your sign-in session expired. Please sign in again.',
            ]);
        }

        $challenge = $this->mfa->resend($plainToken, LoginMfaService::CONTEXT_WEB);
        $request->session()->put([
            'login_mfa.masked_email' => $challenge['masked_email'],
            'login_mfa.expires_at' => $challenge['expires_at'],
        ]);

        return back()->with('status', 'A new sign-in code has been sent.');
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->user()?->tokens()->where('name', self::SPA_TOKEN_NAME)->delete();

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('status', 'Signed out successfully.');
    }

    public function forgotPassword(): View
    {
        return view('app', [
            'page' => 'forgot-password',
            'props' => [
                'action' => route('password.email'),
            ],
        ]);
    }

    public function sendResetLink(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc'],
        ]);

        $status = Password::sendResetLink($validated);

        return $status === Password::RESET_LINK_SENT
            ? back()->with('status', __($status))
            : back()->withErrors(['email' => __($status)]);
    }

    private function redirectPath(string $role): string
    {
        return match ($role) {
            'admin' => route('dashboard.admin'),
            'university' => route('dashboard.university'),
            'high_school', 'school' => route('dashboard.school'),
            default => route('dashboard.student'),
        };
    }

    private function ensureActive(User $user): void
    {
        $accessStatus = $user->access_status ?? 'active';

        if ($accessStatus === 'active') {
            return;
        }

        throw ValidationException::withMessages([
            'email' => $accessStatus === 'suspended'
                ? 'This account has been suspended. Contact the platform administrator.'
                : 'This account is awaiting institution or platform approval.',
        ]);
    }
}
