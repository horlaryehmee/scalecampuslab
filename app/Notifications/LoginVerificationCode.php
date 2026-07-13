<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class LoginVerificationCode extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $code,
        public readonly Carbon $expiresAt,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your ScaleCampusLab sign-in code')
            ->greeting('Confirm your sign-in')
            ->line('Use this one-time verification code to finish signing in:')
            ->line($this->code)
            ->line("This code expires at {$this->expiresAt->timezone(config('app.timezone'))->format('H:i T')} and can only be used once.")
            ->line('If you did not attempt to sign in, you can ignore this email. Your password has not been exposed.');
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'expires_at' => $this->expiresAt->toIso8601String(),
        ];
    }
}
