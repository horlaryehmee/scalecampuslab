<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Registration;

class WaitlistService
{
    public function statusFor(Event $event): string
    {
        return $event->hasCapacity() ? 'confirmed' : 'waitlisted';
    }

    public function promoteNext(Event $event): ?Registration
    {
        if (! $event->hasCapacity()) {
            return null;
        }

        $next = $event->registrations()
            ->where('status', 'waitlisted')
            ->oldest()
            ->first();

        if (! $next) {
            return null;
        }

        $next->update(['status' => 'confirmed']);

        return $next;
    }
}
