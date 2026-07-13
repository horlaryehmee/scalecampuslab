<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CampusEvent;
use App\Models\EventItineraryItem;
use App\Models\EventRegistration;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CampusEventController extends WorkflowController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = $this->workflow->visibleEvents($user)
            ->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')))
            ->when($request->filled('q'), function ($builder) use ($request): void {
                $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $request->string('q')->toString()).'%';
                $builder->where(fn ($nested) => $nested
                    ->where('title', 'like', $term)
                    ->orWhere('venue', 'like', $term)
                    ->orWhere('location', 'like', $term));
            })
            ->orderBy('starts_at');

        $events = $query->paginate(min(100, max(1, $request->integer('per_page', 25))));

        return $this->data(
            $this->workflow->eventPayloads($events->items())->all(),
            meta: [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'total' => $events->total(),
            ],
        );
    }

    public function show(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        abort_unless($this->workflow->canViewEvent($request->user(), $campusEvent), 403);

        return $this->data($this->workflow->eventPayload($campusEvent));
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->requireRole($request, 'university', 'admin');
        $validated = $this->validateEvent($request);
        $this->ensureEventInvariants($validated);
        $universityId = $this->workflow->normalizedRole($actor) === 'admin'
            ? (int) ($validated['university_user_id'] ?? 0)
            : $actor->id;

        abort_unless($universityId > 0, 422, 'university_user_id is required when an admin creates an event.');
        abort_unless(
            User::query()->whereKey($universityId)->where('role', 'university')->where('access_status', 'active')->exists(),
            422,
            'The selected university account is unavailable.'
        );

        unset($validated['university_user_id']);
        $this->ensureNoConflict($universityId, $validated['venue'], $validated['starts_at'], $validated['ends_at'] ?? null);

        $event = DB::transaction(function () use ($validated, $universityId, $actor): CampusEvent {
            $event = CampusEvent::create($validated + [
                'university_user_id' => $universityId,
                'status' => 'draft',
                'lifecycle_stage' => 'planning',
            ]);

            $this->workflow->notifyUsers(
                [$actor, $universityId],
                'Campus event created',
                "{$event->title} was created as a draft.",
                'event.created',
                $event,
                CampusEvent::class,
                $event->id,
            );

            return $event;
        });

        return $this->data($this->workflow->eventPayload($event->fresh()), 201);
    }

    public function update(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);
        abort_if($campusEvent->status === 'cancelled', 409, 'Cancelled events cannot be edited.');

        $validated = $this->validateEvent($request, true);
        unset($validated['university_user_id']);
        $this->ensureEventInvariants($validated, $campusEvent);
        $this->ensureCapacityCanBeReduced($campusEvent, $validated);
        $startsAt = Carbon::parse($validated['starts_at'] ?? $campusEvent->starts_at);
        $endsAt = array_key_exists('ends_at', $validated)
            ? ($validated['ends_at'] ? Carbon::parse($validated['ends_at']) : null)
            : $campusEvent->ends_at;
        abort_if($endsAt && $endsAt->lte($startsAt), 422, 'ends_at must be after starts_at.');

        $this->ensureNoConflict(
            $campusEvent->university_user_id,
            $validated['venue'] ?? $campusEvent->venue,
            $startsAt,
            $endsAt,
            $campusEvent->id,
        );

        DB::transaction(function () use ($campusEvent, $validated, $actor): void {
            $campusEvent->update($validated + ['last_schedule_change_at' => now()]);
            $this->workflow->notifyUsers(
                $this->workflow->affectedUsersForEvent($campusEvent)->push($actor),
                'Campus event updated',
                "{$campusEvent->title} has updated schedule or visit details.",
                'event.updated',
                $campusEvent,
                CampusEvent::class,
                $campusEvent->id,
            );
        });

        return $this->data($this->workflow->eventPayload($campusEvent->fresh()));
    }

    public function destroy(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);

        $hasWorkflowData = VisitRequest::query()->where('campus_event_id', $campusEvent->id)->exists()
            || EventRegistration::query()->where('campus_event_id', $campusEvent->id)->exists()
            || EventItineraryItem::query()->where('campus_event_id', $campusEvent->id)->exists();
        abort_if($hasWorkflowData, 409, 'Cancel events with visit activity instead of deleting them.');

        $payload = $this->workflow->eventPayload($campusEvent);
        DB::transaction(function () use ($campusEvent, $actor): void {
            $this->workflow->notifyUsers(
                [$actor, $campusEvent->university_user_id],
                'Campus event deleted',
                "{$campusEvent->title} was deleted.",
                'event.deleted',
                null,
                CampusEvent::class,
                $campusEvent->id,
            );
            $campusEvent->delete();
        });

        return $this->data(['deleted' => true, 'event' => $payload]);
    }

    public function publish(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);
        abort_if($campusEvent->status === 'cancelled', 409, 'Cancelled events cannot be published.');
        abort_unless($campusEvent->starts_at->isFuture(), 422, 'Only future events can be published.');

        DB::transaction(function () use ($campusEvent, $actor): void {
            $campusEvent->update(['status' => 'published', 'lifecycle_stage' => 'open']);
            $this->workflow->notifyUsers(
                $this->workflow->affectedUsersForEvent($campusEvent)->push($actor),
                'Campus event published',
                "{$campusEvent->title} is now open for approved school visits.",
                'event.published',
                $campusEvent,
                CampusEvent::class,
                $campusEvent->id,
            );
        });

        return $this->data($this->workflow->eventPayload($campusEvent->fresh()));
    }

    public function cancel(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);
        abort_if($campusEvent->status === 'cancelled', 409, 'Event is already cancelled.');

        $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        DB::transaction(function () use ($campusEvent, $actor, $request): void {
            $campusEvent->update(['status' => 'cancelled', 'lifecycle_stage' => 'archived']);
            VisitRequest::query()
                ->where('campus_event_id', $campusEvent->id)
                ->where('status', 'requested')
                ->update([
                    'status' => 'declined',
                    'responded_by_user_id' => $actor->id,
                    'responded_at' => now(),
                    'decision_note' => 'The event was cancelled before this request was decided.',
                    'updated_at' => now(),
                ]);
            $this->workflow->notifyUsers(
                $this->workflow->affectedUsersForEvent($campusEvent)->push($actor),
                'Campus event cancelled',
                $request->string('reason')->toString() ?: "{$campusEvent->title} has been cancelled.",
                'event.cancelled',
                $campusEvent,
                CampusEvent::class,
                $campusEvent->id,
            );
        });

        return $this->data($this->workflow->eventPayload($campusEvent->fresh()));
    }

    private function validateEvent(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'university_user_id' => [$updating ? 'sometimes' : 'nullable', 'integer', 'exists:users,id'],
            'title' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'starts_at' => [$updating ? 'sometimes' : 'required', 'date'],
            'ends_at' => ['nullable', 'date'],
            'registration_opens_at' => ['nullable', 'date'],
            'registration_closes_at' => ['nullable', 'date'],
            'venue' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'capacity' => [$updating ? 'sometimes' : 'required', 'integer', 'min:1', 'max:100000'],
            'per_school_capacity' => ['nullable', 'integer', 'min:1'],
            'per_group_capacity' => ['nullable', 'integer', 'min:1'],
            'visibility' => ['sometimes', Rule::in(['public', 'invite_only', 'private'])],
        ]);
    }

    private function ensureNoConflict(
        int $universityId,
        string $venue,
        mixed $startsAt,
        mixed $endsAt,
        ?int $ignoreId = null,
    ): void {
        $start = Carbon::parse($startsAt);
        $end = $endsAt ? Carbon::parse($endsAt) : $start->copy()->addHour();

        $conflict = CampusEvent::query()
            ->where('university_user_id', $universityId)
            ->where('venue', $venue)
            ->where('status', '!=', 'cancelled')
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->where('starts_at', '<', $end)
            ->get(['id', 'starts_at', 'ends_at'])
            ->contains(function (CampusEvent $event) use ($start): bool {
                $existingEnd = $event->ends_at ?: $event->starts_at->copy()->addHour();

                return $existingEnd->gt($start);
            });

        abort_if($conflict, 422, 'This venue is already booked during the selected time.');
    }

    private function ensureEventInvariants(array $attributes, ?CampusEvent $existing = null): void
    {
        $value = static function (string $key) use ($attributes, $existing): mixed {
            if (array_key_exists($key, $attributes)) {
                return $attributes[$key];
            }

            return $existing?->{$key};
        };

        $startsAt = Carbon::parse($value('starts_at'));
        $endsAt = $value('ends_at') ? Carbon::parse($value('ends_at')) : null;
        $opensAt = $value('registration_opens_at') ? Carbon::parse($value('registration_opens_at')) : null;
        $closesAt = $value('registration_closes_at') ? Carbon::parse($value('registration_closes_at')) : null;
        $capacity = (int) $value('capacity');
        $schoolCapacity = $value('per_school_capacity');
        $groupCapacity = $value('per_group_capacity');

        abort_if($endsAt && $endsAt->lte($startsAt), 422, 'ends_at must be after starts_at.');
        abort_if($opensAt && $closesAt && $closesAt->lte($opensAt), 422, 'registration_closes_at must be after registration_opens_at.');
        abort_if($closesAt && $closesAt->gt($startsAt), 422, 'Registration must close before the event starts.');
        abort_if($schoolCapacity && (int) $schoolCapacity > $capacity, 422, 'per_school_capacity cannot exceed capacity.');
        abort_if($groupCapacity && (int) $groupCapacity > $capacity, 422, 'per_group_capacity cannot exceed capacity.');
        abort_if($schoolCapacity && $groupCapacity && (int) $groupCapacity > (int) $schoolCapacity, 422, 'per_group_capacity cannot exceed per_school_capacity.');
    }

    private function ensureCapacityCanBeReduced(CampusEvent $event, array $attributes): void
    {
        if (! array_intersect(['capacity', 'per_school_capacity', 'per_group_capacity'], array_keys($attributes))) {
            return;
        }

        $snapshot = $this->workflow->eventCapacitySnapshot($event->id);
        $capacity = (int) ($attributes['capacity'] ?? $event->capacity);
        $schoolCapacity = array_key_exists('per_school_capacity', $attributes)
            ? $attributes['per_school_capacity']
            : $event->per_school_capacity;
        $groupCapacity = array_key_exists('per_group_capacity', $attributes)
            ? $attributes['per_group_capacity']
            : $event->per_group_capacity;

        abort_if($capacity < $snapshot['registered'], 422, 'capacity cannot be lower than confirmed participation.');
        abort_if($schoolCapacity !== null && (int) $schoolCapacity < $snapshot['largest_school'], 422, 'per_school_capacity cannot be lower than confirmed school participation.');
        abort_if($groupCapacity !== null && (int) $groupCapacity < $snapshot['largest_group'], 422, 'per_group_capacity cannot be lower than a confirmed group size.');
    }
}
