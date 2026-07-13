<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Event;
use App\Models\Registration;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LegacyApiBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_events_are_not_visible_to_students_by_guessed_id(): void
    {
        $university = $this->user('university');
        $student = $this->user('student');
        $event = $this->event($university, 'draft');

        Sanctum::actingAs($student);
        $this->getJson("/api/events/{$event->id}")->assertForbidden();
    }

    public function test_school_cannot_book_a_student_from_another_school(): void
    {
        $firstSchool = School::create(['name' => 'First School', 'location' => 'Lagos']);
        $secondSchool = School::create(['name' => 'Second School', 'location' => 'Abuja']);
        $coordinator = $this->user('school', $firstSchool->id);
        $otherStudent = $this->user('student', $secondSchool->id);
        $event = $this->event($this->user('university'), 'published');

        Sanctum::actingAs($coordinator);
        $this->postJson("/api/events/{$event->id}/registrations", [
            'student_id' => $otherStudent->id,
        ])->assertForbidden();
    }

    public function test_school_cannot_spoof_another_school_id_for_a_group_booking(): void
    {
        $firstSchool = School::create(['name' => 'First School', 'location' => 'Lagos']);
        $secondSchool = School::create(['name' => 'Second School', 'location' => 'Abuja']);
        $coordinator = $this->user('school', $firstSchool->id);
        $otherStudent = $this->user('student', $secondSchool->id);
        $event = $this->event($this->user('university'), 'published');

        Sanctum::actingAs($coordinator);
        $this->postJson("/api/events/{$event->id}/group-registrations", [
            'school_id' => $secondSchool->id,
            'student_ids' => [$otherStudent->id],
        ])->assertForbidden();

        $this->assertDatabaseMissing('registrations', [
            'event_id' => $event->id,
            'student_id' => $otherStudent->id,
        ]);
    }

    public function test_group_booking_cannot_attach_a_student_to_the_wrong_selected_school(): void
    {
        $firstSchool = School::create(['name' => 'First School', 'location' => 'Lagos']);
        $secondSchool = School::create(['name' => 'Second School', 'location' => 'Abuja']);
        $admin = $this->user('admin');
        $otherStudent = $this->user('student', $secondSchool->id);
        $event = $this->event($this->user('university'), 'published');

        Sanctum::actingAs($admin);
        $this->postJson("/api/events/{$event->id}/group-registrations", [
            'school_id' => $firstSchool->id,
            'student_ids' => [$otherStudent->id],
        ])->assertForbidden();

        $this->assertDatabaseMissing('registrations', [
            'event_id' => $event->id,
            'student_id' => $otherStudent->id,
        ]);
    }

    public function test_invalid_mixed_school_group_booking_is_atomic(): void
    {
        $firstSchool = School::create(['name' => 'First School', 'location' => 'Lagos']);
        $secondSchool = School::create(['name' => 'Second School', 'location' => 'Abuja']);
        $coordinator = $this->user('school', $firstSchool->id);
        $ownStudent = $this->user('student', $firstSchool->id);
        $otherStudent = $this->user('student', $secondSchool->id);
        $event = $this->event($this->user('university'), 'published');

        Sanctum::actingAs($coordinator);
        $this->postJson("/api/events/{$event->id}/group-registrations", [
            'student_ids' => [$ownStudent->id, $otherStudent->id],
        ])->assertForbidden();

        $this->assertDatabaseMissing('registrations', ['event_id' => $event->id]);
    }

    public function test_students_cannot_self_approve_applications_and_school_queries_are_scoped(): void
    {
        $firstSchool = School::create(['name' => 'First School', 'location' => 'Lagos']);
        $secondSchool = School::create(['name' => 'Second School', 'location' => 'Abuja']);
        $coordinator = $this->user('school', $firstSchool->id);
        $firstStudent = $this->user('student', $firstSchool->id);
        $secondStudent = $this->user('student', $secondSchool->id);
        $university = $this->user('university');

        Sanctum::actingAs($firstStudent);
        $this->postJson('/api/applications', [
            'university_id' => $university->id,
            'status' => 'accepted',
        ])->assertCreated();

        $this->assertDatabaseHas('applications', [
            'student_id' => $firstStudent->id,
            'status' => 'applied',
        ]);

        Application::create([
            'student_id' => $secondStudent->id,
            'university_id' => $university->id,
            'status' => 'applied',
        ]);

        Sanctum::actingAs($coordinator);
        $this->getJson('/api/applications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.student_id', $firstStudent->id);
    }

    public function test_university_reports_only_include_its_events(): void
    {
        $firstUniversity = $this->user('university');
        $secondUniversity = $this->user('university');
        $firstEvent = $this->event($firstUniversity, 'published', 'First University Visit');
        $this->event($secondUniversity, 'published', 'Other University Visit');

        Sanctum::actingAs($firstUniversity);
        $this->getJson('/api/reports')
            ->assertOk()
            ->assertJsonCount(1, 'registrations_per_event')
            ->assertJsonPath('registrations_per_event.0.id', $firstEvent->id);
    }

    public function test_attendance_requires_a_confirmed_registration(): void
    {
        $university = $this->user('university');
        $student = $this->user('student');
        $event = $this->event($university, 'published');

        Sanctum::actingAs($university);
        $payload = ['records' => [['student_id' => $student->id, 'attended' => true]]];
        $this->postJson("/api/events/{$event->id}/attendance", $payload)->assertUnprocessable();

        Registration::create([
            'event_id' => $event->id,
            'student_id' => $student->id,
            'status' => 'confirmed',
        ]);

        $this->postJson("/api/events/{$event->id}/attendance", $payload)->assertOk();
        $this->assertDatabaseHas('attendance', [
            'event_id' => $event->id,
            'student_id' => $student->id,
            'attended' => true,
        ]);
    }

    public function test_suspended_accounts_cannot_use_legacy_api_and_linked_schools_cannot_be_deleted(): void
    {
        $suspended = $this->user('student');
        $suspended->update(['access_status' => 'suspended', 'password' => Hash::make('Campus2026')]);

        $this->postJson('/api/login', [
            'email' => $suspended->email,
            'password' => 'Campus2026',
        ])->assertForbidden();

        $school = School::create(['name' => 'Protected School', 'location' => 'Lagos']);
        $this->user('student', $school->id);
        $admin = $this->user('admin');

        Sanctum::actingAs($admin);
        $this->deleteJson("/api/admin/schools/{$school->id}")
            ->assertStatus(409);
    }

    private function user(string $role, ?int $schoolId = null): User
    {
        return User::factory()->create([
            'role' => $role,
            'school_id' => $schoolId,
            'access_status' => 'active',
        ]);
    }

    private function event(User $university, string $status, ?string $title = null): Event
    {
        return Event::create([
            'university_id' => $university->id,
            'title' => $title ?? 'Campus Visit '.uniqid(),
            'description' => 'Campus visit.',
            'location' => 'Venue '.uniqid(),
            'event_date' => now()->addWeek(),
            'capacity' => 20,
            'status' => $status,
        ]);
    }
}
