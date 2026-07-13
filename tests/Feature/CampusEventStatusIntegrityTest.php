<?php

namespace Tests\Feature;

use App\Jobs\DeliverPlatformNotification;
use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class CampusEventStatusIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_transitions_do_not_overwrite_event_configuration_and_notify_attendees(): void
    {
        Queue::fake();
        $university = User::factory()->create(['role' => 'university']);
        $student = User::factory()->create(['role' => 'student']);
        $event = CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Configuration Safe Visit',
            'starts_at' => now()->addWeeks(2),
            'ends_at' => now()->addWeeks(2)->addHours(2),
            'venue' => 'Original Science Hall',
            'location' => 'Abuja',
            'description' => 'The original description.',
            'capacity' => 73,
            'status' => 'draft',
            'visibility' => 'invite_only',
            'lifecycle_stage' => 'planning',
            'reminders_enabled' => true,
            'reminder_days_before' => 0,
            'reminder_time' => '08:15',
        ]);
        EventRegistration::create([
            'campus_event_id' => $event->id,
            'user_id' => $student->id,
            'registrant_name' => $student->name,
            'registrant_email' => $student->email,
            'registrant_type' => 'student',
            'party_size' => 1,
            'status' => 'confirmed',
        ]);

        $this->actingAs($university)
            ->patch("/campus-events/{$event->id}/status", ['status' => 'published'])
            ->assertRedirect();

        $event->refresh();
        $this->assertSame('published', $event->status);
        $this->assertSame('open', $event->lifecycle_stage);
        $this->assertSame('Original Science Hall', $event->venue);
        $this->assertSame(73, $event->capacity);
        $this->assertSame(0, $event->reminder_days_before);
        $this->assertSame('08:15', substr((string) $event->reminder_time, 0, 5));
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $student->id,
            'campus_event_id' => $event->id,
            'notification_type' => 'event_status_update',
        ]);
        Queue::assertPushed(DeliverPlatformNotification::class, 1);
    }
}
