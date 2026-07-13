<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\PlatformNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends WorkflowController
{
    public function index(Request $request): JsonResponse
    {
        $notifications = PlatformNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(min(100, max(1, $request->integer('per_page', 30))));

        return $this->data(
            collect($notifications->items())->map(fn (PlatformNotification $notification) => [
                'id' => $notification->id,
                'campus_event_id' => $notification->campus_event_id,
                'type' => $notification->notification_type,
                'subject' => $notification->subject,
                'body' => $notification->body,
                'status' => $notification->status,
                'metadata' => $notification->metadata ?: [],
                'read_at' => $notification->read_at?->toIso8601String(),
                'unread' => $notification->read_at === null,
                'created_at' => $notification->created_at?->toIso8601String(),
                'updated_at' => $notification->updated_at?->toIso8601String(),
            ])->all(),
            meta: [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
            ],
        );
    }

    public function markRead(Request $request, PlatformNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $notification->update(['read_at' => $notification->read_at ?: now()]);

        return $this->data([
            'id' => $notification->id,
            'read_at' => $notification->read_at?->toIso8601String(),
            'unread' => false,
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = PlatformNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);

        return $this->data(['updated' => $updated]);
    }
}
