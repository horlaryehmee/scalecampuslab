<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthController extends Controller
{
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

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        $request->session()->regenerate();

        $user = $request->user();

        if (($user->access_status ?? 'active') === 'suspended') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => 'This account has been suspended. Contact the platform administrator.',
            ]);
        }

        if ($request->routeIs('admin.login.authenticate') && ! $user->isAdmin()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => 'This account does not have admin access.',
            ]);
        }

        if (! $request->routeIs('admin.login.authenticate') && $user->isAdmin()) {
            return redirect()->route('dashboard.admin');
        }

        return redirect()->intended($this->redirectPath($user->role));
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('waitlist.landing');
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
}
