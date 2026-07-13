<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;

class WaitlistService
{
    public function statusFor(Event $event): string
    {
        return $event->hasCapacity() ? 'confirmed' : 'waitlisted';
    }

    public function promoteNext(Event $event): ?Registration
    {
        return DB::transaction(function () use ($event): ?Registration {
            $lockedEvent = Event::query()->lockForUpdate()->find($event->id);

            if (! $lockedEvent || ! $lockedEvent->hasCapacity()) {
                return null;
            }

            $next = $lockedEvent->registrations()
                ->where('status', 'waitlisted')
                ->oldest()
                ->lockForUpdate()
                ->first();

            if (! $next) {
                return null;
            }

            $next->update(['status' => 'confirmed']);

            return $next;
        });
    }
}
