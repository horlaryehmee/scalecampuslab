<?php

namespace App\Jobs;

use App\Models\Message;
use App\Services\MockSmsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendPlatformMessage implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $messageId)
    {
    }

    public function handle(MockSmsService $sms): void
    {
        $message = Message::query()
            ->with('user')
            ->whereKey($this->messageId)
            ->where('status', 'pending')
            ->first();

        if (! $message) {
            return;
        }

        if ($message->type === 'sms') {
            $sms->send($message->user->email, $message->content);
        } else {
            Mail::raw($message->content, function ($mail) use ($message): void {
                $mail->to($message->user->email)
                    ->subject('Campus Visit Platform Notification');
            });
        }

        $message->update(['status' => 'sent']);
    }
}
