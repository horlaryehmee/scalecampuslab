<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
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
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthController extends Controller
{
    private const SPA_TOKEN_NAME = 'scale-campus-spa';

    private const LOGIN_ACCESS_PIN = 'Bakhtech';

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
        if (! session('login_access_unlocked')) {
            return $this->pinGate(
                title: 'Login access',
                subtitle: 'Enter the access PIN before opening the admin sign-in page.',
                action: route('login.pin.verify'),
                redirectTo: route('admin.login'),
            );
        }

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

    public function verifyLoginPin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pin' => ['required', 'string'],
            'redirect' => ['nullable', 'string'],
        ]);

        if (! hash_equals(self::LOGIN_ACCESS_PIN, $validated['pin'])) {
            return back()->withErrors(['pin' => 'The access PIN is incorrect.'])->withInput();
        }

        $request->session()->put('login_access_unlocked', true);

        return redirect()->to($validated['redirect'] ?: route('login'));
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
                ['school_code' => 'LHS-DEMO'],
                [
                    'school_code' => 'LHS-DEMO',
                    'name' => 'Lincoln High School (Demo)',
                    'school_type' => 'public',
                    'institution_level' => 'high_school',
                    'ownership' => 'Cityville Public Schools',
                    'location' => '123 Education Blvd, Cityville, ST 12345',
                    'coordinator_name' => 'Jane Doe',
                    'coordinator_email' => 'demo-school@scalecampuslab.test',
                    'coordinator_phone' => '(555) 123-4567',
                    'main_phone' => '+1 555 1200',
                    'website' => 'https://lincolnhigh.scalecampuslab.test',
                    'address' => '123 Education Boulevard',
                    'city' => 'Cityville',
                    'state' => 'ST',
                    'country' => 'United States',
                    'district' => 'Cityville Unified District',
                    'region' => 'Midwest US',
                    'timezone' => 'America/Chicago',
                    'principal_name' => 'Dr. Evelyn Carter',
                    'principal_email' => 'principal@lincolnhigh.edu',
                    'counselor_name' => 'Jane Doe',
                    'counselor_email' => 'jane.doe@lincolnhigh.edu',
                    'counselor_phone' => '+1 555 123 4568',
                    'admissions_email' => 'admissions@lincolnhigh.edu',
                    'registrar_email' => 'registrar@lincolnhigh.edu',
                    'emergency_contact_name' => 'Michael Harris',
                    'emergency_contact_phone' => '+1 555 123 4599',
                    'emergency_contact_email' => 'safety@lincolnhigh.edu',
                    'grade_range' => 'Grades 9-12',
                    'student_count' => 1240,
                    'accreditation' => 'State Board of Education accredited, regional college-readiness review',
                    'curriculum' => 'AP, Honors, STEM pathway, dual-credit college courses',
                    'academic_calendar' => 'Semester',
                    'graduation_rate' => 96.40,
                    'average_class_size' => 24,
                    'boarding_available' => false,
                    'international_students' => true,
                    'student_support_services' => 'College counseling, accessibility accommodations, mental health counseling, ELL support, and scholarship advising.',
                    'transportation_notes' => 'District buses are available for approved weekday visits. Pickup is from the east gate and return must be before 5:30 PM.',
                    'visit_policy' => 'Requires one chaperone per 15 students, signed guardian consent for minors, and final roster confirmation three business days before travel.',
                    'safety_policy_url' => 'https://lincolnhigh.scalecampuslab.test/safety',
                    'facebook_url' => 'https://facebook.com/lincolnhighdemo',
                    'linkedin_url' => 'https://linkedin.com/school/lincoln-high-demo',
                    'instagram_url' => 'https://instagram.com/lincolnhighdemo',
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

    public function showSchoolProgramSignup(Request $request, string $slug): View|RedirectResponse
    {
        $program = $this->publicProgramForSignup($slug);
        $request->session()->put('pending_public_program', [
            'id' => $program['id'],
            'slug' => $program['shareSlug'],
            'title' => $program['title'],
            'university' => $program['university'],
        ]);

        if ($request->user()?->isSchool()) {
            $assignedEvents = collect($request->user()->assigned_events ?? [])
                ->push($program['title'])
                ->filter()
                ->unique()
                ->values()
                ->all();

            $request->user()->forceFill(['assigned_events' => $assignedEvents])->save();

            return $request->user()->school_id
                ? redirect()->route('dashboard.school')->with('status', "{$program['title']} has been saved. Add students, then complete the visit registration from your dashboard.")
                : redirect()->route('school.onboarding');
        }

        if (Auth::check()) {
            return redirect()->to($this->redirectPath(Auth::user()->role));
        }

        return view('app', [
            'page' => 'school-program-signup',
            'props' => [
                'program' => $program,
                'action' => route('programs.public.join.store', $slug),
                'loginUrl' => route('login'),
            ],
        ]);
    }

    public function storeSchoolProgramSignup(Request $request, string $slug): RedirectResponse
    {
        $program = $this->publicProgramForSignup($slug);

        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:160', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
        ], [
            'email.unique' => 'This email already has an account. Sign in instead, then complete the programme registration from the school dashboard.',
        ]);

        $email = Str::lower(trim($validated['email']));
        $name = Str::of($email)->before('@')->replace(['.', '_', '-'], ' ')->title()->toString();

        $user = User::query()->create([
            'name' => $name ?: 'School Coordinator',
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'role' => 'school',
            'access_status' => 'active',
            'email_verified_at' => now(),
            'assigned_events' => [$program['title']],
            'is_demo' => false,
            'two_factor_enabled' => false,
        ]);

        Auth::guard('web')->login($user, true);
        $request->session()->regenerate();
        $request->session()->put('pending_public_program', [
            'id' => $program['id'],
            'slug' => $program['shareSlug'],
            'title' => $program['title'],
            'university' => $program['university'],
        ]);

        return redirect()->route('school.onboarding');
    }

    public function schoolOnboarding(Request $request): View|RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->isSchool(), 403);

        if ($user->school_id) {
            return redirect()->route('dashboard.school');
        }

        return view('app', [
            'page' => 'school-onboarding',
            'props' => [
                'action' => route('school.onboarding.store'),
                'program' => $request->session()->get('pending_public_program'),
                'account' => [
                    'email' => $user->email,
                    'name' => $user->name,
                ],
            ],
        ]);
    }

    public function storeSchoolOnboarding(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->isSchool(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'school_code' => ['nullable', 'string', 'max:40', 'unique:schools,school_code'],
            'school_type' => ['nullable', 'string', 'max:80'],
            'institution_level' => ['nullable', 'string', 'max:80'],
            'ownership' => ['nullable', 'string', 'max:80'],
            'website' => ['nullable', 'string', 'max:255'],
            'main_phone' => ['nullable', 'string', 'max:80'],
            'address' => ['required', 'string', 'max:180'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['required', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:160'],
            'region' => ['nullable', 'string', 'max:160'],
            'timezone' => ['nullable', 'timezone'],
            'coordinator_name' => ['required', 'string', 'max:160'],
            'coordinator_email' => ['required', 'email:rfc', 'max:160'],
            'admissions_email' => ['nullable', 'email:rfc', 'max:160'],
            'registrar_email' => ['nullable', 'email:rfc', 'max:160'],
            'coordinator_phone' => ['nullable', 'string', 'max:80'],
            'principal_name' => ['nullable', 'string', 'max:160'],
            'principal_email' => ['nullable', 'email:rfc', 'max:160'],
            'counselor_name' => ['nullable', 'string', 'max:160'],
            'counselor_email' => ['nullable', 'email:rfc', 'max:160'],
            'counselor_phone' => ['nullable', 'string', 'max:80'],
            'emergency_contact_name' => ['nullable', 'string', 'max:160'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:80'],
            'emergency_contact_email' => ['nullable', 'email:rfc', 'max:160'],
            'grade_range' => ['nullable', 'string', 'max:120'],
            'student_count' => ['nullable', 'integer', 'min:0', 'max:200000'],
            'accreditation' => ['nullable', 'string', 'max:255'],
            'curriculum' => ['nullable', 'string', 'max:255'],
            'academic_calendar' => ['nullable', 'string', 'max:120'],
            'graduation_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'average_class_size' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'boarding_available' => ['nullable', 'boolean'],
            'international_students' => ['nullable', 'boolean'],
            'student_support_services' => ['nullable', 'string', 'max:2000'],
            'transportation_notes' => ['nullable', 'string', 'max:2000'],
            'visit_policy' => ['nullable', 'string', 'max:2000'],
            'safety_policy_url' => ['nullable', 'string', 'max:500'],
            'facebook_url' => ['nullable', 'string', 'max:500'],
            'linkedin_url' => ['nullable', 'string', 'max:500'],
            'instagram_url' => ['nullable', 'string', 'max:500'],
            'visit_notes' => ['nullable', 'string', 'max:1200'],
            'email_notifications' => ['nullable', 'boolean'],
        ]);

        foreach (['website', 'safety_policy_url', 'facebook_url', 'linkedin_url', 'instagram_url'] as $urlField) {
            if (! empty($validated[$urlField])) {
                $validated[$urlField] = $this->normalizeExternalUrl($validated[$urlField]);
            }
        }

        $school = School::query()->create(array_merge($validated, [
            'school_code' => $validated['school_code'] ?: $this->uniqueSchoolCode($validated['name']),
            'location' => collect([$validated['city'], $validated['state'], $validated['country']])->filter()->implode(', '),
            'email_notifications' => $request->boolean('email_notifications'),
            'boarding_available' => $request->boolean('boarding_available'),
            'international_students' => $request->boolean('international_students'),
        ]));

        $user->forceFill([
            'name' => $validated['coordinator_name'],
            'phone' => $validated['coordinator_phone'] ?? null,
            'school_id' => $school->id,
        ])->save();

        $pendingProgram = $request->session()->pull('pending_public_program');
        $status = $pendingProgram
            ? "{$pendingProgram['title']} has been saved to your school workspace. Add students, then complete the visit registration from your dashboard."
            : 'Your school profile is ready. You can now add students and manage visit registrations.';

        return redirect()
            ->route('dashboard.school')
            ->with('status', $status);
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

    public function pinGate(string $title, string $subtitle, string $action, string $redirectTo): View
    {
        return view('app', [
            'page' => 'pin-gate',
            'props' => [
                'title' => $title,
                'subtitle' => $subtitle,
                'action' => $action,
                'redirectTo' => $redirectTo,
                'buttonLabel' => 'Continue',
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

    private function publicProgramForSignup(string $slug): array
    {
        $event = CampusEvent::query()
            ->with('university:id,name,email')
            ->where('share_slug', $slug)
            ->where('status', 'published')
            ->where('visibility', 'public')
            ->firstOrFail();

        return [
            'id' => $event->id,
            'title' => $event->title,
            'university' => $event->university?->name,
            'startsAt' => $event->starts_at?->toIso8601String(),
            'venue' => $event->venue,
            'location' => $event->location,
            'shareSlug' => $event->share_slug,
            'shareUrl' => route('programs.public.show', $event->share_slug),
        ];
    }

    private function normalizeExternalUrl(string $value): string
    {
        $url = trim($value);

        return preg_match('/^https?:\/\//i', $url) ? $url : 'https://'.$url;
    }

    private function uniqueSchoolCode(string $name): string
    {
        $base = Str::upper(Str::slug(Str::limit($name, 24, ''), '-')) ?: 'SCHOOL';
        $code = $base;
        $suffix = 2;

        while (School::query()->where('school_code', $code)->exists()) {
            $code = $base.'-'.$suffix;
            $suffix++;
        }

        return $code;
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
