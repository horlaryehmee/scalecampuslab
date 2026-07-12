<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\PlatformNotification;
use App\Models\TargetSchool;
use App\Models\VisitRequest;
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

        CampusEvent::create($validated + [
            'university_user_id' => $request->user()->id,
            'lifecycle_log' => [$this->lifecycleEntry('created', $request->user()->name)],
        ]);

        return back()->with('status', 'Campus visit event created.');
    }

    public function update(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $this->validatedEvent($request, false);

        if ($this->hasVenueConflict($validated, $event->id)) {
            return back()->withErrors(['venue' => 'This venue already has an overlapping event.'])->withInput();
        }

        $event->update($validated + [
            'lifecycle_log' => $this->appendLifecycle($event, 'updated', $request->user()->name),
        ]);

        return back()->with('status', 'Event updated successfully.');
    }

    public function duplicate(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $copy = $event->replicate([
            'confirmed_seats',
            'created_at',
            'updated_at',
        ]);
        $copy->title = $event->title.' (Copy)';
        $copy->status = 'draft';
        $copy->visibility = 'private';
        $copy->lifecycle_stage = 'planning';
        $copy->starts_at = $event->starts_at?->copy()->addWeek();
        $copy->ends_at = $event->ends_at?->copy()->addWeek();
        $copy->registration_opens_at = $event->registration_opens_at?->copy()->addWeek();
        $copy->registration_closes_at = $event->registration_closes_at?->copy()->addWeek();
        $copy->invited_school_ids = [];
        $copy->lifecycle_log = [$this->lifecycleEntry('duplicated from #'.$event->id, $request->user()->name)];
        $copy->save();

        return back()->with('status', 'Visit program duplicated as a draft.');
    }

    public function inviteSchools(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $request->validate([
            'school_ids' => ['required', 'array', 'min:1'],
            'school_ids.*' => ['integer', 'exists:target_schools,id'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $schoolIds = TargetSchool::query()
            ->whereIn('id', $validated['school_ids'])
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        DB::transaction(function () use ($request, $event, $schoolIds, $validated): void {
            foreach ($schoolIds as $schoolId) {
                VisitRequest::updateOrCreate(
                    [
                        'target_school_id' => $schoolId,
                        'campus_event_id' => $event->id,
                    ],
                    [
                        'requested_by_user_id' => $request->user()->id,
                        'requested_window' => $event->starts_at?->toDateString() ?: now()->addWeek()->toDateString(),
                        'group_size' => min((int) ($event->per_group_capacity ?: 30), (int) $event->capacity),
                        'status' => 'requested',
                        'priority' => 2,
                        'notes' => $validated['message'] ?: 'Invitation sent by '.$request->user()->name,
                    ]
                );
            }

            $event->update([
                'visibility' => $event->visibility === 'public' ? 'public' : 'invite_only',
                'lifecycle_stage' => 'inviting',
                'invited_school_ids' => array_values(array_unique(array_merge($event->invited_school_ids ?: [], $schoolIds))),
                'lifecycle_log' => $this->appendLifecycle($event, 'invited '.count($schoolIds).' school(s)', $request->user()->name),
            ]);
        });

        return back()->with('status', count($schoolIds).' school invitation(s) queued.');
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
            'party_size' => ['required', 'integer', 'min:1', 'max:'.max(1, (int) ($event->per_group_capacity ?: 200))],
        ]);

        if ($event->registration_opens_at && now()->lt($event->registration_opens_at)) {
            return back()->withErrors(['registration' => 'Registration is not open for this visit program yet.']);
        }

        if ($event->registration_closes_at && now()->gt($event->registration_closes_at)) {
            return back()->withErrors(['registration' => 'Registration has closed for this visit program.']);
        }

        if ($request->user()->role === 'student') {
            $validated['registrant_name'] = $validated['registrant_name'] ?: $request->user()->name;
            $validated['registrant_email'] = $validated['registrant_email'] ?: $request->user()->email;
            $validated['party_size'] = 1;
        }

        $registration = DB::transaction(function () use ($request, $event, $validated): EventRegistration {
            $event = CampusEvent::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            $confirmedSeats = (int) $event->registrations()->where('status', 'confirmed')->sum('party_size');
            $registrantConfirmedSeats = (int) $event->registrations()
                ->where('status', 'confirmed')
                ->where('registrant_email', $validated['registrant_email'])
                ->sum('party_size');

            if ($event->per_school_capacity && ($registrantConfirmedSeats + (int) $validated['party_size']) > $event->per_school_capacity) {
                $status = 'waitlisted';
            } else {
                $status = ($confirmedSeats + (int) $validated['party_size']) <= $event->capacity ? 'confirmed' : 'waitlisted';
            }

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
        $request->merge([
            'visibility' => $request->input('visibility', 'public'),
            'lifecycle_stage' => $request->input('lifecycle_stage', $request->input('status') === 'published' ? 'open' : 'planning'),
        ]);

        return $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'starts_at' => ['required', 'date', $isCreating ? 'after:now' : 'nullable'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'venue' => ['required', 'string', 'max:160'],
            'location' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'capacity' => ['required', 'integer', 'min:1', 'max:5000'],
            'per_school_capacity' => ['nullable', 'integer', 'min:1', 'lte:capacity'],
            'per_group_capacity' => ['nullable', 'integer', 'min:1', 'lte:capacity'],
            'status' => ['required', Rule::in(['draft', 'published', 'cancelled'])],
            'visibility' => ['required', Rule::in(['public', 'invite_only', 'private'])],
            'registration_opens_at' => ['nullable', 'date'],
            'registration_closes_at' => ['nullable', 'date', 'after_or_equal:registration_opens_at', 'before_or_equal:starts_at'],
            'lifecycle_stage' => ['required', Rule::in(['planning', 'inviting', 'open', 'full', 'in_progress', 'completed', 'archived'])],
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

    private function lifecycleEntry(string $action, ?string $actor): array
    {
        return [
            'action' => $action,
            'actor' => $actor ?: 'System',
            'at' => now()->toIso8601String(),
        ];
    }

    private function appendLifecycle(CampusEvent $event, string $action, ?string $actor): array
    {
        $log = $event->lifecycle_log ?: [];
        $log[] = $this->lifecycleEntry($action, $actor);

        return array_slice($log, -25);
    }
}
