<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Content-Security-Policy', $this->contentSecurityPolicy());
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-site');

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }

    private function contentSecurityPolicy(): string
    {
        $directives = [
            'default-src' => "default-src 'self'",
            'base-uri' => "base-uri 'self'",
            'object-src' => "object-src 'none'",
            'frame-ancestors' => "frame-ancestors 'self'",
            'form-action' => "form-action 'self'",
            'img-src' => "img-src 'self' data: blob: https:",
            'font-src' => "font-src 'self' data: https://fonts.gstatic.com",
            'style-src' => "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            'script-src' => "script-src 'self'",
            'connect-src' => "connect-src 'self'",
            'frame-src' => "frame-src 'self' https://www.openstreetmap.org https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
            'media-src' => "media-src 'self' blob:",
            'worker-src' => "worker-src 'self' blob:",
            'manifest-src' => "manifest-src 'self'",
        ];

        if (app()->isLocal()) {
            $viteHttp = 'http://localhost:* http://127.0.0.1:*';
            $viteWs = 'ws://localhost:* ws://127.0.0.1:*';

            $directives['font-src'] = "font-src 'self' data: https://fonts.gstatic.com {$viteHttp}";
            $directives['style-src'] = "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com {$viteHttp}";
            $directives['script-src'] = "script-src 'self' 'unsafe-inline' {$viteHttp}";
            $directives['connect-src'] = "connect-src 'self' {$viteHttp} {$viteWs}";
        }

        if (app()->isProduction()) {
            $directives[] = 'upgrade-insecure-requests';
        }

        return implode('; ', array_values($directives)).';';
    }
}
