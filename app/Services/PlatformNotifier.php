<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\PlatformNotification;
use App\Models\UniversitySetting;
use App\Models\User;

class PlatformNotifier
{
    /** @param array<string, mixed> $metadata */
    public function notify(User $user, string $subject, string $body, string $type, array $metadata = [], bool $email = true): PlatformNotification
    {
        $email = $email && $this->emailEnabledFor($user);
        [$subject, $body] = $this->resolvedContent($user, $subject, $body, $type, $metadata);

        $notification = PlatformNotification::create([
            'user_id' => $user->id,
            'campus_event_id' => isset($metadata['campus_event_id']) ? (int) $metadata['campus_event_id'] : null,
            'notification_type' => $type,
            'channel' => $email ? 'email' : 'in_app',
            'subject' => $subject,
            'body' => $body,
            'status' => $email ? 'queued' : 'sent',
            'metadata' => $metadata,
            'sent_at' => $email ? null : now(),
        ]);

        return $notification;
    }

    /** @param array<string, mixed> $metadata
     * @return array{0: string, 1: string}
     */
    private function resolvedContent(User $user, string $subject, string $body, string $type, array $metadata): array
    {
        $template = EmailTemplate::query()
            ->where('key', $type)
            ->where('enabled', true)
            ->first();

        if (! $template) {
            return [$subject, $body];
        }

        $variables = [
            'user_name' => $user->name,
            'recipient_name' => $user->name,
            'recipient_email' => $user->email,
            'default_subject' => $subject,
            'default_body' => $body,
        ];

        foreach ($metadata as $key => $value) {
            if (is_scalar($value) || $value === null) {
                $variables[(string) $key] = $value ?? '';
            }
        }

        return [
            $this->renderTemplate($template->subject, $variables),
            $this->renderTemplate($template->body, $variables),
        ];
    }

    /** @param array<string, scalar|null> $variables */
    private function renderTemplate(string $content, array $variables): string
    {
        return preg_replace_callback(
            '/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/',
            fn (array $match): string => array_key_exists($match[1], $variables)
                ? (string) $variables[$match[1]]
                : $match[0],
            $content,
        ) ?? $content;
    }

    private function emailEnabledFor(User $user): bool
    {
        if ($user->isSchool()) {
            $enabled = $user->school()->value('email_notifications');

            return $enabled === null || (bool) $enabled;
        }

        if ($user->role === 'university') {
            $preferences = UniversitySetting::query()
                ->where('university_user_id', $user->id)
                ->value('notification_preferences');

            return (bool) data_get($preferences, 'email_enabled', true);
        }

        return true;
    }
}
