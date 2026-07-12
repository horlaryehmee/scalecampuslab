<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403);
        }

        $normalizedRole = $user->role === 'high_school' ? 'school' : $user->role;

        if (! in_array($user->role, $roles, true)) {
            if (in_array($normalizedRole, $roles, true)) {
                return $next($request);
            }

            if ($request->is('api/*')) {
                return response()->json(['message' => 'Forbidden for this role.'], 403);
            }

            return redirect()->to(match ($user->role) {
                'admin' => route('dashboard.admin'),
                'university' => route('dashboard.university'),
                'high_school', 'school' => route('dashboard.school'),
                default => route('dashboard.student'),
            });
        }

        return $next($request);
    }
}
