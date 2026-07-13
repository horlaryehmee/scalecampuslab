<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $status = $user?->access_status ?? 'active';

        if ($user && $status !== 'active') {
            $token = $user->currentAccessToken();

            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }

            if ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            $message = $status === 'suspended'
                ? 'This account has been suspended. Contact the platform administrator.'
                : 'This account is awaiting institution or platform approval.';

            if (! $request->expectsJson() && ! $request->is('api/*')) {
                return redirect()->route('login')->withErrors(['email' => $message]);
            }

            return new JsonResponse([
                'message' => $message,
            ], 403);
        }

        return $next($request);
    }
}
