<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureWaitlistAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->get('waitlist_admin_authenticated')) {
            return redirect()->route('admin.waitlist.login');
        }

        return $next($request);
    }
}
