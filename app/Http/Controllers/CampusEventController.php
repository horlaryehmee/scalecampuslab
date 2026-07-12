<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\PlatformNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CampusEventController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $this->validatedEvent($request, true);

        if ($this->hasVenueConflict($validated)) {
            return back()->withErrors(['venue' => 'This venue already has an event at that start time.'])->withInput();
        }

        CampusEvent::create($validated + ['university_user_id' => $request->user()->id]);

        return back()->with('status', 'Campus visit event created.');
    }

    public function update(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $this->validatedEvent($request, false);

        if ($this->hasVenueConflict($validated, $event->id)) {
            return back()->withErrors(['venue' => 'This venue already has an overlapping event.'])->withInput();
        }

        $event->update($validated);

        return back()->with('status', 'Event updated successfully.');
    }

    public function destroy(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $event->delete();

        return back()->with('status', 'Event deleted successfully.');
    }

    public function register(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless(in_array($request->user()?->role, ['student', 'school', 'high_school'], true), 403);
        abort_unless($event->status === 'published', 404);

        $validated = $request->validate([
            'registrant_name' => [$request->user()->role === 'student' ? 'nullable' : 'required', 'string', 'max:160'],
            'registrant_email' => [$request->user()->role === 'student' ? 'nullable' : 'required', 'email:rfc', 'max:160'],
            'party_size' => ['required', 'integer', 'min:1', 'max:200'],
        ]);

        if ($request->user()->role === 'student') {
            $validated['registrant_name'] = $validated['registrant_name'] ?: $request->user()->name;
            $validated['registrant_email'] = $validated['registrant_email'] ?: $request->user()->email;
            $validated['party_size'] = 1;
        }

        $registration = DB::transaction(function () use ($request, $event, $validated): EventRegistration {
            $event = CampusEvent::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            $confirmedSeats = (int) $event->registrations()->where('status', 'confirmed')->sum('party_size');
            $status = ($confirmedSeats + (int) $validated['party_size']) <= $event->capacity ? 'confirmed' : 'waitlisted';

            $registration = EventRegistration::updateOrCreate(
                [
                    'campus_event_id' => $event->id,
                    'registrant_email' => $validated['registrant_email'],
                ],
                $validated + [
                    'user_id' => $request->user()->id,
                    'registrant_type' => $request->user()->isSchool() ? 'school_group' : 'student',
                    'status' => $status,
                ]
            );

            PlatformNotification::create([
                'user_id' => $request->user()->id,
                'campus_event_id' => $event->id,
                'channel' => 'email',
                'subject' => $status === 'confirmed' ? 'Registration confirmed' : 'Added to waitlist',
                'body' => "Your registration for {$event->title} is {$status}.",
                'status' => 'queued',
            ]);

            return $registration;
        });

        return back()->with('status', $registration->status === 'confirmed'
            ? 'Registration confirmed.'
            : 'The event is full, so this registration was added to the waitlist.');
    }

    private function validatedEvent(Request $request, bool $isCreating): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'starts_at' => ['required', 'date', $isCreating ? 'after:now' : 'nullable'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'venue' => ['required', 'string', 'max:160'],
            'location' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'capacity' => ['required', 'integer', 'min:1', 'max:5000'],
            'status' => ['required', Rule::in(['draft', 'published', 'cancelled'])],
        ]);
    }

    private function hasVenueConflict(array $event, ?int $ignoreId = null): bool
    {
        $query = CampusEvent::query()
            ->where('venue', $event['venue'])
            ->where('status', '!=', 'cancelled')
            ->when($ignoreId, fn ($builder) => $builder->whereKeyNot($ignoreId));

        if (empty($event['ends_at'])) {
            return $query->where('starts_at', $event['starts_at'])->exists();
        }

        return $query->where(function ($builder) use ($event): void {
            $builder->where('starts_at', $event['starts_at'])
                ->orWhere(function ($overlap) use ($event): void {
                    $overlap->whereNotNull('ends_at')
                        ->where('starts_at', '<', $event['ends_at'])
                        ->where('ends_at', '>', $event['starts_at']);
                });
        })->exists();
    }
}
