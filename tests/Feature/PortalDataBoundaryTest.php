<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\ProjectMilestone;
use App\Models\School;
use App\Models\SchoolItineraryItem;
use App\Models\TargetSchool;
use App\Models\User;
use App\Models\VisitArchive;
use App\Models\VisitRequest;
use App\Models\VisitTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PortalDataBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_school_dashboard_receives_only_school_scoped_payload_data(): void
    {
        $school = School::create(['name' => 'Boundary School', 'location' => 'Lagos']);
        $schoolUser = $this->user('school', 'school-boundary@example.com', $school->id);
        $otherSchoolUser = $this->user('school', 'other-school@example.com');
        $university = $this->user('university', 'uni-boundary@example.com');
        ProjectMilestone::create(['category' => 'Admin', 'title' => 'Internal admin roadmap']);

        $published = $this->campusEvent($university, 'Published School Visit', 'published');
        $draft = $this->campusEvent($university, 'Draft Internal Visit', 'draft');
        EventRegistration::create([
            'campus_event_id' => $published->id,
            'user_id' => $schoolUser->id,
            'registrant_name' => 'Boundary School',
            'registrant_email' => 'boundary-school@example.com',
            'registrant_type' => 'school_group',
            'party_size' => 12,
            'status' => 'confirmed',
        ]);
        EventRegistration::create([
            'campus_event_id' => $published->id,
            'user_id' => $otherSchoolUser->id,
            'registrant_name' => 'Other School',
            'registrant_email' => 'other-school-group@example.com',
            'registrant_type' => 'school_group',
            'party_size' => 20,
            'status' => 'confirmed',
        ]);

        $targetSchool = $this->targetSchool();
        VisitRequest::create([
            'target_school_id' => $targetSchool->id,
            'requested_by_user_id' => $schoolUser->id,
            'requested_window' => 'Oct 20, 2026',
            'status' => 'requested',
            'priority' => 3,
        ]);
        VisitRequest::create([
            'target_school_id' => $targetSchool->id,
            'requested_by_user_id' => $otherSchoolUser->id,
            'requested_window' => 'Oct 22, 2026',
            'status' => 'requested',
            'priority' => 3,
        ]);
        $archive = VisitArchive::create([
            'target_school_id' => $targetSchool->id,
            'visited_on' => now(),
            'visit_type' => 'Internal Archive',
            'leads_captured' => 10,
            'engagement_rate' => 30,
            'quality_score' => 4,
            'status' => 'archived',
        ]);
        VisitTask::create(['visit_archive_id' => $archive->id, 'title' => 'Internal task']);

        $props = $this->actingAs($schoolUser)
            ->get('/dashboard/school')
            ->assertOk()
            ->viewData('props');

        $this->assertSame('school', $props['role']);
        $this->assertSame([], $props['roadmap']);
        $this->assertSame([], $props['archives']);
        $this->assertSame([], $props['tasks']);
        $this->assertSame(['Published School Visit'], collect($props['events'])->pluck('title')->all());
        $this->assertNotContains($draft->title, collect($props['events'])->pluck('title')->all());
        $this->assertSame(['Boundary School'], collect($props['registrations'])->pluck('name')->all());
        $this->assertCount(1, $props['visitRequests']);
        $this->assertSame($school->name, $props['schoolProfile']['name']);
    }

    public function test_student_dashboard_does_not_receive_school_or_admin_payload_data(): void
    {
        $student = $this->user('student', 'student-boundary@example.com');
        $university = $this->user('university', 'student-uni@example.com');
        ProjectMilestone::create(['category' => 'Admin', 'title' => 'Internal admin roadmap']);
        $published = $this->campusEvent($university, 'Student Visible Visit', 'published');
        $draft = $this->campusEvent($university, 'Student Hidden Draft', 'draft');
        EventRegistration::create([
            'campus_event_id' => $published->id,
            'user_id' => $student->id,
            'registrant_name' => 'Student Boundary',
            'registrant_email' => 'student-boundary@example.com',
            'registrant_type' => 'student',
            'party_size' => 1,
            'status' => 'confirmed',
        ]);

        $props = $this->actingAs($student)
            ->get('/dashboard/student')
            ->assertOk()
            ->viewData('props');

        $this->assertSame('student', $props['role']);
        $this->assertSame([], $props['roadmap']);
        $this->assertSame([], $props['schools']);
        $this->assertSame([], $props['visitRequests']);
        $this->assertSame([], $props['archives']);
        $this->assertSame([], $props['tasks']);
        $this->assertSame(['Student Visible Visit'], collect($props['events'])->pluck('title')->all());
        $this->assertNotContains($draft->title, collect($props['events'])->pluck('title')->all());
    }

    public function test_school_can_create_request_for_published_university_visit(): void
    {
        $school = School::create(['name' => 'Lincoln High School', 'location' => 'Seattle, WA']);
        $schoolUser = $this->user('school', 'lincoln-requests@example.com', $school->id);
        $university = $this->user('university', 'stanford-requests@example.com');
        $event = $this->campusEvent($university, 'Engineering Fall Preview', 'published');

        $this->actingAs($schoolUser)->post('/visit-requests', [
            'campus_event_id' => $event->id,
            'requested_window' => now()->addWeeks(3)->toDateString(),
            'group_size' => 45,
            'priority' => 3,
            'notes' => 'Robotics and AP Computer Science cohort.',
        ])->assertRedirect();

        $this->assertDatabaseHas('visit_requests', [
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $schoolUser->id,
            'group_size' => 45,
            'status' => 'requested',
        ]);
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $university->id,
            'campus_event_id' => $event->id,
            'subject' => 'New school visit request',
        ]);
    }

    public function test_school_itinerary_payload_uses_live_event_destination_data(): void
    {
        $school = School::create(['name' => 'Itinerary School', 'location' => 'Boston, MA']);
        $schoolUser = $this->user('school', 'itinerary-school@example.com', $school->id);
        $university = $this->user('university', 'itinerary-university@example.com');
        $event = $this->campusEvent($university, 'Live Destination Visit', 'published');
        $event->update([
            'location' => 'Cambridge, MA',
            'latitude' => 42.3601,
            'longitude' => -71.0942,
        ]);

        EventRegistration::create([
            'campus_event_id' => $event->id,
            'user_id' => $schoolUser->id,
            'registrant_name' => 'Itinerary School Group',
            'registrant_email' => 'itinerary-school@example.com',
            'registrant_type' => 'school_group',
            'party_size' => 25,
            'status' => 'confirmed',
        ]);

        VisitRequest::create([
            'target_school_id' => $this->targetSchool()->id,
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $schoolUser->id,
            'requested_window' => 'Oct 20, 2026',
            'status' => 'approved',
            'priority' => 3,
        ]);

        $props = $this->actingAs($schoolUser)
            ->get('/dashboard/school#itinerary')
            ->assertOk()
            ->viewData('props');

        $this->assertSame('Cambridge, MA', $props['registrations'][0]['eventLocation']);
        $this->assertSame(42.3601, $props['registrations'][0]['latitude']);
        $this->assertSame(-71.0942, $props['visitRequests'][0]['longitude']);
        $this->assertSame('University User', $props['visitRequests'][0]['university']);
    }

    public function test_school_cannot_approve_or_cancel_another_schools_request(): void
    {
        $schoolUser = $this->user('school', 'school-owner@example.com');
        $otherSchoolUser = $this->user('school', 'school-intruder@example.com');
        $university = $this->user('university', 'uni-owner@example.com');
        $event = $this->campusEvent($university, 'Owner Visit', 'published');
        $request = VisitRequest::create([
            'target_school_id' => $this->targetSchool()->id,
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $schoolUser->id,
            'requested_window' => 'Oct 20, 2026',
            'status' => 'requested',
            'priority' => 3,
        ]);

        $this->actingAs($schoolUser)->post("/visit-requests/{$request->id}/decision", [
            'decision' => 'approved',
        ])->assertForbidden();

        $this->actingAs($otherSchoolUser)->post("/visit-requests/{$request->id}/decision", [
            'decision' => 'declined',
        ])->assertForbidden();
    }

    public function test_university_can_only_decide_requests_for_own_visit_programs(): void
    {
        $schoolUser = $this->user('school', 'decision-school@example.com');
        $university = $this->user('university', 'decision-owner@example.com');
        $otherUniversity = $this->user('university', 'decision-other@example.com');
        $event = $this->campusEvent($university, 'Owned Visit', 'published');
        $request = VisitRequest::create([
            'target_school_id' => $this->targetSchool()->id,
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $schoolUser->id,
            'requested_window' => 'Oct 20, 2026',
            'status' => 'requested',
            'priority' => 3,
        ]);

        $this->actingAs($otherUniversity)->post("/visit-requests/{$request->id}/decision", [
            'decision' => 'approved',
        ])->assertForbidden();

        $this->actingAs($university)->post("/visit-requests/{$request->id}/decision", [
            'decision' => 'approved',
        ])->assertRedirect();

        $this->assertDatabaseHas('visit_requests', [
            'id' => $request->id,
            'status' => 'approved',
        ]);
    }

    public function test_school_can_add_reorder_update_and_remove_owned_itinerary_items(): void
    {
        $school = School::create(['name' => 'Planner School', 'location' => 'Lagos, Nigeria']);
        $schoolUser = $this->user('school', 'planner-school@example.com', $school->id);
        $university = $this->user('university', 'planner-university@example.com');
        $firstEvent = $this->campusEvent($university, 'Engineering Visit', 'published');
        $secondEvent = $this->campusEvent($university, 'Business Visit', 'published');

        $this->actingAs($schoolUser)->post('/school-itinerary', ['campus_event_id' => $firstEvent->id])->assertRedirect();
        $this->actingAs($schoolUser)->post('/school-itinerary', ['campus_event_id' => $secondEvent->id])->assertRedirect();
        $items = SchoolItineraryItem::where('user_id', $schoolUser->id)->orderBy('position')->get();

        $this->actingAs($schoolUser)->post('/school-itinerary/reorder', [
            'item_ids' => [$items[1]->id, $items[0]->id],
        ])->assertRedirect();
        $this->assertSame($items[1]->id, SchoolItineraryItem::where('user_id', $schoolUser->id)->orderBy('position')->value('id'));

        $this->actingAs($schoolUser)->put("/school-itinerary/{$items[0]->id}", [
            'planned_start_at' => now()->addMonth()->format('Y-m-d H:i:s'),
            'notes' => 'Bring consent forms and arrange transport.',
        ])->assertRedirect();
        $this->assertDatabaseHas('school_itinerary_items', ['id' => $items[0]->id, 'notes' => 'Bring consent forms and arrange transport.']);

        $this->actingAs($schoolUser)->delete("/school-itinerary/{$items[0]->id}")->assertRedirect();
        $this->assertDatabaseMissing('school_itinerary_items', ['id' => $items[0]->id]);
    }

    public function test_school_cannot_modify_another_schools_itinerary(): void
    {
        $owner = $this->user('school', 'itinerary-owner@example.com');
        $intruder = $this->user('school', 'itinerary-intruder@example.com');
        $university = $this->user('university', 'itinerary-security-university@example.com');
        $event = $this->campusEvent($university, 'Secure Visit', 'published');
        $item = SchoolItineraryItem::create(['user_id' => $owner->id, 'campus_event_id' => $event->id, 'position' => 1]);

        $this->actingAs($intruder)->put("/school-itinerary/{$item->id}", ['notes' => 'Unauthorized'])->assertForbidden();
        $this->actingAs($intruder)->delete("/school-itinerary/{$item->id}")->assertForbidden();
        $this->assertDatabaseHas('school_itinerary_items', ['id' => $item->id, 'notes' => null]);
    }

    private function user(string $role, string $email, ?int $schoolId = null): User
    {
        return User::create([
            'name' => ucfirst(str_replace('_', ' ', $role)).' User',
            'email' => $email,
            'role' => $role,
            'school_id' => $schoolId,
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
    }

    private function campusEvent(User $university, string $title, string $status): CampusEvent
    {
        return CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => $title,
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'venue' => $title.' Hall',
            'location' => 'Campus',
            'capacity' => 80,
            'status' => $status,
        ]);
    }

    private function targetSchool(): TargetSchool
    {
        return TargetSchool::create([
            'name' => 'Boundary Target',
            'city' => 'Lagos',
            'region' => 'West Africa',
            'school_type' => 'private',
            'performance_tier' => 'high',
            'average_sat' => 1400,
            'yield_rate' => 4.1,
            'match_score' => 90,
            'active_applicants' => 15,
        ]);
    }
}
