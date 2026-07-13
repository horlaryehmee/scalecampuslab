<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Registration;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiBackendTest extends TestCase
{
    use RefreshDatabase;

    public function test_sanctum_login_returns_token(): void
    {
        User::create([
            'name' => 'API Student',
            'email' => 'api-student@example.com',
            'role' => 'student',
            'password' => Hash::make('password'),
        ]);

        $this->postJson('/api/login', [
            'email' => 'api-student@example.com',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_university_creates_publishes_and_blocks_double_booking(): void
    {
        $university = $this->user('university');
        Sanctum::actingAs($university);

        $payload = [
            'title' => 'Campus Open Day',
            'description' => 'Visit campus.',
            'location' => 'Main Hall',
            'event_date' => now()->addWeek()->format('Y-m-d H:i:s'),
            'capacity' => 1,
            'status' => 'published',
        ];

        $this->postJson('/api/events', $payload)->assertCreated();
        $this->postJson('/api/events', $payload)->assertStatus(422);

        $this->assertDatabaseHas('events', [
            'title' => 'Campus Open Day',
            'university_id' => $university->id,
        ]);
    }

    public function test_university_can_unpublish_event(): void
    {
        $event = $this->apiEvent(capacity: 10);
        Sanctum::actingAs($event->university);

        $this->postJson("/api/events/{$event->id}/unpublish")
            ->assertOk()
            ->assertJsonPath('status', 'draft');
    }

    public function test_registration_overflow_waitlists_and_cancel_promotes_fifo(): void
    {
        $event = $this->apiEvent(capacity: 1);
        $first = $this->user('student', 'first@example.com');
        $second = $this->user('student', 'second@example.com');

        Sanctum::actingAs($first);
        $this->postJson("/api/events/{$event->id}/registrations")->assertCreated();

        Sanctum::actingAs($second);
        $this->postJson("/api/events/{$event->id}/registrations")->assertCreated();

        $this->assertDatabaseHas('registrations', ['student_id' => $second->id, 'status' => 'waitlisted']);

        $firstRegistration = Registration::where('student_id', $first->id)->firstOrFail();
        Sanctum::actingAs($first);
        $this->deleteJson("/api/registrations/{$firstRegistration->id}")->assertOk();

        $this->assertDatabaseHas('registrations', ['student_id' => $second->id, 'status' => 'confirmed']);
    }

    public function test_school_group_booking_registers_multiple_students(): void
    {
        $school = School::create(['name' => 'Demo School', 'location' => 'Lagos']);
        $schoolUser = $this->user('school', 'school-user@example.com', $school->id);
        $students = [
            $this->user('student', 'one@example.com', $school->id)->id,
            $this->user('student', 'two@example.com', $school->id)->id,
        ];
        $event = $this->apiEvent(capacity: 10);

        Sanctum::actingAs($schoolUser);

        $this->postJson("/api/events/{$event->id}/group-registrations", [
            'student_ids' => $students,
        ])->assertCreated();

        $this->assertSame(2, Registration::where('school_id', $school->id)->count());
    }

    public function test_school_bookings_are_visible_to_event_university(): void
    {
        $school = School::create(['name' => 'Visible School', 'location' => 'Lagos']);
        $schoolUser = $this->user('school', 'visible-school@example.com', $school->id);
        $student = $this->user('student', 'visible-student@example.com', $school->id);
        $event = $this->apiEvent(capacity: 10);

        Sanctum::actingAs($schoolUser);
        $this->postJson("/api/events/{$event->id}/group-registrations", [
            'student_ids' => [$student->id],
        ])->assertCreated();

        Sanctum::actingAs($event->university);
        $this->getJson("/api/events/{$event->id}/registrations")
            ->assertOk()
            ->assertJsonFragment(['email' => 'visible-student@example.com'])
            ->assertJsonFragment(['name' => 'Visible School']);
    }

    public function test_event_updates_notify_students_and_school_accounts(): void
    {
        $school = School::create(['name' => 'Notify School', 'location' => 'Lagos']);
        $schoolUser = $this->user('school', 'notify-school@example.com', $school->id);
        $student = $this->user('student', 'notify-student@example.com', $school->id);
        $event = $this->apiEvent(capacity: 10);
        Registration::create([
            'event_id' => $event->id,
            'student_id' => $student->id,
            'school_id' => $school->id,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($event->university);
        $this->putJson("/api/events/{$event->id}", [
            'title' => 'Updated Preview Day',
            'location' => 'Updated Hall',
            'event_date' => now()->addWeeks(2)->toDateTimeString(),
            'capacity' => 25,
        ])->assertOk();

        $this->assertDatabaseHas('messages', [
            'user_id' => $student->id,
            'content' => 'Event updated: Updated Preview Day.',
        ]);
        $this->assertDatabaseHas('messages', [
            'user_id' => $schoolUser->id,
            'content' => 'Event updated: Updated Preview Day.',
        ]);
    }

    public function test_school_can_fetch_students_for_group_booking(): void
    {
        $school = School::create(['name' => 'Demo School', 'location' => 'Lagos']);
        $schoolUser = $this->user('school', 'school-list@example.com', $school->id);
        $student = $this->user('student', 'listed-student@example.com', $school->id);

        Sanctum::actingAs($schoolUser);

        $this->getJson('/api/students')
            ->assertOk()
            ->assertJsonFragment(['id' => $student->id, 'email' => 'listed-student@example.com']);
    }

    public function test_report_exports_are_available_to_university(): void
    {
        Sanctum::actingAs($this->user('university'));

        $this->get('/api/reports/export/pdf')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->get('/api/reports/export/excel')
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.ms-excel; charset=UTF-8');
    }

    public function test_scheduler_commands_run_successfully(): void
    {
        $this->artisan('visits:send-reminders')->assertExitCode(0);
        $this->artisan('visits:process-waitlists')->assertExitCode(0);
    }

    public function test_university_can_queue_message_to_event_registrants(): void
    {
        $event = $this->apiEvent(capacity: 5);
        $student = $this->user('student', 'message-student@example.com');
        Registration::create([
            'event_id' => $event->id,
            'student_id' => $student->id,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($event->university);

        $this->postJson('/api/messages', [
            'event_id' => $event->id,
            'type' => 'email',
            'content' => 'Schedule updated.',
        ])->assertCreated()
            ->assertJsonPath('queued', 1);

        $this->assertDatabaseHas('messages', [
            'user_id' => $student->id,
            'content' => 'Schedule updated.',
            'status' => 'sent',
        ]);
    }

    private function apiEvent(int $capacity): Event
    {
        return Event::create([
            'university_id' => $this->user('university', 'uni-'.uniqid().'@example.com')->id,
            'title' => 'Preview Day',
            'description' => 'Campus visit.',
            'location' => 'Welcome Center '.uniqid(),
            'event_date' => now()->addWeek(),
            'capacity' => $capacity,
            'status' => 'published',
        ]);
    }

    private function user(string $role, ?string $email = null, ?int $schoolId = null): User
    {
        return User::create([
            'name' => ucfirst($role).' User',
            'email' => $email ?? $role.'-'.uniqid().'@example.com',
            'role' => $role,
            'school_id' => $schoolId,
            'access_status' => 'active',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
        ]);
    }
}
