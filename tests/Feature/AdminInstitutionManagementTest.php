<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminInstitutionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_update_verify_and_delete_university_accounts(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->post('/dashboard/admin/universities', [
            'name' => 'North Coast University',
            'email' => 'northcoast@example.edu',
            'password' => 'Password123!',
            'verified' => '1',
        ])->assertRedirect();

        $university = User::where('email', 'northcoast@example.edu')->firstOrFail();

        $this->assertSame('university', $university->role);
        $this->assertNotNull($university->email_verified_at);
        $this->assertTrue(Hash::check('Password123!', $university->password));

        $this->actingAs($admin)->put("/dashboard/admin/universities/{$university->id}", [
            'name' => 'North Coast Institute',
            'email' => 'admissions@northcoast.example.edu',
            'verified' => '0',
        ])->assertRedirect();

        $university->refresh();

        $this->assertSame('North Coast Institute', $university->name);
        $this->assertSame('admissions@northcoast.example.edu', $university->email);
        $this->assertNull($university->email_verified_at);

        $this->actingAs($admin)->post("/dashboard/admin/universities/{$university->id}/verification", [
            'verified' => '1',
        ])->assertRedirect();

        $this->assertNotNull($university->fresh()->email_verified_at);

        $this->actingAs($admin)->delete("/dashboard/admin/universities/{$university->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('users', ['id' => $university->id]);
    }

    public function test_admin_cannot_delete_university_with_visit_programs(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $university = User::factory()->create(['role' => 'university']);

        CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Engineering Preview Day',
            'starts_at' => now()->addMonth(),
            'ends_at' => now()->addMonth()->addHours(2),
            'venue' => 'Admissions Hall',
            'location' => 'Main Campus',
            'capacity' => 80,
            'status' => 'published',
        ]);

        $this->actingAs($admin)->delete("/dashboard/admin/universities/{$university->id}")
            ->assertRedirect()
            ->assertSessionHasErrors('university');

        $this->assertDatabaseHas('users', ['id' => $university->id]);
    }

    public function test_non_admin_cannot_manage_university_accounts(): void
    {
        $school = User::factory()->create(['role' => 'school']);

        $this->actingAs($school)->post('/dashboard/admin/universities', [
            'name' => 'Blocked University',
            'email' => 'blocked@example.edu',
        ])->assertRedirect();

        $this->assertDatabaseMissing('users', ['email' => 'blocked@example.edu']);
    }
}
