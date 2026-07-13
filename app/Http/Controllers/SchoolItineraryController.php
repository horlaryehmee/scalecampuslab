<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Models\SchoolItineraryItem;
use App\Models\VisitRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SchoolItineraryController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless(in_array($user?->role, ['school', 'high_school'], true), 403);

        $validated = $request->validate([
            'campus_event_id' => ['required', 'integer', 'exists:campus_events,id'],
            'planned_start_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $event = CampusEvent::query()->whereKey($validated['campus_event_id'])->where('status', 'published')->firstOrFail();
        abort_unless($user->school_id, 422, 'Your account must be linked to a school.');
        $visit = VisitRequest::query()
            ->where('campus_event_id', $event->id)
            ->where('school_id', $user->school_id)
            ->whereIn('status', ['approved', 'scheduled'])
            ->firstOrFail();
        $position = (int) SchoolItineraryItem::where('user_id', $user->id)->max('position') + 1;

        SchoolItineraryItem::updateOrCreate(
            ['user_id' => $user->id, 'campus_event_id' => $event->id],
            [
                'position' => $position,
                'visit_request_id' => $visit->id,
                'planned_start_at' => $validated['planned_start_at'] ?? $event->starts_at,
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return back()->with('status', "{$event->title} added to your itinerary.");
    }

    public function update(Request $request, SchoolItineraryItem $itineraryItem): RedirectResponse
    {
        $this->authorizeOwner($request, $itineraryItem);
        $validated = $request->validate([
            'planned_start_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $itineraryItem->update($validated);

        return back()->with('status', 'Itinerary stop updated.');
    }

    public function destroy(Request $request, SchoolItineraryItem $itineraryItem): RedirectResponse
    {
        $this->authorizeOwner($request, $itineraryItem);
        $itineraryItem->delete();
        $this->normalizePositions($request->user()->id);

        return back()->with('status', 'Destination removed from your itinerary.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless(in_array($user?->role, ['school', 'high_school'], true), 403);
        $validated = $request->validate(['item_ids' => ['required', 'array'], 'item_ids.*' => ['integer']]);
        $ownedIds = SchoolItineraryItem::where('user_id', $user->id)->pluck('id')->map(fn ($id) => (int) $id)->all();
        $submitted = array_values(array_unique(array_map('intval', $validated['item_ids'])));
        abort_unless(count($ownedIds) === count($submitted) && empty(array_diff($ownedIds, $submitted)), 403);

        DB::transaction(function () use ($submitted, $user): void {
            foreach ($submitted as $index => $id) {
                SchoolItineraryItem::where('user_id', $user->id)->whereKey($id)->update(['position' => $index + 1]);
            }
        });

        return back()->with('status', 'Itinerary sequence saved.');
    }

    private function authorizeOwner(Request $request, SchoolItineraryItem $item): void
    {
        abort_unless(in_array($request->user()?->role, ['school', 'high_school'], true), 403);
        abort_unless($item->user_id === $request->user()->id, 403);
    }

    private function normalizePositions(int $userId): void
    {
        SchoolItineraryItem::where('user_id', $userId)->orderBy('position')->orderBy('id')->get()
            ->each(fn (SchoolItineraryItem $item, int $index) => $item->update(['position' => $index + 1]));
    }
}
