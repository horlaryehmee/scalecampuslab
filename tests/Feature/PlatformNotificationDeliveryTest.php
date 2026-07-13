<?php

namespace Tests\Feature;

use App\Jobs\DeliverPlatformNotification;
use App\Models\EmailTemplate;
use App\Models\PlatformNotification;
use App\Models\School;
use App\Models\UniversitySetting;
use App\Models\User;
use App\Services\PlatformNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PlatformNotificationDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_queued_email_notifications_are_dispatched_centrally(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $notification = PlatformNotification::create([
            'user_id' => $user->id,
            'channel' => 'email',
            'subject' => 'Application status changed',
            'body' => 'Your application has been reviewed.',
            'status' => 'queued',
        ]);

        Queue::assertPushed(
            DeliverPlatformNotification::class,
            fn (DeliverPlatformNotification $job): bool => $job->notificationId === $notification->id,
        );
    }

    public function test_delivery_can_use_a_valid_registration_email_when_no_user_is_linked(): void
    {
        Queue::fake();

        $notification = PlatformNotification::create([
            'channel' => 'email',
            'subject' => 'Visit reminder',
            'body' => 'Your visit starts tomorrow.',
            'status' => 'queued',
            'metadata' => [
                'registrant_email' => 'visitor@example.test',
                'registrant_name' => 'Visitor Group',
            ],
        ]);

        (new DeliverPlatformNotification($notification->id))->handle();

        $this->assertSame('sent', $notification->fresh()->status);
        $this->assertNotNull($notification->fresh()->sent_at);
    }

    public function test_failed_email_notifications_are_dispatched_when_requeued(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $notification = PlatformNotification::create([
            'user_id' => $user->id,
            'channel' => 'email',
            'subject' => 'Decision update',
            'body' => 'Your decision is ready.',
            'status' => 'failed',
        ]);

        Queue::assertNothingPushed();

        $notification->update(['status' => 'queued', 'scheduled_for' => now()]);

        Queue::assertPushed(
            DeliverPlatformNotification::class,
            fn (DeliverPlatformNotification $job): bool => $job->notificationId === $notification->id,
        );
    }

    public function test_undeliverable_email_notifications_fail_with_an_actionable_reason(): void
    {
        Queue::fake();

        $notification = PlatformNotification::create([
            'channel' => 'email',
            'subject' => 'Visit reminder',
            'body' => 'Your visit starts tomorrow.',
            'status' => 'queued',
        ]);

        (new DeliverPlatformNotification($notification->id))->handle();

        $notification->refresh();
        $this->assertSame('failed', $notification->status);
        $this->assertSame('No deliverable email recipient is associated with this notification.', $notification->failure_reason);
    }

    public function test_institution_email_preferences_fall_back_to_in_app_delivery(): void
    {
        Queue::fake();
        $school = School::create([
            'name' => 'Quiet School',
            'location' => 'Lagos',
            'email_notifications' => false,
        ]);
        $coordinator = User::factory()->create(['role' => 'school', 'school_id' => $school->id]);
        $university = User::factory()->create(['role' => 'university']);
        UniversitySetting::create([
            'university_user_id' => $university->id,
            'notification_preferences' => ['email_enabled' => false],
        ]);
        $notifier = app(PlatformNotifier::class);

        $schoolNotification = $notifier->notify($coordinator, 'School update', 'A new update is available.', 'visit.updated');
        $universityNotification = $notifier->notify($university, 'University update', 'A new update is available.', 'application.submitted');

        foreach ([$schoolNotification, $universityNotification] as $notification) {
            $this->assertSame('in_app', $notification->channel);
            $this->assertSame('sent', $notification->status);
            $this->assertNotNull($notification->sent_at);
        }
        Queue::assertNothingPushed();
    }

    public function test_enabled_managed_email_template_is_resolved_by_notification_type(): void
    {
        Queue::fake();
        $user = User::factory()->create(['name' => 'Amina Student']);
        EmailTemplate::create([
            'key' => 'visit.updated',
            'name' => 'Visit updated',
            'subject' => 'Schedule update for {{ user_name }}',
            'body' => '{{ default_body }} Visit reference: {{ visit_reference }}.',
            'enabled' => true,
        ]);

        $notification = app(PlatformNotifier::class)->notify(
            $user,
            'Built-in subject',
            'The visit schedule changed.',
            'visit.updated',
            ['visit_reference' => 'VIS-1042'],
        );

        $this->assertSame('Schedule update for Amina Student', $notification->subject);
        $this->assertSame('The visit schedule changed. Visit reference: VIS-1042.', $notification->body);
        Queue::assertPushed(DeliverPlatformNotification::class);
    }
}
