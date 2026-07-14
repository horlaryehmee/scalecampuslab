<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_university_login_redirects_to_university_dashboard(): void
    {
        User::create([
            'name' => 'University User',
            'email' => 'university@example.com',
            'role' => 'university',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);

        $this->post('/login', [
            'email' => 'university@example.com',
            'password' => 'password',
        ])->assertRedirect('/dashboard/university');
    }

    public function test_wrong_dashboard_role_redirects_to_users_dashboard(): void
    {
        $student = User::create([
            'name' => 'Student User',
            'email' => 'student@example.com',
            'role' => 'student',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);

        $this->actingAs($student)
            ->get('/dashboard/school')
            ->assertRedirect('/dashboard/student');

        $this->actingAs($student)
            ->get('/dashboard/student')
            ->assertOk()
            ->assertSee('Student Dashboard');
    }

    public function test_admin_login_rejects_non_admin_account(): void
    {
        User::create([
            'name' => 'Student User',
            'email' => 'student@example.com',
            'role' => 'student',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);

        $this->from('/admin/login')->post('/admin/login', [
            'email' => 'student@example.com',
            'password' => 'password',
        ])->assertRedirect('/admin/login')
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_admin_login_redirects_to_admin_dashboard(): void
    {
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);

        $this->post('/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ])->assertRedirect('/dashboard/admin');
    }

    public function test_dashboard_logout_clears_web_session_and_saved_spa_token(): void
    {
        $user = User::factory()->create(['role' => 'university']);
        $spaToken = $user->createToken('scale-campus-spa');
        $integrationToken = $user->createToken('integration-token');

        $this->actingAs($user)
            ->post('/logout')
            ->assertRedirect('/login');

        $this->assertGuest();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $spaToken->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $integrationToken->accessToken->id]);
        $this->get('/dashboard/university')->assertRedirect('/login');
    }

    public function test_demo_login_post_creates_session_and_redirects_to_dashboard(): void
    {
        $this->post('/demo-login', [
            'role' => 'student',
        ])->assertRedirect('/dashboard/student');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'student@scalecampuslab.test',
            'role' => 'student',
            'access_status' => 'active',
            'is_demo' => true,
        ]);
    }

    public function test_web_dashboard_session_can_use_student_workflow_api(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student)
            ->getJson('/api/v1/student/visits/upcoming')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_unverified_and_suspended_accounts_cannot_open_the_dashboard_directly(): void
    {
        $unverified = User::factory()->unverified()->create(['role' => 'student']);

        $this->actingAs($unverified)
            ->get('/dashboard/student')
            ->assertRedirect('/verify-email');

        $suspended = User::factory()->create([
            'role' => 'student',
            'access_status' => 'suspended',
        ]);

        $this->actingAs($suspended)
            ->get('/dashboard/student')
            ->assertRedirect('/login')
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }
}
