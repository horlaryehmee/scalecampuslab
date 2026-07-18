<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\PlatformSetting;
use App\Models\School;
use App\Models\TargetSchool;
use App\Models\User;
use App\Models\VisitArchive;
use App\Models\VisitRequest;
use App\Models\VisitTask;
use App\Models\WaitlistSignup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PlatformFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_populate_and_clear_demo_data_without_touching_waitlist(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'access_status' => 'active',
            'email_verified_at' => now(),
        ]);
        WaitlistSignup::create([
            'full_name' => 'Real Waitlist Lead',
            'email' => 'lead@example.com',
        ]);

        $this->actingAs($admin)
            ->post('/dashboard/admin/demo-data/populate')
            ->assertRedirect()
            ->assertSessionHas('status');

        $this->assertDatabaseHas('users', [
            'email' => 'university@scalecampuslab.test',
            'is_demo' => true,
        ]);
        $this->assertDatabaseHas('campus_events', [
            'title' => 'Campus Preview Day',
            'is_demo' => true,
        ]);
        $this->assertDatabaseHas('waitlist_signups', [
            'email' => 'lead@example.com',
        ]);

        $this->actingAs($admin)
            ->delete('/dashboard/admin/demo-data')
            ->assertRedirect()
            ->assertSessionHas('status');

        $this->assertDatabaseMissing('users', [
            'email' => 'university@scalecampuslab.test',
        ]);
        $this->assertDatabaseMissing('campus_events', [
            'title' => 'Campus Preview Day',
        ]);
        $this->assertDatabaseHas('waitlist_signups', [
            'email' => 'lead@example.com',
        ]);
    }

    public function test_university_can_create_a_published_campus_event(): void
    {
        $university = $this->user('university');

        $this->actingAs($university)->post('/campus-events', [
            'title' => 'International Preview Day',
            'starts_at' => now()->addWeek()->format('Y-m-d H:i:s'),
            'ends_at' => now()->addWeek()->addHours(3)->format('Y-m-d H:i:s'),
            'venue' => 'Welcome Hall',
            'location' => 'Main Campus',
            'description' => 'Prospective student visit.',
            'capacity' => 2,
            'status' => 'published',
        ])->assertRedirect();

        $this->assertDatabaseHas('campus_events', [
            'title' => 'International Preview Day',
            'university_user_id' => $university->id,
            'status' => 'published',
        ]);
    }

    public function test_student_registration_confirms_when_capacity_is_available(): void
    {
        $event = $this->event(capacity: 2);
        $student = $this->user('student');

        $this->actingAs($student)->post("/campus-events/{$event->id}/registrations", [
            'registrant_name' => 'Student One',
            'registrant_email' => 'student.one@example.com',
            'party_size' => 1,
        ])->assertRedirect();

        $this->assertDatabaseHas('event_registrations', [
            'campus_event_id' => $event->id,
            'registrant_email' => 'student.one@example.com',
            'status' => 'confirmed',
        ]);
    }

    public function test_registration_waitlists_when_event_is_full(): void
    {
        $event = $this->event(capacity: 1);
        $student = $this->user('student');

        $this->actingAs($student)->post("/campus-events/{$event->id}/registrations", [
            'registrant_name' => 'First Student',
            'registrant_email' => 'first@example.com',
            'party_size' => 1,
        ]);

        $this->actingAs($student)->post("/campus-events/{$event->id}/registrations", [
            'registrant_name' => 'Second Student',
            'registrant_email' => 'second@example.com',
            'party_size' => 1,
        ])->assertRedirect();

        $this->assertDatabaseHas('event_registrations', [
            'campus_event_id' => $event->id,
            'registrant_email' => 'second@example.com',
            'status' => 'waitlisted',
        ]);
    }

    public function test_university_can_approve_visit_request(): void
    {
        $university = $this->user('university');
        $school = School::create(['name' => 'Oakwood Preparatory Academy', 'location' => 'Greenwich']);
        $schoolUser = User::create([
            'name' => 'Oakwood Coordinator',
            'email' => 'oakwood-coordinator@example.com',
            'role' => 'school',
            'school_id' => $school->id,
            'access_status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
        $event = CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Oakwood Campus Preview',
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'venue' => 'Main Hall',
            'location' => 'Campus',
            'capacity' => 80,
            'status' => 'published',
        ]);
        $request = VisitRequest::create([
            'school_id' => $school->id,
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $schoolUser->id,
            'requested_window' => 'Oct 14, 2026 - 10:00 AM',
            'group_size' => 20,
            'status' => 'requested',
            'priority' => 3,
        ]);

        $this->actingAs($university)->post("/visit-requests/{$request->id}/decision", [
            'decision' => 'approved',
        ])->assertRedirect();

        $this->assertDatabaseHas('visit_requests', [
            'id' => $request->id,
            'status' => 'approved',
        ]);
    }

    public function test_university_can_sync_archive_and_complete_task(): void
    {
        $university = $this->user('university');
        $archive = VisitArchive::create([
            'target_school_id' => $this->school()->id,
            'visited_on' => '2026-10-22',
            'visit_type' => 'Counselor Visit',
            'leads_captured' => 84,
            'engagement_rate' => 41,
            'quality_score' => 4.0,
            'status' => 'pending_sync',
        ]);
        $task = VisitTask::create([
            'visit_archive_id' => $archive->id,
            'title' => 'Send follow-up email',
            'description' => 'Send counselor follow-up.',
        ]);

        $this->actingAs($university)->post("/visit-archives/{$archive->id}/sync")
            ->assertRedirect();

        $this->actingAs($university)->post("/visit-tasks/{$task->id}", [
            'status' => 'done',
        ])->assertRedirect();

        $this->assertDatabaseHas('visit_archives', ['id' => $archive->id, 'status' => 'synced']);
        $this->assertDatabaseHas('visit_tasks', ['id' => $task->id, 'status' => 'done']);
    }

    public function test_admin_dashboard_includes_server_backed_system_health_payload(): void
    {
        $admin = $this->user('admin');

        $this->actingAs($admin)
            ->get('/dashboard/admin#system-health')
            ->assertOk()
            ->assertSee('systemHealth', false)
            ->assertSee('Database', false)
            ->assertSee('phpVersion', false);
    }

    public function test_admin_can_save_global_platform_settings(): void
    {
        $admin = $this->user('admin');

        $this->actingAs($admin)->post('/dashboard/admin/settings', [
            'platform_name' => 'ScaleCampusLab',
            'support_email' => 'support@example.com',
            'primary_color' => '#005EB2',
            'logo_url' => '',
            'default_language' => 'English',
            'supported_languages' => 'English, Spanish, French',
            'ai_matchmaking' => '1',
            'beta_messaging' => '0',
            'advanced_analytics' => '1',
            'maintenance_mode' => '0',
            'waitlist_mode' => '1',
            'admin_mfa_required' => '1',
            'session_timeout_minutes' => '45',
            'password_rotation_days' => '120',
            'data_retention_days' => '730',
            'api_key_label' => 'Production API Key',
            'webhook_url' => 'https://example.com/webhook',
            'lms_provider' => 'Canvas',
        ])->assertRedirect();

        $settings = PlatformSetting::query()->findOrFail('admin.global')->value;

        $this->assertSame('ScaleCampusLab', $settings['branding']['platformName']);
        $this->assertSame('support@example.com', $settings['branding']['supportEmail']);
        $this->assertTrue($settings['features']['aiMatchmaking']);
        $this->assertFalse($settings['features']['betaMessaging']);
        $this->assertTrue($settings['launch']['waitlistMode']);
        $this->assertSame(45, $settings['security']['sessionTimeoutMinutes']);
        $this->assertSame('Production API Key', $settings['integrations']['apiKeyLabel']);
    }

    private function event(int $capacity): CampusEvent
    {
        return CampusEvent::create([
            'university_user_id' => $this->user('university')->id,
            'title' => 'Campus Preview Day',
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'venue' => 'Main Hall',
            'location' => 'Campus',
            'capacity' => $capacity,
            'status' => 'published',
        ]);
    }

    private function user(string $role): User
    {
        return User::create([
            'name' => ucfirst(str_replace('_', ' ', $role)).' User',
            'email' => "{$role}@example.com",
            'role' => $role,
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
    }

    private function school(): TargetSchool
    {
        return TargetSchool::create([
            'name' => 'Oakwood Preparatory Academy',
            'city' => 'Greenwich',
            'region' => 'Northeast US',
            'school_type' => 'private',
            'performance_tier' => 'elite',
            'average_sat' => 1480,
            'yield_rate' => 4.2,
            'match_score' => 98,
            'active_applicants' => 12,
        ]);
    }
}
