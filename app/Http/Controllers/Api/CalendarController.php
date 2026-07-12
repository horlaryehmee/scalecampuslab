<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $events = Event::query()
            ->where('status', 'published')
            ->when($request->query('from'), fn ($query, $from) => $query->whereDate('event_date', '>=', $from))
            ->when($request->query('to'), fn ($query, $to) => $query->whereDate('event_date', '<=', $to))
            ->orderBy('event_date')
            ->get()
            ->groupBy(fn (Event $event) => $event->event_date->toDateString())
            ->map(fn ($items) => $items->map(fn (Event $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'start' => $event->event_date->toIso8601String(),
                'location' => $event->location,
                'capacity' => $event->capacity,
                'status' => $event->status,
            ])->values());

        return response()->json($events);
    }
}
