<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\PlatformNotification;
use App\Models\School;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CanonicalCampusWorkflowApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Route::has('api.v1.workflow.dashboard')) {
            Route::middleware('api')->group(base_path('routes/api_workflows.php'));
            Route::getRoutes()->refreshNameLookups();
            Route::getRoutes()->refreshActionLookups();
        }
    }

    public function test_complete_tenant_scoped_campus_visit_workflow_updates_attendance_and_analytics(): void
    {
        $school = School::create(['name' => 'Lagos Science Academy', 'location' => 'Lagos']);
        $university = $this->user('university', 'workflow-university@example.test');
        $schoolCoordinator = $this->user('school', 'workflow-school@example.test', $school->id);
        $student = $this->user('student', 'workflow-student@example.test', $school->id);

        Sanctum::actingAs($university);
        $eventResponse = $this->postJson('/api/v1/campus-events', [
            'title' => 'STEM Campus Discovery',
            'description' => 'Labs, admissions guidance, and student conversations.',
            'starts_at' => now()->addWeeks(2)->setTime(10, 0)->toIso8601String(),
            'ends_at' => now()->addWeeks(2)->setTime(14, 0)->toIso8601String(),
            'venue' => 'Engineering Complex',
            'location' => 'Main Campus',
            'capacity' => 80,
            'per_school_capacity' => 30,
            'per_group_capacity' => 25,
            'visibility' => 'invite_only',
        ])->assertCreated()->assertJsonPath('data.status', 'draft');
        $eventId = $eventResponse->json('data.id');

        $this->postJson("/api/v1/campus-events/{$eventId}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $visitResponse = $this->postJson('/api/v1/visits', [
            'campus_event_id' => $eventId,
            'school_id' => $school->id,
            'group_size' => 20,
            'notes' => 'Please nominate students interested in engineering.',
        ])->assertCreated()->assertJsonPath('data.status', 'requested');
        $visitId = $visitResponse->json('data.id');

        Sanctum::actingAs($schoolCoordinator);
        $this->postJson("/api/v1/visits/{$visitId}/decision", [
            'decision' => 'approved',
            'decision_note' => 'Transport and consent arrangements are confirmed.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.responded_by_user_id', $schoolCoordinator->id);

        Sanctum::actingAs($university);
        $itineraryResponse = $this->postJson("/api/v1/campus-events/{$eventId}/itinerary", [
            'visit_request_id' => $visitId,
            'title' => 'Engineering lab tour',
            'description' => 'Guided tour with faculty and student ambassadors.',
            'starts_at' => now()->addWeeks(2)->setTime(10, 30)->toIso8601String(),
            'ends_at' => now()->addWeeks(2)->setTime(12, 0)->toIso8601String(),
            'location' => 'Robotics Lab',
        ])->assertCreated();
        $itineraryId = $itineraryResponse->json('data.id');

        Sanctum::actingAs($schoolCoordinator);
        $assignmentResponse = $this->postJson("/api/v1/visits/{$visitId}/participation/assign", [
            'student_ids' => [$student->id],
        ])->assertCreated()
            ->assertJsonPath('data.students.0.user_id', $student->id);
        $studentRecordId = $assignmentResponse->json('data.students.0.id');

        $this->getJson('/api/v1/students?eligible=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $student->id);

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/student/visits/upcoming')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.event.id', $eventId)
            ->assertJsonPath('data.0.visit_request_id', $visitId)
            ->assertJsonPath('data.0.itinerary.0.id', $itineraryId);

        Sanctum::actingAs($university);
        $this->travelTo(now()->addWeeks(2)->setTime(9, 30));
        $this->postJson("/api/v1/attendance/registration-students/{$studentRecordId}/check-in")
            ->assertOk()
            ->assertJsonPath('data.status', 'checked_in')
            ->assertJsonPath('data.user_id', $student->id);

        $this->getJson("/api/v1/campus-events/{$eventId}/roster")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.checked_in', 1)
            ->assertJsonPath('data.0.attendance_record_type', 'registration_student')
            ->assertJsonPath('data.0.attendance_record_id', $studentRecordId)
            ->assertJsonPath('data.0.attendance_status', 'checked_in');

        $this->getJson('/api/v1/analytics')
            ->assertOk()
            ->assertJsonPath('data.scope', 'university')
            ->assertJsonPath('data.participants_registered', 1)
            ->assertJsonPath('data.participants_checked_in', 1)
            ->assertJsonPath('data.attendance_rate', 100);

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/student/visits/history')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.checked_in_at', fn ($value) => is_string($value) && $value !== '');

        $this->assertDatabaseHas('visit_requests', [
            'id' => $visitId,
            'school_id' => $school->id,
            'campus_event_id' => $eventId,
            'status' => 'approved',
        ]);
        $this->assertDatabaseHas('event_registration_students', [
            'id' => $studentRecordId,
            'user_id' => $student->id,
            'status' => 'confirmed',
        ]);
        $this->assertNotNull(EventRegistrationStudent::findOrFail($studentRecordId)->checked_in_at);
        $this->assertDatabaseHas('event_itinerary_items', ['id' => $itineraryId, 'visit_request_id' => $visitId]);
        $this->assertGreaterThanOrEqual(1, PlatformNotification::where('user_id', $student->id)->count());
    }

    public function test_cross_tenant_mutations_and_unapproved_participation_are_rejected(): void
    {
        $recipientSchool = School::create(['name' => 'Recipient School', 'location' => 'Abuja']);
        $otherSchool = School::create(['name' => 'Other School', 'location' => 'Ibadan']);
        $owner = $this->user('university', 'owner@example.test');
        $otherUniversity = $this->user('university', 'other-university@example.test');
        $recipientCoordinator = $this->user('school', 'recipient@example.test', $recipientSchool->id);
        $otherCoordinator = $this->user('school', 'other-school@example.test', $otherSchool->id);
        $recipientStudent = $this->user('student', 'recipient-student@example.test', $recipientSchool->id);
        $otherStudent = $this->user('student', 'other-student@example.test', $otherSchool->id);
        $event = $this->event($owner, 'Secure Visit');
        $visit = $this->visit($event, $recipientSchool, $owner, 'requested');

        Sanctum::actingAs($otherUniversity);
        $this->patchJson("/api/v1/campus-events/{$event->id}", ['title' => 'Hijacked title'])->assertForbidden();

        Sanctum::actingAs($otherCoordinator);
        $this->postJson("/api/v1/visits/{$visit->id}/decision", ['decision' => 'approved'])->assertForbidden();

        Sanctum::actingAs($otherStudent);
        $this->postJson("/api/v1/visits/{$visit->id}/participation/self")->assertStatus(422);

        Sanctum::actingAs($recipientCoordinator);
        $this->postJson("/api/v1/visits/{$visit->id}/decision", ['decision' => 'approved'])->assertOk();
        $this->postJson("/api/v1/visits/{$visit->id}/participation/assign", [
            'student_ids' => [$otherStudent->id],
        ])->assertForbidden();

        Sanctum::actingAs($otherStudent);
        $this->postJson("/api/v1/visits/{$visit->id}/participation/self")->assertForbidden();

        Sanctum::actingAs($recipientStudent);
        $this->postJson("/api/v1/visits/{$visit->id}/participation/self")->assertCreated();

        Sanctum::actingAs($otherUniversity);
        $this->postJson('/api/v1/attendance/registrations/1/check-in')->assertForbidden();

        $this->assertSame('Secure Visit', $event->fresh()->title);
    }

    public function test_canonical_workflow_rejects_orphan_recipients_and_dependent_event_deletion(): void
    {
        $university = $this->user('university', 'integrity-university@example.test');
        $schoolWithoutCoordinator = School::create(['name' => 'Unstaffed School', 'location' => 'Kano']);
        $staffedSchool = School::create(['name' => 'Staffed School', 'location' => 'Enugu']);
        $this->user('school', 'staffed-school@example.test', $staffedSchool->id);
        $event = $this->event($university, 'Integrity Visit');

        Sanctum::actingAs($university);
        $this->postJson('/api/v1/visits', [
            'campus_event_id' => $event->id,
            'school_id' => $schoolWithoutCoordinator->id,
        ])->assertUnprocessable()->assertJsonPath('message', 'The selected school has no active coordinator account.');

        $this->postJson('/api/v1/visits', [
            'campus_event_id' => $event->id,
            'school_id' => $staffedSchool->id,
        ])->assertCreated();

        $this->deleteJson("/api/v1/campus-events/{$event->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Cancel events with visit activity instead of deleting them.');

        $this->assertDatabaseHas('campus_events', ['id' => $event->id]);
    }

    public function test_workflow_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/dashboard')->assertUnauthorized();
        $this->getJson('/api/v1/campus-events')->assertUnauthorized();
        $this->getJson('/api/v1/analytics')->assertUnauthorized();
    }

    public function test_admin_user_and_system_settings_endpoints_are_real_and_role_scoped(): void
    {
        $admin = $this->user('admin', 'workflow-admin@example.test');
        $university = $this->user('university', 'managed-university@example.test');

        Sanctum::actingAs($university);
        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->getJson('/api/v1/admin/settings')->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->patchJson("/api/v1/admin/users/{$university->id}", [
            'access_status' => 'suspended',
        ])->assertOk()
            ->assertJsonPath('data.access_status', 'suspended');

        $this->patchJson('/api/v1/admin/settings', [
            'settings' => [
                'branding' => [
                    'platformName' => 'ScaleCampusLab',
                    'supportEmail' => 'support@example.test',
                    'primaryColor' => '#2563EB',
                ],
                'features' => [
                    'advancedAnalytics' => true,
                    'maintenanceMode' => false,
                ],
                'security' => [
                    'sessionTimeoutMinutes' => 60,
                    'passwordRotationDays' => 90,
                    'dataRetentionDays' => 730,
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.key', 'admin.global')
            ->assertJsonPath('data.settings.branding.platformName', 'ScaleCampusLab')
            ->assertJsonPath('data.settings.features.advancedAnalytics', true);

        $this->getJson('/api/v1/admin/settings')
            ->assertOk()
            ->assertJsonPath('data.settings.security.dataRetentionDays', 730);

        $this->assertDatabaseHas('users', ['id' => $university->id, 'access_status' => 'suspended']);
        $this->assertDatabaseHas('platform_settings', ['key' => 'admin.global']);
    }

    public function test_workflow_blocks_unverified_or_suspended_accounts_and_orphan_school_scopes(): void
    {
        $unverified = User::factory()->unverified()->create([
            'role' => 'university',
            'access_status' => 'active',
        ]);

        Sanctum::actingAs($unverified);
        $this->getJson('/api/v1/dashboard')
            ->assertForbidden()
            ->assertJsonPath('message', 'Your email address is not verified.');

        $suspended = User::factory()->create([
            'role' => 'university',
            'access_status' => 'suspended',
        ]);

        Sanctum::actingAs($suspended);
        $this->getJson('/api/v1/dashboard')
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been suspended. Contact the platform administrator.');

        $orphanSchoolAccount = User::factory()->create([
            'role' => 'school',
            'school_id' => null,
            'access_status' => 'active',
        ]);
        User::factory()->create([
            'role' => 'student',
            'school_id' => null,
            'access_status' => 'active',
        ]);

        Sanctum::actingAs($orphanSchoolAccount);
        $this->getJson('/api/v1/students')
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    public function test_visit_messages_only_reach_users_connected_to_the_visit(): void
    {
        $university = $this->user('university', 'message-university@example.test');
        $otherUniversity = $this->user('university', 'other-university@example.test');
        $school = School::create(['name' => 'Message School', 'location' => 'Lagos']);
        $coordinator = $this->user('school', 'message-school@example.test', $school->id);
        $event = $this->event($university, 'Message Visit');
        $visit = VisitRequest::create([
            'school_id' => $school->id,
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $university->id,
            'requested_window' => $event->starts_at->toIso8601String(),
            'group_size' => 10,
            'status' => 'approved',
            'priority' => 1,
        ]);

        Sanctum::actingAs($otherUniversity);
        $this->postJson('/api/v1/messages', [
            'visit_request_id' => $visit->id,
            'subject' => 'Not allowed',
            'body' => 'This sender is unrelated to the visit.',
        ])->assertForbidden();

        Sanctum::actingAs($university);
        $this->postJson('/api/v1/messages', [
            'visit_request_id' => $visit->id,
            'subject' => 'Arrival details',
            'body' => 'Please arrive twenty minutes before the welcome session.',
        ])->assertCreated()
            ->assertJsonPath('data.recipients', 1);

        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $coordinator->id,
            'notification_type' => 'message.received',
            'subject' => 'Arrival details',
        ]);
        $this->assertDatabaseMissing('platform_notifications', [
            'user_id' => $otherUniversity->id,
            'subject' => 'Arrival details',
        ]);
    }

    public function test_partial_itinerary_updates_preserve_valid_time_ordering(): void
    {
        $university = $this->user('university', 'itinerary-owner@example.test');
        $event = $this->event($university, 'Itinerary Validation Visit');

        Sanctum::actingAs($university);
        $response = $this->postJson("/api/v1/campus-events/{$event->id}/itinerary", [
            'title' => 'Campus tour',
            'starts_at' => $event->starts_at->copy()->addHour()->toIso8601String(),
            'ends_at' => $event->starts_at->copy()->addHours(2)->toIso8601String(),
            'location' => 'Main Campus',
        ])->assertCreated();
        $itemId = $response->json('data.id');

        $this->patchJson("/api/v1/campus-events/{$event->id}/itinerary/{$itemId}", [
            'ends_at' => $event->starts_at->copy()->addMinutes(30)->toIso8601String(),
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'ends_at must be after starts_at.');

        $this->patchJson("/api/v1/campus-events/{$event->id}/itinerary/{$itemId}", [
            'starts_at' => $event->starts_at->copy()->addHours(3)->toIso8601String(),
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'ends_at must be after starts_at.');
    }

    public function test_admin_can_assign_two_different_school_groups_to_one_event(): void
    {
        $admin = $this->user('admin', 'assignment-admin@example.test');
        $university = $this->user('university', 'assignment-university@example.test');
        $event = $this->event($university, 'Multi-school Visit');
        $firstSchool = School::create(['name' => 'First Assignment School', 'location' => 'Lagos']);
        $secondSchool = School::create(['name' => 'Second Assignment School', 'location' => 'Abuja']);
        $firstCoordinator = $this->user('school', 'first-coordinator@example.test', $firstSchool->id);
        $secondCoordinator = $this->user('school', 'second-coordinator@example.test', $secondSchool->id);
        $firstStudent = $this->user('student', 'first-assignment-student@example.test', $firstSchool->id);
        $secondStudent = $this->user('student', 'second-assignment-student@example.test', $secondSchool->id);
        $firstVisit = $this->visit($event, $firstSchool, $university, 'approved');
        $secondVisit = $this->visit($event, $secondSchool, $university, 'approved');

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/visits/{$firstVisit->id}/participation/assign", [
            'student_ids' => [$firstStudent->id],
        ])->assertCreated();
        $this->postJson("/api/v1/visits/{$secondVisit->id}/participation/assign", [
            'student_ids' => [$secondStudent->id],
        ])->assertCreated();

        $this->assertSame(2, EventRegistration::query()
            ->where('campus_event_id', $event->id)
            ->where('registrant_type', 'school_group')
            ->count());
        $this->assertDatabaseHas('event_registrations', [
            'campus_event_id' => $event->id,
            'visit_request_id' => $firstVisit->id,
            'registrant_email' => $firstCoordinator->email,
        ]);
        $this->assertDatabaseHas('event_registrations', [
            'campus_event_id' => $event->id,
            'visit_request_id' => $secondVisit->id,
            'registrant_email' => $secondCoordinator->email,
        ]);
    }

    public function test_check_in_is_blocked_for_far_future_and_cancelled_events(): void
    {
        $school = School::create(['name' => 'Attendance Window School', 'location' => 'Lagos']);
        $university = $this->user('university', 'attendance-window-university@example.test');
        $student = $this->user('student', 'attendance-window-student@example.test', $school->id);
        $event = $this->event($university, 'Attendance Window Visit');
        $visit = $this->visit($event, $school, $university, 'approved');
        $registration = EventRegistration::create([
            'campus_event_id' => $event->id,
            'visit_request_id' => $visit->id,
            'user_id' => $student->id,
            'registrant_name' => $student->name,
            'registrant_email' => $student->email,
            'registrant_type' => 'student',
            'party_size' => 1,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($university);
        $this->postJson("/api/v1/attendance/registrations/{$registration->id}/check-in")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Check-in is only available near the scheduled event time.');

        $event->update(['status' => 'cancelled']);
        $this->postJson("/api/v1/attendance/registrations/{$registration->id}/check-in")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Attendance cannot be recorded for a cancelled event.');
    }

    public function test_event_updates_respect_real_duration_and_confirmed_capacity(): void
    {
        $university = $this->user('university', 'schedule-owner@example.test');
        $start = now()->addDays(10)->startOfHour();
        $openEnded = CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'One-hour planning session',
            'starts_at' => $start,
            'ends_at' => null,
            'venue' => 'Shared Hall',
            'capacity' => 100,
            'status' => 'published',
            'visibility' => 'invite_only',
            'lifecycle_stage' => 'open',
        ]);

        Sanctum::actingAs($university);
        $this->postJson('/api/v1/campus-events', [
            'title' => 'Later session',
            'starts_at' => $start->copy()->addHours(2)->toIso8601String(),
            'venue' => 'Shared Hall',
            'capacity' => 50,
        ])->assertCreated();
        $this->postJson('/api/v1/campus-events', [
            'title' => 'Overlapping session',
            'starts_at' => $start->copy()->addMinutes(30)->toIso8601String(),
            'venue' => 'Shared Hall',
            'capacity' => 50,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This venue is already booked during the selected time.');

        $editable = CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Editable session',
            'starts_at' => $start->copy()->addDay(),
            'ends_at' => $start->copy()->addDay()->addHours(2),
            'venue' => 'Second Hall',
            'capacity' => 100,
            'per_school_capacity' => 50,
            'per_group_capacity' => 20,
            'status' => 'published',
            'visibility' => 'invite_only',
            'lifecycle_stage' => 'open',
        ]);
        CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Afternoon blocker',
            'starts_at' => $start->copy()->addDay()->addMinutes(90),
            'ends_at' => $start->copy()->addDay()->addHours(3),
            'venue' => 'Second Hall',
            'capacity' => 100,
            'status' => 'published',
            'visibility' => 'invite_only',
            'lifecycle_stage' => 'open',
        ]);
        $this->patchJson("/api/v1/campus-events/{$editable->id}", ['ends_at' => null])
            ->assertOk()
            ->assertJsonPath('data.ends_at', null);

        $school = School::create(['name' => 'Capacity School', 'location' => 'Lagos']);
        $coordinator = $this->user('school', 'capacity-school@example.test', $school->id);
        $visit = $this->visit($openEnded, $school, $university, 'approved');
        EventRegistration::create([
            'campus_event_id' => $openEnded->id,
            'visit_request_id' => $visit->id,
            'user_id' => $coordinator->id,
            'registrant_name' => 'Capacity School group',
            'registrant_email' => $coordinator->email,
            'registrant_type' => 'school_group',
            'party_size' => 4,
            'status' => 'confirmed',
        ]);

        $this->patchJson("/api/v1/campus-events/{$openEnded->id}", ['capacity' => 3])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'capacity cannot be lower than confirmed participation.');
        $this->patchJson("/api/v1/campus-events/{$openEnded->id}", ['per_group_capacity' => 3])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'per_group_capacity cannot be lower than a confirmed group size.');
    }

    public function test_cancellation_visibility_and_rejected_filter_stay_consistent(): void
    {
        $university = $this->user('university', 'cancel-owner@example.test');
        $school = School::create(['name' => 'Cancellation School', 'location' => 'Abuja']);
        $coordinator = $this->user('school', 'cancel-school@example.test', $school->id);
        $lateSchool = School::create(['name' => 'Late Decision School', 'location' => 'Kano']);
        $lateCoordinator = $this->user('school', 'late-decision-school@example.test', $lateSchool->id);
        $student = $this->user('student', 'cancel-student@example.test', $school->id);
        $event = $this->event($university, 'Cancellation Visit');
        $visit = $this->visit($event, $school, $university, 'requested');

        Sanctum::actingAs($coordinator);
        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.upcoming_events', []);

        EventRegistration::create([
            'campus_event_id' => $event->id,
            'visit_request_id' => $visit->id,
            'user_id' => $student->id,
            'registrant_name' => $student->name,
            'registrant_email' => $student->email,
            'registrant_type' => 'student',
            'party_size' => 1,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($university);
        $this->postJson("/api/v1/campus-events/{$event->id}/cancel", ['reason' => 'Campus closure'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseHas('visit_requests', ['id' => $visit->id, 'status' => 'declined']);

        $lateRequest = $this->visit($event, $lateSchool, $university, 'requested');
        Sanctum::actingAs($lateCoordinator);
        $this->postJson("/api/v1/visits/{$lateRequest->id}/decision", ['decision' => 'approved'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Cancelled events cannot have visit requests approved or rejected.');

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/student/visits/upcoming')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/student/visits/history')->assertOk()->assertJsonPath('meta.total', 1);

        Sanctum::actingAs($coordinator);
        $this->getJson('/api/v1/visits?status=rejected')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $visit->id);
    }

    public function test_assignment_directory_and_admin_updates_require_eligible_school_membership(): void
    {
        $admin = $this->user('admin', 'eligibility-admin@example.test');
        $university = $this->user('university', 'eligibility-university@example.test');
        $school = School::create(['name' => 'Eligibility School', 'location' => 'Enugu']);
        $coordinator = $this->user('school', 'eligibility-school@example.test', $school->id);
        $eligible = $this->user('student', 'eligible-student@example.test', $school->id);
        $suspended = $this->user('student', 'suspended-student@example.test', $school->id);
        $suspended->update(['access_status' => 'suspended']);
        $unverified = $this->user('student', 'unverified-student@example.test', $school->id);
        $unverified->update(['email_verified_at' => null]);
        $event = $this->event($university, 'Eligibility Visit');
        $visit = $this->visit($event, $school, $university, 'approved');

        Sanctum::actingAs($coordinator);
        $this->getJson('/api/v1/students?eligible=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $eligible->id);
        $this->postJson("/api/v1/visits/{$visit->id}/participation/assign", [
            'student_ids' => [$suspended->id],
        ])->assertForbidden()
            ->assertJsonPath('message', 'Every selected student must be an active, verified member of the recipient school.');

        Sanctum::actingAs($admin);
        $this->patchJson("/api/v1/admin/users/{$eligible->id}", ['school_id' => null])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'school_id is required for school and student accounts.');

        Sanctum::actingAs($university);
        $this->getJson('/api/v1/schools')
            ->assertOk()
            ->assertJsonPath('data.0.coordinators_count', 1)
            ->assertJsonPath('data.0.can_receive_visits', true);
    }

    public function test_visit_specific_itinerary_notifications_do_not_cross_school_tenants(): void
    {
        $university = $this->user('university', 'itinerary-tenant-owner@example.test');
        $firstSchool = School::create(['name' => 'Itinerary Alpha', 'location' => 'Lagos']);
        $secondSchool = School::create(['name' => 'Itinerary Beta', 'location' => 'Ibadan']);
        $firstCoordinator = $this->user('school', 'itinerary-alpha@example.test', $firstSchool->id);
        $secondCoordinator = $this->user('school', 'itinerary-beta@example.test', $secondSchool->id);
        $event = $this->event($university, 'Scoped Itinerary Visit');
        $firstVisit = $this->visit($event, $firstSchool, $university, 'approved');
        $secondVisit = $this->visit($event, $secondSchool, $university, 'approved');

        Sanctum::actingAs($university);
        $firstItem = $this->postJson("/api/v1/campus-events/{$event->id}/itinerary", [
            'visit_request_id' => $firstVisit->id,
            'title' => 'Alpha private briefing',
            'starts_at' => $event->starts_at->copy()->addHour()->toIso8601String(),
        ])->assertCreated()->json('data');
        $secondItem = $this->postJson("/api/v1/campus-events/{$event->id}/itinerary", [
            'visit_request_id' => $secondVisit->id,
            'title' => 'Beta private briefing',
            'starts_at' => $event->starts_at->copy()->addHours(2)->toIso8601String(),
        ])->assertCreated()->json('data');

        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $firstCoordinator->id,
            'target_id' => $firstItem['id'],
            'subject' => 'Visit itinerary created',
        ]);
        $this->assertDatabaseMissing('platform_notifications', [
            'user_id' => $secondCoordinator->id,
            'target_id' => $firstItem['id'],
        ]);

        PlatformNotification::query()->whereIn('user_id', [$firstCoordinator->id, $secondCoordinator->id])->delete();
        $this->postJson("/api/v1/campus-events/{$event->id}/itinerary/reorder", [
            'item_ids' => [$secondItem['id'], $firstItem['id']],
        ])->assertOk();
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $firstCoordinator->id,
            'notification_type' => 'itinerary.reordered',
            'target_id' => $firstVisit->id,
        ]);
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $secondCoordinator->id,
            'notification_type' => 'itinerary.reordered',
            'target_id' => $secondVisit->id,
        ]);
    }

    public function test_notifications_can_only_be_acknowledged_by_their_recipient(): void
    {
        $recipient = $this->user('student', 'notification-recipient@example.test');
        $otherUser = $this->user('student', 'notification-other@example.test');
        $notification = PlatformNotification::create([
            'user_id' => $recipient->id,
            'notification_type' => 'general',
            'channel' => 'in_app',
            'subject' => 'Schedule updated',
            'body' => 'The visit schedule changed.',
            'status' => 'queued',
        ]);

        Sanctum::actingAs($otherUser);
        $this->patchJson("/api/v1/notifications/{$notification->id}/read")->assertForbidden();

        Sanctum::actingAs($recipient);
        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.unread', true)
            ->assertJsonPath('data.0.read_at', null);
        $this->patchJson("/api/v1/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.unread', false);
        $this->assertNotNull($notification->fresh()->read_at);

        PlatformNotification::create([
            'user_id' => $recipient->id,
            'notification_type' => 'general',
            'channel' => 'in_app',
            'subject' => 'Another update',
            'status' => 'queued',
        ]);
        $this->patchJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.updated', 1);
        $this->assertSame(0, PlatformNotification::where('user_id', $recipient->id)->whereNull('read_at')->count());
    }

    public function test_school_can_add_and_manage_only_its_own_students(): void
    {
        $school = School::create(['name' => 'Managed Student School', 'location' => 'Lagos']);
        $otherSchool = School::create(['name' => 'Other Managed School', 'location' => 'Abuja']);
        $coordinator = $this->user('school', 'managed-student-school@example.test', $school->id);
        $otherCoordinator = $this->user('school', 'other-managed-school@example.test', $otherSchool->id);

        Sanctum::actingAs($coordinator);
        $response = $this->postJson('/api/v1/students', [
            'name' => 'New School Student',
            'email' => 'new-school-student@example.test',
            'student_identifier' => 'MSS-001',
            'grade_level' => 'SS2',
            'interest_major' => 'Engineering',
        ])->assertCreated()
            ->assertJsonPath('data.student.school_id', $school->id)
            ->assertJsonPath('data.student.email_verified', false);
        $studentId = $response->json('data.student.id');

        $this->getJson('/api/v1/students')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $studentId);
        $this->getJson('/api/v1/students?eligible=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
        $this->patchJson("/api/v1/students/{$studentId}", [
            'grade_level' => 'SS3',
            'access_status' => 'suspended',
        ])->assertOk()
            ->assertJsonPath('data.grade_level', 'SS3')
            ->assertJsonPath('data.access_status', 'suspended');

        Sanctum::actingAs($otherCoordinator);
        $this->patchJson("/api/v1/students/{$studentId}", ['name' => 'Cross-tenant edit'])->assertForbidden();
        $this->assertDatabaseHas('users', [
            'id' => $studentId,
            'name' => 'New School Student',
            'school_id' => $school->id,
            'role' => 'student',
        ]);
    }

    private function user(string $role, string $email, ?int $schoolId = null): User
    {
        return User::create([
            'name' => ucfirst(str_replace('_', ' ', $role)).' User',
            'email' => $email,
            'role' => $role,
            'school_id' => $schoolId,
            'access_status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
    }

    private function event(User $university, string $title): CampusEvent
    {
        return CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => $title,
            'starts_at' => now()->addWeeks(3),
            'ends_at' => now()->addWeeks(3)->addHours(3),
            'venue' => $title.' Hall',
            'location' => 'Campus',
            'capacity' => 100,
            'status' => 'published',
            'visibility' => 'invite_only',
            'lifecycle_stage' => 'open',
        ]);
    }

    private function visit(CampusEvent $event, School $school, User $requester, string $status): VisitRequest
    {
        $visit = new VisitRequest;
        $visit->forceFill([
            'target_school_id' => null,
            'school_id' => $school->id,
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $requester->id,
            'requested_window' => $event->starts_at->toIso8601String(),
            'group_size' => 1,
            'status' => $status,
            'priority' => 1,
        ])->save();

        return $visit;
    }
}
