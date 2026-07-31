<?php

namespace App\Http\Controllers;

use App\Models\WaitlistSignup;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
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
                'waitlistConfirmation' => session('signup_email') ? [
                    'email' => session('signup_email'),
                    'status' => session('waitlist_status', 'created'),
                ] : null,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'full_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'consent' => ['sometimes', 'accepted'],
        ], [
            'consent.accepted' => 'Please confirm that you want to receive the launch notification.',
        ]);

        $validated['email'] = Str::of($validated['email'])->lower()->toString();
        $emailName = Str::of($validated['email'])->before('@')->toString();
        $validated['full_name'] = ($validated['full_name'] ?? '') ?: Str::of(str_replace(['.', '_', '-'], ' ', $emailName))->title()->toString();
        unset($validated['consent']);

        $existingSignup = WaitlistSignup::where('email', $validated['email'])->first();

        if ($existingSignup) {
            return $this->confirmationRedirect($validated['email'], 'existing');
        }

        try {
            WaitlistSignup::create($validated);
        } catch (QueryException $exception) {
            if ($exception->getCode() !== '23000') {
                throw $exception;
            }

            return $this->confirmationRedirect($validated['email'], 'existing');
        }

        return $this->confirmationRedirect($validated['email'], 'created');
    }

    public function success(): RedirectResponse
    {
        return redirect()->route('waitlist.join')
            ->with('signup_email', session('signup_email'))
            ->with('waitlist_status', session('waitlist_status', 'created'));
    }

    private function confirmationRedirect(string $email, string $status): RedirectResponse
    {
        return redirect()
            ->route('waitlist.join')
            ->with('signup_email', $email)
            ->with('waitlist_status', $status);
    }
}
