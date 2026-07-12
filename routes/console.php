<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Event;
use App\Services\NotificationService;
use App\Services\WaitlistService;

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

Schedule::command('visits:send-reminders')->hourly();
Schedule::command('visits:process-waitlists')->everyFifteenMinutes();
