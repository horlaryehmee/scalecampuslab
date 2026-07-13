<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\EventRegistrationStudent;
use App\Models\School;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PortalVisitWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_university_invitation_flows_through_school_approval_assignment_and_student_itinerary(): void
    {
        $school = School::create(['name' => 'Scale Science School', 'location' => 'Lagos']);
        $university = $this->user('university', 'portal-university@example.test');
        $coordinator = $this->user('school', 'portal-school@example.test', $school->id);
        $student = $this->user('student', 'portal-student@example.test', $school->id);
        $event = $this->event($university, 'Engineering Discovery Day');
        $unrelatedEvent = $this->event($university, 'Unrelated Published Event');

        $this->actingAs($university)->post('/visit-requests', [
            'school_id' => $school->id,
            'campus_event_id' => $event->id,
            'requested_window' => now()->addWeeks(2)->toDateString(),
            'group_size' => 20,
            'priority' => 3,
            'notes' => 'Invite the engineering cohort.',
        ])->assertRedirect();

        $visit = VisitRequest::query()->sole();
        $this->assertSame($university->id, $visit->requested_by_user_id);
        $this->assertSame($school->id, $visit->school_id);

        $schoolProps = $this->actingAs($coordinator)
            ->get('/dashboard/school')
            ->assertOk()
            ->viewData('props');

        $this->assertSame([$visit->id], collect($schoolProps['visitRequests'])->pluck('id')->all());
        $this->assertSame('university', $schoolProps['visitRequests'][0]['requesterRole']);
        $this->assertSame($university->id, $schoolProps['visitRequests'][0]['requesterId']);

        $this->actingAs($coordinator)->post("/visit-requests/{$visit->id}/decision", [
            'decision' => 'approved',
            'decision_note' => 'Transport is confirmed.',
        ])->assertRedirect();

        $this->assertDatabaseHas('visit_requests', [
            'id' => $visit->id,
            'status' => 'approved',
            'responded_by_user_id' => $coordinator->id,
        ]);

        $approvedSchoolProps = $this->actingAs($coordinator)
            ->get('/dashboard/school')
            ->assertOk()
            ->viewData('props');

        $this->assertSame([$event->id], collect($approvedSchoolProps['scheduleEvents'])->pluck('id')->all());
        $this->assertNotContains($unrelatedEvent->id, collect($approvedSchoolProps['scheduleEvents'])->pluck('id')->all());

        Sanctum::actingAs($university);
        $itinerary = $this->postJson("/api/v1/campus-events/{$event->id}/itinerary", [
            'visit_request_id' => $visit->id,
            'title' => 'Engineering laboratory tour',
            'description' => 'Meet the faculty and visit the robotics laboratory.',
            'starts_at' => $event->starts_at->copy()->addMinutes(30)->toIso8601String(),
            'ends_at' => $event->starts_at->copy()->addHours(2)->toIso8601String(),
            'location' => 'Robotics Laboratory',
        ])->assertCreated();

        $this->actingAs($coordinator)->post('/dashboard/school/students/assign', [
            'visit_request_id' => $visit->id,
            'student_ids' => [$student->id],
        ])->assertRedirect();

        $this->assertDatabaseHas('event_registration_students', [
            'user_id' => $student->id,
            'status' => 'confirmed',
        ]);
        $this->assertSame(1, EventRegistrationStudent::where('user_id', $student->id)->count());

        Sanctum::actingAs($student);
        $this->getJson('/api/student/visits')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.event.id', $event->id)
            ->assertJsonPath('data.0.status', 'confirmed')
            ->assertJsonPath('data.0.itinerary.0.id', $itinerary->json('data.id'))
            ->assertJsonPath('data.0.itinerary.0.title', 'Engineering laboratory tour');
    }

    private function user(string $role, string $email, ?int $schoolId = null): User
    {
        return User::create([
            'name' => ucfirst(str_replace('_', ' ', $role)).' Portal User',
            'email' => $email,
            'password' => Hash::make('password'),
            'role' => $role,
            'school_id' => $schoolId,
            'access_status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function event(User $university, string $title): CampusEvent
    {
        return CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => $title,
            'description' => 'A published campus visit backed by live data.',
            'starts_at' => now()->addWeeks(2)->setTime(10, 0),
            'ends_at' => now()->addWeeks(2)->setTime(15, 0),
            'venue' => 'Main Campus',
            'location' => 'Lagos',
            'capacity' => 100,
            'per_school_capacity' => 50,
            'per_group_capacity' => 40,
            'status' => 'published',
        ]);
    }
}
