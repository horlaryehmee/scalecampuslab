<?php

namespace App\Services;

use App\Jobs\SendPlatformMessage;
use App\Models\Message;
use App\Models\User;

class NotificationService
{
    public function queue(User $user, string $content, string $type = 'email'): Message
    {
        $message = Message::create([
            'user_id' => $user->id,
            'type' => 'email',
            'content' => $content,
            'status' => 'pending',
        ]);

        SendPlatformMessage::dispatch($message->id);

        return $message;
    }
}
