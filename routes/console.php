<?php

use App\Models\Event;
use App\Models\LoginChallenge;
use App\Services\CampusReminderService;
use App\Services\NotificationService;
use App\Services\WaitlistService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('visits:send-reminders', function (NotificationService $notifications) {
    $count = 0;

    Event::query()
        ->where('status', 'published')
        ->whereBetween('event_date', [now(), now()->addDay()])
        ->with(['registrations' => fn ($query) => $query->where('status', 'confirmed')->with('student')])
        ->get()
        ->each(function (Event $event) use ($notifications, &$count): void {
            foreach ($event->registrations as $registration) {
                $key = 'legacy-visit-reminder:'.$registration->id.':'.$event->event_date->format('YmdHi');
                if (! Cache::add($key, true, now()->addDays(2))) {
                    continue;
                }

                $notifications->queue(
                    $registration->student,
                    "Reminder: {$event->title} is scheduled for {$event->event_date->toDayDateTimeString()}."
                );
                $count++;
            }
        });

    $this->info("Queued {$count} event reminders.");
})->purpose('Send reminders for events happening in the next 24 hours');

Artisan::command('visits:process-waitlists', function (WaitlistService $waitlist) {
    $count = 0;

    Event::query()
        ->where('status', 'published')
        ->withCount(['registrations as waitlisted_count' => fn ($query) => $query->where('status', 'waitlisted')])
        ->get()
        ->each(function (Event $event) use ($waitlist, &$count): void {
            while ($waitlist->promoteNext($event->fresh())) {
                $count++;
            }
        });

    $this->info("Promoted {$count} waitlisted registrations.");
})->purpose('Promote waitlisted registrations when capacity opens');

Artisan::command('campus:queue-reminders', function (CampusReminderService $reminders) {
    $count = $reminders->queueDue();

    $this->info("Queued {$count} canonical campus reminder(s).");
})->purpose('Queue due reminders for canonical campus visit programs');

Schedule::command('visits:send-reminders')->hourly()->withoutOverlapping();
Schedule::command('visits:process-waitlists')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('campus:queue-reminders')->everyFiveMinutes()->withoutOverlapping();
Schedule::call(static function (): void {
    LoginChallenge::query()
        ->where('expires_at', '<', now()->subDay())
        ->delete();
})->daily();
