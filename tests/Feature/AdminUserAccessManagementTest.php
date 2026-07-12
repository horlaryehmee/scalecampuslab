<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserAccessManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_update_suspend_and_delete_user_accounts(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'access_status' => 'active']);

        $this->actingAs($admin)->post('/dashboard/admin/users', [
            'name' => 'Jordan Access',
            'email' => 'jordan.access@example.edu',
            'password' => 'Password1234',
            'role' => 'school',
            'access_status' => 'active',
            'verified' => '1',
            'two_factor_enabled' => '1',
            'security_alerts' => '1',
            'recovery_email' => 'recovery@example.edu',
        ])->assertRedirect();

        $user = User::where('email', 'jordan.access@example.edu')->firstOrFail();

        $this->assertSame('school', $user->role);
        $this->assertSame('active', $user->access_status);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue($user->two_factor_enabled);
        $this->assertTrue(Hash::check('Password1234', $user->password));

        $this->actingAs($admin)->put("/dashboard/admin/users/{$user->id}", [
            'name' => 'Jordan Updated',
            'email' => 'jordan.updated@example.edu',
            'role' => 'student',
            'access_status' => 'pending',
            'verified' => '0',
            'two_factor_enabled' => '0',
            'security_alerts' => '1',
            'recovery_email' => '',
        ])->assertRedirect();

        $user->refresh();

        $this->assertSame('Jordan Updated', $user->name);
        $this->assertSame('student', $user->role);
        $this->assertSame('pending', $user->access_status);
        $this->assertNull($user->email_verified_at);

        $this->actingAs($admin)->post("/dashboard/admin/users/{$user->id}/access", [
            'access_status' => 'suspended',
        ])->assertRedirect();

        $this->assertSame('suspended', $user->fresh()->access_status);

        $this->actingAs($admin)->delete("/dashboard/admin/users/{$user->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_admin_cannot_suspend_or_delete_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'access_status' => 'active']);

        $this->actingAs($admin)->post("/dashboard/admin/users/{$admin->id}/access", [
            'access_status' => 'suspended',
        ])->assertRedirect()->assertSessionHasErrors('access_status');

        $this->actingAs($admin)->delete("/dashboard/admin/users/{$admin->id}")
            ->assertRedirect()
            ->assertSessionHasErrors('user');

        $this->assertDatabaseHas('users', ['id' => $admin->id, 'access_status' => 'active']);
    }

    public function test_suspended_users_cannot_login(): void
    {
        User::factory()->create([
            'role' => 'school',
            'email' => 'suspended@example.edu',
            'password' => Hash::make('password'),
            'access_status' => 'suspended',
        ]);

        $this->post('/login', [
            'email' => 'suspended@example.edu',
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_non_admin_cannot_manage_user_access(): void
    {
        $school = User::factory()->create(['role' => 'school', 'access_status' => 'active']);

        $this->actingAs($school)->post('/dashboard/admin/users', [
            'name' => 'Blocked User',
            'email' => 'blocked.user@example.edu',
            'role' => 'student',
            'access_status' => 'active',
        ])->assertRedirect();

        $this->assertDatabaseMissing('users', ['email' => 'blocked.user@example.edu']);
    }
}
