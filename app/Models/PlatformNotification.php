<?php

namespace App\Models;

use App\Jobs\DeliverPlatformNotification;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'campus_event_id',
    'notification_type',
    'target_type',
    'target_id',
    'channel',
    'subject',
    'body',
    'status',
    'retry_count',
    'scheduled_for',
    'last_attempt_at',
    'failure_reason',
    'metadata',
    'sent_at',
    'read_at',
])]
class PlatformNotification extends Model
{
    protected static function booted(): void
    {
        static::created(function (PlatformNotification $notification): void {
            self::dispatchDelivery($notification);
        });

        static::updated(function (PlatformNotification $notification): void {
            if ($notification->wasChanged('status') && $notification->status === 'queued') {
                self::dispatchDelivery($notification);
            }
        });
    }

    private static function dispatchDelivery(PlatformNotification $notification): void
    {
        if ($notification->status !== 'queued' || $notification->channel !== 'email') {
            return;
        }

        $dispatch = DeliverPlatformNotification::dispatch($notification->id);

        if ($notification->scheduled_for?->isFuture()) {
            $dispatch->delay($notification->scheduled_for);
        }

        $dispatch->afterCommit();
    }

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'read_at' => 'datetime',
            'scheduled_for' => 'datetime',
            'last_attempt_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(CampusEvent::class, 'campus_event_id');
    }
}
