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
    public function login(): View|RedirectResponse
    {
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
        $request->session()->forget('waitlist_admin_authenticated');

        return redirect()->route('admin.waitlist.login');
    }

    public function index(Request $request): View
    {
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
