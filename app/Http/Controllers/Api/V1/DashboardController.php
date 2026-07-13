<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\PlatformNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends WorkflowController
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $upcoming = $this->workflow->visibleEvents($user)
            ->where('status', 'published')
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->limit(6)
            ->get();
        $pendingVisits = $this->workflow->visibleVisits($user)
            ->where('status', 'requested')
            ->latest()
            ->limit(6)
            ->get();
        $unreadNotifications = PlatformNotification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return $this->data([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $this->workflow->normalizedRole($user),
                'school_id' => $user->school_id,
            ],
            'metrics' => $this->workflow->metrics($user),
            'upcoming_events' => $this->workflow->eventPayloads($upcoming)->all(),
            'pending_visits' => $this->workflow->visitPayloads($pendingVisits)->all(),
            'queued_notifications' => $unreadNotifications,
            'unread_notifications' => $unreadNotifications,
            'status' => 'current',
            'updated_at' => now()->toIso8601String(),
        ]);
    }
}
