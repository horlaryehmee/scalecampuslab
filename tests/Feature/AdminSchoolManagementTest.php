<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\TargetSchool;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSchoolManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_update_status_and_delete_school_directory_entries(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->post('/dashboard/admin/schools', [
            'school_code' => 'LKS-2026',
            'name' => 'Lakeside High School',
            'city' => 'Seattle',
            'region' => 'Pacific Northwest',
            'country' => 'United States',
            'district' => 'Seattle Metro District',
            'coordinator_name' => 'Sarah Jenkins',
            'coordinator_email' => 'sarah.jenkins@lakeside.example',
            'status' => 'pending',
            'school_type' => 'private',
            'performance_tier' => 'elite',
            'average_sat' => 1480,
            'yield_rate' => 4.2,
            'match_score' => 92,
            'active_applicants' => 1240,
            'notes' => 'High STEM engagement.',
        ])->assertRedirect();

        $school = TargetSchool::where('school_code', 'LKS-2026')->firstOrFail();

        $this->assertSame('pending', $school->status);
        $this->assertSame('Sarah Jenkins', $school->coordinator_name);

        $this->actingAs($admin)->put("/dashboard/admin/schools/{$school->id}", [
            'school_code' => 'LKS-2026',
            'name' => 'Lakeside Preparatory',
            'city' => 'Seattle',
            'region' => 'Pacific Northwest',
            'country' => 'United States',
            'district' => 'Seattle Metro District',
            'coordinator_name' => 'Sarah Jenkins',
            'coordinator_email' => 'sarah.jenkins@lakeside.example',
            'status' => 'verified',
            'school_type' => 'private',
            'performance_tier' => 'elite',
            'average_sat' => 1500,
            'yield_rate' => 4.8,
            'match_score' => 96,
            'active_applicants' => 1300,
            'notes' => 'Updated profile.',
        ])->assertRedirect();

        $school->refresh();

        $this->assertSame('Lakeside Preparatory', $school->name);
        $this->assertSame('verified', $school->status);
        $this->assertSame(1300, $school->active_applicants);

        $this->actingAs($admin)->post("/dashboard/admin/schools/{$school->id}/status", [
            'status' => 'suspended',
        ])->assertRedirect();

        $this->assertSame('suspended', $school->fresh()->status);

        $this->actingAs($admin)->delete("/dashboard/admin/schools/{$school->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('target_schools', ['id' => $school->id]);
    }

    public function test_admin_cannot_delete_school_with_shared_visit_activity(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $university = User::factory()->create(['role' => 'university']);
        $school = TargetSchool::create([
            'name' => 'Riverstone Academy',
            'city' => 'Boston',
            'region' => 'Northeast',
            'country' => 'United States',
            'school_type' => 'private',
            'performance_tier' => 'high',
            'yield_rate' => 3.4,
            'match_score' => 88,
            'active_applicants' => 540,
            'status' => 'verified',
        ]);
        $event = CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Engineering Preview',
            'starts_at' => now()->addMonth(),
            'venue' => 'Admissions Hall',
            'location' => 'Main Campus',
            'capacity' => 80,
            'status' => 'published',
        ]);

        VisitRequest::create([
            'target_school_id' => $school->id,
            'campus_event_id' => $event->id,
            'requested_window' => 'Fall 2026',
            'status' => 'requested',
            'priority' => 2,
        ]);

        $this->actingAs($admin)->delete("/dashboard/admin/schools/{$school->id}")
            ->assertRedirect()
            ->assertSessionHasErrors('school');

        $this->assertDatabaseHas('target_schools', ['id' => $school->id]);
    }

    public function test_non_admin_cannot_create_school_directory_entries(): void
    {
        $schoolUser = User::factory()->create(['role' => 'school']);

        $this->actingAs($schoolUser)->post('/dashboard/admin/schools', [
            'name' => 'Blocked School',
            'city' => 'Austin',
            'region' => 'South',
            'country' => 'United States',
            'status' => 'verified',
            'school_type' => 'public',
            'performance_tier' => 'stable',
            'yield_rate' => 1.2,
            'match_score' => 60,
            'active_applicants' => 100,
        ])->assertRedirect();

        $this->assertDatabaseMissing('target_schools', ['name' => 'Blocked School']);
    }
}
