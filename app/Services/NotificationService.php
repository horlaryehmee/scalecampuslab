<?php

namespace App\Services;

use App\Jobs\SendPlatformMessage;
use App\Models\Message;
use App\Models\User;

class NotificationService
{
    public function queue(User $user, string $content, string $type = 'email'): Message
    {
        if (! in_array($type, ['email', 'sms'], true)) {
            $type = 'email';
        }

        $message = Message::create([
            'user_id' => $user->id,
            'type' => $type,
            'content' => $content,
            'status' => 'pending',
        ]);

        SendPlatformMessage::dispatch($message->id);

        return $message;
    }
}
