<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    public function test_application_responses_include_security_headers(): void
    {
        $response = $this->get('/up');

        $response->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Permitted-Cross-Domain-Policies', 'none')
            ->assertHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
            ->assertHeader('Cross-Origin-Resource-Policy', 'same-site');

        $policy = (string) $response->headers->get('Content-Security-Policy');
        $this->assertStringContainsString("default-src 'self'", $policy);
        $this->assertStringContainsString("object-src 'none'", $policy);
        $this->assertStringContainsString("frame-ancestors 'self'", $policy);
        $this->assertStringContainsString("form-action 'self'", $policy);
        $this->assertSame(
            'camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()',
            $response->headers->get('Permissions-Policy'),
        );
        $this->assertFalse($response->headers->has('Strict-Transport-Security'));
    }

    public function test_secure_responses_enable_hsts(): void
    {
        $response = $this->get('https://localhost/up');

        $response->assertOk()
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    public function test_sanctum_personal_access_tokens_have_a_bounded_lifetime(): void
    {
        $expiration = config('sanctum.expiration');

        $this->assertIsInt($expiration);
        $this->assertGreaterThan(0, $expiration);
    }
}
