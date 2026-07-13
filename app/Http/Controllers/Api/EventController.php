<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\SystemLog;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $events = Event::query()
            ->with('university:id,name,email')
            ->withCount([
                'registrations as confirmed_count' => fn ($query) => $query->where('status', 'confirmed'),
                'registrations as waitlisted_count' => fn ($query) => $query->where('status', 'waitlisted'),
            ])
            ->when($request->user()->role === 'university', fn ($query) => $query->where('university_id', $request->user()->id))
            ->when($request->user()->role === 'student' || $request->user()->isSchool(), fn ($query) => $query->where('status', 'published'))
            ->latest('event_date')
            ->paginate(20);

        return response()->json($events);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateEvent($request);
        $universityId = $request->user()->role === 'admin'
            ? (int) ($validated['university_id'] ?? 0)
            : $request->user()->id;
        abort_unless($universityId, 422, 'university_id is required when an administrator creates an event.');
        unset($validated['university_id']);
        $this->ensureNoDoubleBooking($validated['location'], $validated['event_date']);

        $event = Event::create($validated + [
            'university_id' => $universityId,
            'status' => $validated['status'] ?? 'draft',
        ]);
        $this->log($request, 'event.created', $event, ['title' => $event->title, 'status' => $event->status]);

        return response()->json($event, 201);
    }

    public function show(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $event->status === 'published'
            || $user->role === 'admin'
            || ($user->role === 'university' && $event->university_id === $user->id),
            403
        );

        return response()->json($event->load('university:id,name,email'));
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $this->authorizeUniversityEvent($request, $event);
        $validated = $this->validateEvent($request, updating: true);
        unset($validated['university_id']);

        $this->ensureNoDoubleBooking(
            $validated['location'] ?? $event->location,
            $validated['event_date'] ?? $event->event_date->toDateTimeString(),
            $event->id
        );

        $event->update($validated);
        $this->log($request, 'event.updated', $event, ['title' => $event->title, 'status' => $event->status]);

        $this->notifyEventParticipants($event, "Event updated: {$event->title}.");

        return response()->json($event);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->authorizeUniversityEvent($request, $event);
        $this->log($request, 'event.deleted', $event, ['title' => $event->title]);
        $event->delete();

        return response()->json(['message' => 'Event deleted.']);
    }

    public function publish(Request $request, Event $event): JsonResponse
    {
        $this->authorizeUniversityEvent($request, $event);
        $event->update(['status' => 'published']);
        $this->log($request, 'event.published', $event, ['title' => $event->title]);

        return response()->json($event);
    }

    public function unpublish(Request $request, Event $event): JsonResponse
    {
        $this->authorizeUniversityEvent($request, $event);
        $event->update(['status' => 'draft']);
        $this->log($request, 'event.unpublished', $event, ['title' => $event->title]);

        return response()->json($event);
    }

    public function cancel(Request $request, Event $event): JsonResponse
    {
        $this->authorizeUniversityEvent($request, $event);
        $event->update(['status' => 'cancelled']);
        $this->log($request, 'event.cancelled', $event, ['title' => $event->title]);

        $this->notifyEventParticipants($event, "Event cancelled: {$event->title}.");

        return response()->json($event);
    }

    public function reminders(Request $request, Event $event): JsonResponse
    {
        $this->authorizeUniversityEvent($request, $event);

        $count = 0;

        $event->registrations()
            ->where('status', 'confirmed')
            ->with('student')
            ->get()
            ->each(function ($registration) use ($event, &$count): void {
                $this->notifications->queue($registration->student, "Reminder: {$event->title} is scheduled for {$event->event_date->toDayDateTimeString()}.");
                $count++;
            });

        return response()->json(['queued' => $count]);
    }

    private function notifyEventParticipants(Event $event, string $content): void
    {
        $notifiedUserIds = [];

        $event->registrations()
            ->whereIn('status', ['confirmed', 'waitlisted'])
            ->with(['student', 'school.users'])
            ->get()
            ->each(function ($registration) use ($content, &$notifiedUserIds): void {
                $users = collect([$registration->student])
                    ->merge($registration->school?->users ?? []);

                foreach ($users as $user) {
                    if (! $user || in_array($user->id, $notifiedUserIds, true)) {
                        continue;
                    }

                    $this->notifications->queue($user, $content);
                    $notifiedUserIds[] = $user->id;
                }
            });
    }

    private function validateEvent(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'university_id' => ['sometimes', Rule::exists('users', 'id')->where('role', 'university')],
            'title' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'event_date' => [$updating ? 'sometimes' : 'required', 'date'],
            'capacity' => [$updating ? 'sometimes' : 'required', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'cancelled'])],
        ]);
    }

    private function ensureNoDoubleBooking(string $location, string $eventDate, ?int $ignoreEventId = null): void
    {
        $conflict = Event::query()
            ->where('location', $location)
            ->where('event_date', $eventDate)
            ->when($ignoreEventId, fn ($query) => $query->whereKeyNot($ignoreEventId))
            ->exists();

        abort_if($conflict, 422, 'An event already exists at this location and time.');
    }

    private function authorizeUniversityEvent(Request $request, Event $event): void
    {
        abort_unless($request->user()->role === 'admin' || $event->university_id === $request->user()->id, 403);
    }

    private function log(Request $request, string $action, Event $event, array $metadata = []): void
    {
        SystemLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => Event::class,
            'subject_id' => $event->id,
            'metadata' => $metadata,
        ]);
    }
}
