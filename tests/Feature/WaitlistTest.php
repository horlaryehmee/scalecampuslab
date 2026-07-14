<?php

namespace Tests\Feature;

use App\Models\WaitlistSignup;
use App\Models\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_page_describes_a_launch_notification_not_platform_access(): void
    {
        $source = file_get_contents(resource_path('js/app.jsx'));

        $this->assertStringContainsString('Plan.', $source);
        $this->assertStringContainsString('Join the waitlist for the launch notification. This does not create an account or password.', $source);
    }

    public function test_waitlist_signup_is_stored_and_redirects_to_success_page(): void
    {
        $response = $this->post('/waitlist', [
            'full_name' => 'Ada Recruiter',
            'email' => 'ada@example.com',
            'role' => 'university',
            'consent' => '1',
        ]);

        $response->assertRedirect('/thank-you');

        $this->assertDatabaseHas('waitlist_signups', [
            'full_name' => 'Ada Recruiter',
            'email' => 'ada@example.com',
            'role' => 'university',
        ]);
    }

    public function test_email_only_waitlist_signup_is_stored_with_safe_defaults(): void
    {
        $this->post('/waitlist', [
            'email' => 'launch@example.com',
        ])->assertRedirect('/thank-you');

        $this->assertDatabaseHas('waitlist_signups', [
            'full_name' => 'Launch',
            'email' => 'launch@example.com',
            'role' => 'university',
        ]);
    }

    public function test_root_route_can_show_waitlist_when_admin_setting_is_enabled(): void
    {
        PlatformSetting::create([
            'key' => 'admin.global',
            'value' => ['launch' => ['waitlistMode' => true]],
        ]);

        $this->get('/')
            ->assertOk()
            ->assertSee('landing', false)
            ->assertSee('signupCount', false);
    }

    public function test_duplicate_waitlist_email_is_rejected(): void
    {
        WaitlistSignup::create([
            'full_name' => 'Existing Lead',
            'email' => 'lead@example.com',
            'role' => 'student',
        ]);

        $response = $this->from('/')->post('/waitlist', [
            'full_name' => 'Second Lead',
            'email' => 'lead@example.com',
            'role' => 'student',
            'consent' => '1',
        ]);

        $response->assertRedirect('/');
        $response->assertSessionHasErrors('email');
        $this->assertSame(1, WaitlistSignup::where('email', 'lead@example.com')->count());
    }

    public function test_success_page_confirms_no_account_or_password_is_created(): void
    {
        $source = file_get_contents(resource_path('js/app.jsx'));

        $this->assertStringContainsString('We will notify ${email} when ScaleCampusLab officially launches.', $source);
        $this->assertStringContainsString('No account has been created, and you do not need to set a password.', $source);
    }

    public function test_admin_can_log_in_and_view_waitlist_dashboard(): void
    {
        WaitlistSignup::create([
            'full_name' => 'Guidance Counselor',
            'email' => 'counselor@example.com',
            'role' => 'high_school',
        ]);

        $this->post('/admin/waitlist/login', ['password' => 'admin123'])
            ->assertRedirect('/admin/waitlist');

        $this->withSession(['waitlist_admin_authenticated' => true])
            ->get('/admin/waitlist')
            ->assertOk()
            ->assertSee('Guidance Counselor');
    }

    public function test_admin_can_export_waitlist_csv(): void
    {
        WaitlistSignup::create([
            'full_name' => 'Student Lead',
            'email' => 'student@example.com',
            'role' => 'student',
        ]);

        $response = $this->withSession(['waitlist_admin_authenticated' => true])
            ->get('/admin/waitlist/export');

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Student Lead', $response->streamedContent());
    }
}
