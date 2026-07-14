<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSchoolAccountManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_update_and_delete_an_unused_registered_school(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->post('/dashboard/admin/school-accounts', [
            'name' => 'Production Secondary School',
            'location' => 'Lagos, Nigeria',
            'coordinator_name' => 'Ada Coordinator',
            'coordinator_email' => 'ada@school.test',
            'coordinator_phone' => '+2348000000000',
            'email_notifications' => '1',
        ])->assertRedirect()->assertSessionHas('status');

        $school = School::query()->where('name', 'Production Secondary School')->firstOrFail();
        $this->assertTrue($school->email_notifications);

        $this->put("/dashboard/admin/school-accounts/{$school->id}", [
            'name' => 'Production Secondary School Updated',
            'location' => 'Abuja, Nigeria',
            'coordinator_name' => 'Ada Coordinator',
            'coordinator_email' => 'ada@school.test',
            'coordinator_phone' => '+2348000000000',
        ])->assertRedirect()->assertSessionHas('status');

        $this->assertDatabaseHas('schools', [
            'id' => $school->id,
            'name' => 'Production Secondary School Updated',
            'location' => 'Abuja, Nigeria',
            'email_notifications' => false,
        ]);

        $this->delete("/dashboard/admin/school-accounts/{$school->id}")
            ->assertRedirect()
            ->assertSessionHas('status');
        $this->assertDatabaseMissing('schools', ['id' => $school->id]);
    }

    public function test_non_admin_cannot_manage_registered_schools_and_history_blocks_deletion(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $school = School::create(['name' => 'Linked School', 'location' => 'Lagos']);
        $schoolUser = User::factory()->create([
            'role' => 'school',
            'school_id' => $school->id,
            'access_status' => 'active',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($schoolUser)->post('/dashboard/admin/school-accounts', [
            'name' => 'Unauthorized School',
            'location' => 'Lagos',
        ])->assertRedirect(route('dashboard.school'));
        $this->assertDatabaseMissing('schools', ['name' => 'Unauthorized School']);

        $this->actingAs($admin)->delete("/dashboard/admin/school-accounts/{$school->id}")
            ->assertRedirect()
            ->assertSessionHasErrors('schoolAccount');

        $this->assertDatabaseHas('schools', ['id' => $school->id]);
    }

    public function test_admin_dashboard_exposes_real_school_account_status_and_counts(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $school = School::create(['name' => 'Dashboard School', 'location' => 'Ibadan']);
        User::factory()->create([
            'role' => 'school',
            'school_id' => $school->id,
            'access_status' => 'active',
            'email_verified_at' => now(),
        ]);
        User::factory()->create(['role' => 'student', 'school_id' => $school->id]);

        $accounts = collect($this->actingAs($admin)
            ->get('/dashboard/admin')
            ->assertOk()
            ->viewData('props')['schoolAccounts']);
        $account = $accounts->firstWhere('id', $school->id);

        $this->assertSame('active', $account['status']);
        $this->assertSame(2, $account['userCount']);
        $this->assertSame(1, $account['studentCount']);
        $this->assertSame(1, $account['coordinatorCount']);
        $this->assertFalse($account['canDelete']);
    }
}
