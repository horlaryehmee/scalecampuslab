<?php

namespace Tests\Feature;

use App\Jobs\DeliverPlatformNotification;
use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\User;
use App\Services\CampusReminderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class CampusReminderServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_due_canonical_reminders_are_queued_once(): void
    {
        Carbon::setTestNow('2026-07-13 10:00:00');
        Queue::fake();
        $university = User::factory()->create(['role' => 'university']);
        $student = User::factory()->create(['role' => 'student']);
        $event = CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Engineering Visit',
            'starts_at' => now()->addDay()->setTime(15, 0),
            'ends_at' => now()->addDay()->setTime(17, 0),
            'venue' => 'Engineering Hall',
            'capacity' => 100,
            'status' => 'published',
            'reminders_enabled' => true,
            'reminder_days_before' => 1,
            'reminder_time' => '09:00',
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

        $service = app(CampusReminderService::class);
        $this->assertSame(1, $service->queueDue());
        $this->assertSame(0, $service->queueDue());

        $this->assertDatabaseCount('platform_notifications', 1);
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $student->id,
            'campus_event_id' => $event->id,
            'notification_type' => 'reminder',
            'status' => 'queued',
        ]);
        $this->assertNotNull($event->fresh()->last_reminder_queued_at);
        Queue::assertPushed(DeliverPlatformNotification::class, 1);
    }
}
