<?php

namespace App\Services;

use App\Models\CampusEvent;
use App\Models\PlatformNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CampusReminderService
{
    public function queueDue(): int
    {
        $queued = 0;

        CampusEvent::query()
            ->where('status', 'published')
            ->where('reminders_enabled', true)
            ->whereBetween('starts_at', [now(), now()->addDays(61)])
            ->orderBy('id')
            ->chunkById(50, function ($events) use (&$queued): void {
                foreach ($events as $event) {
                    $queued += $this->queueEventIfDue($event->id);
                }
            });

        return $queued;
    }

    private function queueEventIfDue(int $eventId): int
    {
        return DB::transaction(function () use ($eventId): int {
            $event = CampusEvent::query()->lockForUpdate()->find($eventId);

            if (! $event || $event->status !== 'published' || ! $event->reminders_enabled || ! $event->starts_at?->isFuture()) {
                return 0;
            }

            $reminderAt = $this->reminderAt($event);
            if ($reminderAt->isFuture() || $event->last_reminder_queued_at?->gte($reminderAt)) {
                return 0;
            }

            $registrations = $event->registrations()
                ->whereIn('status', ['confirmed', 'waitlisted'])
                ->get();
            $queued = 0;

            foreach ($registrations as $registration) {
                if (! $registration->user_id && ! filter_var($registration->registrant_email, FILTER_VALIDATE_EMAIL)) {
                    continue;
                }

                PlatformNotification::create([
                    'user_id' => $registration->user_id,
                    'campus_event_id' => $event->id,
                    'notification_type' => 'reminder',
                    'target_type' => 'event_registration',
                    'target_id' => $registration->id,
                    'channel' => 'email',
                    'subject' => 'Visit reminder: '.$event->title,
                    'body' => $event->title.' starts '.$event->starts_at->format('M j, Y g:i A').' at '.$event->venue.'. Your registration is '.$registration->status.'.',
                    'status' => 'queued',
                    'scheduled_for' => now(),
                    'metadata' => [
                        'source' => 'scheduled_visit_reminder',
                        'registration_id' => $registration->id,
                        'registrant_email' => $registration->registrant_email,
                        'registrant_name' => $registration->registrant_name,
                    ],
                ]);
                $queued++;
            }

            $event->update(['last_reminder_queued_at' => now()]);

            return $queued;
        });
    }

    private function reminderAt(CampusEvent $event): Carbon
    {
        [$hour, $minute] = array_map('intval', array_pad(explode(':', (string) $event->reminder_time), 2, 0));

        return $event->starts_at
            ->copy()
            ->subDays(max(0, (int) $event->reminder_days_before))
            ->setTime($hour, $minute);
    }
}
