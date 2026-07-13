<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CampusEvent;
use App\Models\EventItineraryItem;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ItineraryController extends WorkflowController
{
    public function index(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        abort_unless($this->workflow->canViewItinerary($request->user(), $campusEvent), 403);

        $items = EventItineraryItem::query()
            ->where('campus_event_id', $campusEvent->id)
            ->when($this->workflow->normalizedRole($request->user()) === 'school', function ($query) use ($request): void {
                $visitIds = VisitRequest::query()
                    ->where('school_id', $request->user()->school_id)
                    ->whereIn('status', ['approved', 'scheduled'])
                    ->pluck('id');
                $query->where(fn ($nested) => $nested->whereNull('visit_request_id')->orWhereIn('visit_request_id', $visitIds));
            })
            ->when($this->workflow->normalizedRole($request->user()) === 'student', function ($query) use ($request, $campusEvent): void {
                $visitIds = DB::table('event_registrations')
                    ->where('campus_event_id', $campusEvent->id)
                    ->where(function ($nested) use ($request): void {
                        $nested->where('user_id', $request->user()->id)
                            ->orWhereIn('id', DB::table('event_registration_students')
                                ->where('user_id', $request->user()->id)
                                ->select('event_registration_id'));
                    })
                    ->pluck('visit_request_id')
                    ->filter();
                $query->where(fn ($nested) => $nested->whereNull('visit_request_id')->orWhereIn('visit_request_id', $visitIds));
            })
            ->orderBy('position')
            ->orderBy('starts_at')
            ->get();

        return $this->data(
            $items->map(fn (EventItineraryItem $item) => $this->workflow->itineraryPayload($item))->all(),
            meta: ['event_status' => $campusEvent->status, 'event_updated_at' => $campusEvent->updated_at?->toIso8601String()],
        );
    }

    public function store(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);
        abort_if($campusEvent->status === 'cancelled', 409, 'Cancelled events cannot be scheduled.');
        $validated = $this->validateItem($request);
        $this->ensureVisitBelongsToEvent($validated['visit_request_id'] ?? null, $campusEvent);

        $item = DB::transaction(function () use ($validated, $campusEvent, $actor): EventItineraryItem {
            $position = EventItineraryItem::query()->where('campus_event_id', $campusEvent->id)->max('position') + 1;
            $item = EventItineraryItem::create($validated + [
                'campus_event_id' => $campusEvent->id,
                'created_by_user_id' => $actor->id,
                'position' => $position,
            ]);
            $this->notifyItineraryMutation($campusEvent, $actor, $item, 'created');

            return $item;
        });

        return $this->data($this->workflow->itineraryPayload($item), 201);
    }

    public function update(
        Request $request,
        CampusEvent $campusEvent,
        EventItineraryItem $itineraryItem,
    ): JsonResponse {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);
        abort_unless($itineraryItem->campus_event_id === $campusEvent->id, 404);
        abort_if($campusEvent->status === 'cancelled', 409, 'Cancelled events cannot be scheduled.');
        $validated = $this->validateItem($request, true);
        abort_if(
            array_key_exists('visit_request_id', $validated)
            && $validated['visit_request_id'] !== $itineraryItem->visit_request_id,
            422,
            'An itinerary item cannot be moved to a different visit scope.'
        );
        $this->ensureVisitBelongsToEvent($validated['visit_request_id'] ?? $itineraryItem->visit_request_id, $campusEvent);
        $startsAt = Carbon::parse($validated['starts_at'] ?? $itineraryItem->starts_at);
        $endsAt = array_key_exists('ends_at', $validated)
            ? ($validated['ends_at'] ? Carbon::parse($validated['ends_at']) : null)
            : $itineraryItem->ends_at;
        abort_if($endsAt && $endsAt->lte($startsAt), 422, 'ends_at must be after starts_at.');

        DB::transaction(function () use ($itineraryItem, $validated, $campusEvent, $actor): void {
            $itineraryItem->update($validated);
            $this->notifyItineraryMutation($campusEvent, $actor, $itineraryItem, 'updated');
        });

        return $this->data($this->workflow->itineraryPayload($itineraryItem->fresh()));
    }

    public function destroy(
        Request $request,
        CampusEvent $campusEvent,
        EventItineraryItem $itineraryItem,
    ): JsonResponse {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);
        abort_unless($itineraryItem->campus_event_id === $campusEvent->id, 404);
        $payload = $this->workflow->itineraryPayload($itineraryItem);

        DB::transaction(function () use ($itineraryItem, $campusEvent, $actor): void {
            $this->notifyItineraryMutation($campusEvent, $actor, $itineraryItem, 'removed');
            $itineraryItem->delete();
        });

        return $this->data(['deleted' => true, 'item' => $payload]);
    }

    public function reorder(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);
        $validated = $request->validate([
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => ['integer', 'distinct'],
        ]);

        $items = EventItineraryItem::query()
            ->where('campus_event_id', $campusEvent->id)
            ->whereIn('id', $validated['item_ids'])
            ->get()
            ->keyBy('id');
        abort_unless($items->count() === count($validated['item_ids']), 422, 'Every itinerary item must belong to this event.');
        abort_unless(
            EventItineraryItem::query()->where('campus_event_id', $campusEvent->id)->count() === count($validated['item_ids']),
            422,
            'item_ids must contain the complete event itinerary.'
        );

        DB::transaction(function () use ($validated, $items, $campusEvent, $actor): void {
            $changedItems = collect();
            foreach ($validated['item_ids'] as $index => $id) {
                $newPosition = $index + 1;
                if ((int) $items[$id]->position !== $newPosition) {
                    $changedItems->push($items[$id]);
                    $items[$id]->update(['position' => $newPosition]);
                }
            }

            if ($changedItems->contains(fn (EventItineraryItem $item) => $item->visit_request_id === null)) {
                $this->workflow->notifyUsers(
                    $this->workflow->affectedUsersForEvent($campusEvent)->push($actor),
                    'Visit itinerary reordered',
                    "The shared itinerary for {$campusEvent->title} was reordered.",
                    'itinerary.reordered',
                    $campusEvent,
                    CampusEvent::class,
                    $campusEvent->id,
                );
            }

            foreach ($changedItems->pluck('visit_request_id')->filter()->unique() as $visitId) {
                $visit = VisitRequest::find($visitId);
                if ($visit) {
                    $this->workflow->notifyUsers(
                        $this->workflow->affectedUsersForVisit($visit)->push($actor),
                        'Visit itinerary reordered',
                        "Your itinerary for {$campusEvent->title} was reordered.",
                        'itinerary.reordered',
                        $campusEvent,
                        VisitRequest::class,
                        $visit->id,
                        ['visit_request_id' => $visit->id],
                    );
                }
            }
        });

        $ordered = EventItineraryItem::query()->where('campus_event_id', $campusEvent->id)->orderBy('position')->get();

        return $this->data($ordered->map(fn (EventItineraryItem $item) => $this->workflow->itineraryPayload($item))->all());
    }

    private function validateItem(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'visit_request_id' => ['nullable', 'integer', 'exists:visit_requests,id'],
            'title' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'starts_at' => [$updating ? 'sometimes' : 'required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function ensureVisitBelongsToEvent(?int $visitRequestId, CampusEvent $event): void
    {
        if (! $visitRequestId) {
            return;
        }

        abort_unless(
            VisitRequest::query()
                ->whereKey($visitRequestId)
                ->where('campus_event_id', $event->id)
                ->whereNotNull('school_id')
                ->exists(),
            422,
            'visit_request_id must belong to this campus event.'
        );
    }

    private function notifyItineraryMutation(
        CampusEvent $event,
        User $actor,
        EventItineraryItem $item,
        string $verb,
    ): void {
        $recipients = $item->visit_request_id
            ? $this->workflow->affectedUsersForVisit(VisitRequest::findOrFail($item->visit_request_id))
            : $this->workflow->affectedUsersForEvent($event);
        $this->workflow->notifyUsers(
            $recipients->push($actor),
            'Visit itinerary '.$verb,
            "{$item->title} was {$verb} for {$event->title}.",
            'itinerary.'.$verb,
            $event,
            EventItineraryItem::class,
            $item->id,
            ['visit_request_id' => $item->visit_request_id],
        );
    }
}
