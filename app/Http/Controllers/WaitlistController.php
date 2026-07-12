<?php

namespace App\Http\Controllers;

use App\Models\WaitlistSignup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class WaitlistController extends Controller
{
    public function landing(): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->to(match (Auth::user()->role) {
                'admin' => route('dashboard.admin'),
                'university' => route('dashboard.university'),
                'school', 'high_school' => route('dashboard.school'),
                default => route('dashboard.student'),
            });
        }

        return view('app', [
            'page' => 'landing',
            'props' => [
                'signupCount' => WaitlistSignup::count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:waitlist_signups,email'],
            'role' => ['required', 'in:university,high_school,student'],
            'consent' => ['accepted'],
        ], [
            'consent.accepted' => 'Please confirm that you want to receive the launch notification.',
        ]);

        WaitlistSignup::create($validated);

        return redirect()->route('waitlist.success')->with('signup_email', $validated['email']);
    }

    public function success(): View
    {
        return view('app', [
            'page' => 'success',
            'props' => [
                'email' => session('signup_email'),
            ],
        ]);
    }
}
