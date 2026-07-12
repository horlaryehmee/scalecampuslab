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
}
