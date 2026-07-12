<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class MockSmsService
{
    public function send(string $recipient, string $content): void
    {
        Log::info('Mock SMS sent', [
            'recipient' => $recipient,
            'content' => $content,
        ]);
    }
}
