<?php

namespace App\Http\Controllers;

use App\Models\WaitlistSignup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFactory;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminWaitlistController extends Controller
{
    private const WAITLIST_PIN = 'Bakhtech01';

    public function pin(): View|RedirectResponse
    {
        if (session('admin_waitlist_unlocked')) {
            return redirect()->route('admin.waitlist.login');
        }

        return view('app', [
            'page' => 'pin-gate',
            'props' => [
                'title' => 'Waitlist access',
                'subtitle' => 'Enter the waitlist PIN before opening waitlist records.',
                'action' => route('admin.waitlist.pin.verify'),
                'redirectTo' => route('admin.waitlist.login'),
                'buttonLabel' => 'Unlock waitlist',
            ],
        ]);
    }

    public function verifyPin(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pin' => ['required', 'string'],
            'redirect' => ['nullable', 'string'],
        ]);

        if (! hash_equals(self::WAITLIST_PIN, $validated['pin'])) {
            return back()->withErrors(['pin' => 'The waitlist PIN is incorrect.'])->withInput();
        }

        $request->session()->put('admin_waitlist_unlocked', true);

        return redirect()->to($validated['redirect'] ?: route('admin.waitlist.login'));
    }

    public function login(): View|RedirectResponse
    {
        if (! session('admin_waitlist_unlocked')) {
            return redirect()->route('admin.waitlist.pin');
        }

        if (session('waitlist_admin_authenticated')) {
            return redirect()->route('admin.waitlist.index');
        }

        return view('app', [
            'page' => 'admin-login',
            'props' => [],
        ]);
    }

    public function authenticate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $expected = config('waitlist.admin_password');

        if (! is_string($expected) || ! hash_equals($expected, $validated['password'])) {
            return back()->withErrors(['password' => 'The admin password is incorrect.']);
        }

        $request->session()->put('waitlist_admin_authenticated', true);
        $request->session()->regenerate();

        return redirect()->route('admin.waitlist.index');
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget(['waitlist_admin_authenticated', 'admin_waitlist_unlocked']);

        return redirect()->route('admin.waitlist.login');
    }

    public function index(Request $request): View|RedirectResponse
    {
        if (! session('admin_waitlist_unlocked')) {
            return redirect()->route('admin.waitlist.pin');
        }

        $query = WaitlistSignup::query()->latest();

        $signups = $query->paginate(20)->withQueryString();

        return view('app', [
            'page' => 'admin',
            'props' => [
                'signups' => $signups->items(),
                'pagination' => [
                    'currentPage' => $signups->currentPage(),
                    'lastPage' => $signups->lastPage(),
                    'total' => $signups->total(),
                    'nextPageUrl' => $signups->nextPageUrl(),
                    'previousPageUrl' => $signups->previousPageUrl(),
                    'firstItem' => $signups->firstItem(),
                    'pages' => collect(range(1, $signups->lastPage()))
                        ->map(fn (int $page): array => [
                            'page' => $page,
                            'url' => $signups->url($page),
                        ])
                        ->all(),
                ],
                'stats' => [
                    'total' => WaitlistSignup::count(),
                ],
            ],
        ]);
    }

    public function export(): StreamedResponse
    {
        abort_unless(session('admin_waitlist_unlocked'), 403);

        $filename = 'scalecampuslab-waitlist-'.now()->format('Y-m-d-His').'.csv';

        return ResponseFactory::streamDownload(function (): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Full Name', 'Email', 'Joined At']);

            WaitlistSignup::orderBy('created_at')->chunk(200, function ($signups) use ($handle): void {
                foreach ($signups as $signup) {
                    fputcsv($handle, [
                        $signup->full_name,
                        $signup->email,
                        optional($signup->created_at)->toDateTimeString(),
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
