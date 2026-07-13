<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Message;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $messages = Message::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(25)
            ->get();

        return response()->json($messages);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_id' => ['required', 'integer', 'exists:events,id'],
            'type' => ['required', 'in:email'],
            'content' => ['required', 'string', 'max:5000'],
        ]);

        $event = Event::query()->with(['registrations.student'])->findOrFail($validated['event_id']);
        abort_unless($request->user()->role === 'admin' || $event->university_id === $request->user()->id, 403);

        $queued = 0;

        foreach ($event->registrations->whereIn('status', ['confirmed', 'waitlisted']) as $registration) {
            $this->notifications->queue($registration->student, $validated['content'], $validated['type']);
            $queued++;
        }

        return response()->json(['queued' => $queued], 201);
    }
}
