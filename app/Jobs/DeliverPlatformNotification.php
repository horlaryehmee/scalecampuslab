<?php

namespace App\Jobs;

use App\Models\PlatformNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Throwable;

class DeliverPlatformNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [30, 120, 600];

    public function __construct(public int $notificationId) {}

    public function handle(): void
    {
        $notification = PlatformNotification::query()
            ->with('user:id,name,email')
            ->whereKey($this->notificationId)
            ->whereIn('status', ['queued', 'failed'])
            ->first();

        if (! $notification) {
            return;
        }

        $recipientEmail = $notification->user?->email
            ?: data_get($notification->metadata, 'registrant_email');
        $recipientName = $notification->user?->name
            ?: data_get($notification->metadata, 'registrant_name');

        if ($notification->channel !== 'email' || ! filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $notification->update([
                'status' => 'failed',
                'last_attempt_at' => now(),
                'failure_reason' => 'No deliverable email recipient is associated with this notification.',
            ]);

            return;
        }

        try {
            Mail::raw($notification->body ?? '', function ($message) use ($notification, $recipientEmail, $recipientName): void {
                $message->to($recipientEmail, $recipientName)
                    ->subject($notification->subject);
            });

            $notification->update([
                'status' => 'sent',
                'sent_at' => now(),
                'last_attempt_at' => now(),
                'failure_reason' => null,
            ]);
        } catch (Throwable $exception) {
            $notification->update([
                'status' => 'failed',
                'retry_count' => $notification->retry_count + 1,
                'last_attempt_at' => now(),
                'failure_reason' => mb_substr($exception->getMessage(), 0, 1000),
            ]);

            throw $exception;
        }
    }
}
