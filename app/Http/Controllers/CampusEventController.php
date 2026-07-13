<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Models\EventItineraryItem;
use App\Models\EventRegistration;
use App\Models\PlatformNotification;
use App\Models\SystemLog;
use App\Models\TargetSchool;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CampusEventController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $this->validatedEvent($request, true);

        if ($this->hasVenueConflict($validated)) {
            return back()->withErrors(['venue' => 'This venue already has an event at that start time.'])->withInput();
        }

        $event = CampusEvent::create($validated + [
            'university_user_id' => $request->user()->id,
            'external_calendar_uid' => (string) Str::uuid(),
            'lifecycle_log' => [$this->lifecycleEntry('created', $request->user()->name)],
        ]);

        $this->createRecurringEvents($request, $event, $validated);
        $this->logProgramActivity($request, 'program.created', $event, [
            'status' => $event->status,
            'visibility' => $event->visibility,
            'starts_at' => $event->starts_at?->toIso8601String(),
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

        $scheduleChanged = $event->starts_at?->ne($validated['starts_at']) || (string) $event->ends_at !== (string) ($validated['ends_at'] ?? null) || $event->venue !== $validated['venue'];

        $event->update($validated + [
            'last_schedule_change_at' => $scheduleChanged ? now() : $event->last_schedule_change_at,
            'external_calendar_uid' => $event->external_calendar_uid ?: (string) Str::uuid(),
            'lifecycle_log' => $this->appendLifecycle($event, 'updated', $request->user()->name),
        ]);

        if ($scheduleChanged) {
            $this->queueScheduleChangeNotifications($event);
        }

        $this->logProgramActivity($request, 'program.updated', $event, [
            'status' => $event->status,
            'visibility' => $event->visibility,
            'schedule_changed' => $scheduleChanged,
        ]);

        return back()->with('status', 'Event updated successfully.');
    }

    public function updateStatus(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['draft', 'published', 'cancelled'])],
        ]);

        if ($event->status === 'cancelled' && $validated['status'] !== 'cancelled') {
            return back()->withErrors(['status' => 'Cancelled visit programs cannot be reopened. Duplicate the program to create a new schedule.']);
        }

        if ($event->status === $validated['status']) {
            return back()->with('status', 'Visit program status is already up to date.');
        }

        $previousStatus = $event->status;
        $event->update([
            'status' => $validated['status'],
            'lifecycle_stage' => match ($validated['status']) {
                'published' => 'open',
                'cancelled' => 'archived',
                default => 'planning',
            },
            'lifecycle_log' => $this->appendLifecycle($event, 'status changed from '.$previousStatus.' to '.$validated['status'], $request->user()->name),
        ]);

        $this->queueStatusChangeNotifications($event, $previousStatus);
        $this->logProgramActivity($request, 'program.status_updated', $event, [
            'previous_status' => $previousStatus,
            'status' => $event->status,
        ]);

        return back()->with('status', 'Visit program status updated to '.$event->status.'.');
    }

    public function schedule(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'venue' => ['required', 'string', 'max:160'],
            'location' => ['nullable', 'string', 'max:180'],
        ]);

        $payload = array_merge($event->only([
            'title',
            'description',
            'capacity',
            'per_school_capacity',
            'per_group_capacity',
            'status',
            'visibility',
            'registration_opens_at',
            'registration_closes_at',
            'lifecycle_stage',
        ]), $validated);

        if ($this->hasVenueConflict($payload, $event->id)) {
            return back()->withErrors(['schedule' => 'This time slot conflicts with another visit at the same venue.']);
        }

        $event->update($validated + [
            'last_schedule_change_at' => now(),
            'external_calendar_uid' => $event->external_calendar_uid ?: (string) Str::uuid(),
            'lifecycle_log' => $this->appendLifecycle($event, 'rescheduled', $request->user()->name),
        ]);

        $this->queueScheduleChangeNotifications($event);
        $this->logProgramActivity($request, 'program.rescheduled', $event, [
            'starts_at' => $event->starts_at?->toIso8601String(),
            'ends_at' => $event->ends_at?->toIso8601String(),
            'venue' => $event->venue,
        ]);

        return back()->with('status', 'Visit schedule updated and reminders queued.');
    }

    public function calendarExport(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $events = CampusEvent::query()
            ->where('university_user_id', $request->user()->id)
            ->where('status', '!=', 'cancelled')
            ->orderBy('starts_at')
            ->get();

        return response()->streamDownload(function () use ($events): void {
            echo "BEGIN:VCALENDAR\r\n";
            echo "VERSION:2.0\r\n";
            echo "PRODID:-//ScaleCampusLab//Campus Visits//EN\r\n";
            foreach ($events as $event) {
                echo "BEGIN:VEVENT\r\n";
                echo 'UID:'.($event->external_calendar_uid ?: 'campus-event-'.$event->id.'@scalecampuslab')."\r\n";
                echo 'DTSTAMP:'.now()->utc()->format('Ymd\THis\Z')."\r\n";
                echo 'DTSTART:'.$event->starts_at?->copy()->utc()->format('Ymd\THis\Z')."\r\n";
                echo 'DTEND:'.($event->ends_at ?: $event->starts_at?->copy()->addHour())->copy()->utc()->format('Ymd\THis\Z')."\r\n";
                echo 'SUMMARY:'.$this->icsEscape($event->title)."\r\n";
                echo 'LOCATION:'.$this->icsEscape(trim(($event->venue ?: '').' '.($event->location ?: '')))."\r\n";
                echo 'DESCRIPTION:'.$this->icsEscape($event->description ?: 'Campus visit program')."\r\n";
                echo "END:VEVENT\r\n";
            }
            echo "END:VCALENDAR\r\n";
        }, 'scalecampuslab-university-calendar.ics', ['Content-Type' => 'text/calendar']);
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
        $copy->recurrence_parent_id = null;
        $copy->recurrence_rule = 'none';
        $copy->recurrence_count = 1;
        $copy->external_calendar_uid = (string) Str::uuid();
        $copy->last_schedule_change_at = null;
        $copy->lifecycle_log = [$this->lifecycleEntry('duplicated from #'.$event->id, $request->user()->name)];
        $copy->save();

        $this->logProgramActivity($request, 'program.duplicated', $copy, [
            'source_program_id' => $event->id,
        ]);

        return back()->with('status', 'Visit program duplicated as a draft.');
    }

    public function inviteSchools(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $request->validate([
            'school_ids' => ['required', 'array', 'min:1'],
            'school_ids.*' => ['integer'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $requestedSchoolIds = collect($validated['school_ids'])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
        $schoolIds = TargetSchool::query()
            ->whereIn('id', $requestedSchoolIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if (count($schoolIds) !== $requestedSchoolIds->count()) {
            throw ValidationException::withMessages([
                'school_ids' => 'One or more selected schools are unavailable.',
            ]);
        }

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

        $this->logProgramActivity($request, 'program.schools_invited', $event, [
            'school_ids' => $schoolIds,
            'school_count' => count($schoolIds),
        ]);

        return back()->with('status', count($schoolIds).' school invitation(s) queued.');
    }

    public function destroy(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);
        $hasWorkflowData = VisitRequest::query()->where('campus_event_id', $event->id)->exists()
            || EventRegistration::query()->where('campus_event_id', $event->id)->exists()
            || EventItineraryItem::query()->where('campus_event_id', $event->id)->exists();
        abort_if($hasWorkflowData, 409, 'Cancel events with visit activity instead of deleting them.');

        $this->logProgramActivity($request, 'program.deleted', $event, [
            'title' => $event->title,
            'starts_at' => $event->starts_at?->toIso8601String(),
        ]);
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
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer', 'exists:users,id'],
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
            $studentIds = collect($validated['student_ids'] ?? [])->map(fn ($id) => (int) $id)->unique()->values();
            if ($request->user()->isSchool() && $studentIds->isNotEmpty()) {
                $selectedStudentCount = User::query()
                    ->where('role', 'student')
                    ->where('school_id', $request->user()->school_id)
                    ->whereIn('id', $studentIds)
                    ->count();
                if ($selectedStudentCount > 0) {
                    $validated['party_size'] = $selectedStudentCount;
                }
            }
            unset($validated['student_ids']);

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

            if ($request->user()->isSchool()) {
                $students = User::query()
                    ->where('role', 'student')
                    ->where('school_id', $request->user()->school_id)
                    ->when($studentIds->isNotEmpty(), fn ($query) => $query->whereIn('id', $studentIds))
                    ->when($studentIds->isEmpty(), fn ($query) => $query->whereJsonContains('assigned_events', $event->title))
                    ->limit((int) $registration->party_size)
                    ->get();

                foreach ($students as $student) {
                    $registration->students()->updateOrCreate(
                        ['email' => $student->email],
                        [
                            'user_id' => $student->id,
                            'name' => $student->name,
                            'student_identifier' => $student->student_identifier,
                            'grade_level' => $student->grade_level,
                            'interest_major' => $student->interest_major,
                            'status' => $status,
                            'consent_status' => 'pending',
                            'is_minor' => true,
                        ]
                    );
                }
            }

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
            'recurrence_rule' => $request->input('recurrence_rule', 'none'),
            'recurrence_count' => $request->input('recurrence_count', 1),
            'reminders_enabled' => $request->boolean('reminders_enabled', true),
            'reminder_days_before' => $request->input('reminder_days_before', 7),
            'reminder_time' => $request->input('reminder_time', '09:00'),
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
            'recurrence_rule' => ['nullable', Rule::in(['none', 'daily', 'weekly', 'monthly'])],
            'recurrence_count' => ['nullable', 'integer', 'min:1', 'max:24'],
            'reminders_enabled' => ['nullable', 'boolean'],
            'reminder_days_before' => ['required', 'integer', 'min:0', 'max:60'],
            'reminder_time' => ['required', 'date_format:H:i'],
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

    private function createRecurringEvents(Request $request, CampusEvent $event, array $validated): void
    {
        $rule = $validated['recurrence_rule'] ?? 'none';
        $count = (int) ($validated['recurrence_count'] ?? 1);

        if ($rule === 'none' || $count <= 1) {
            return;
        }

        for ($index = 2; $index <= $count; $index++) {
            $startsAt = match ($rule) {
                'daily' => $event->starts_at?->copy()->addDays($index - 1),
                'weekly' => $event->starts_at?->copy()->addWeeks($index - 1),
                'monthly' => $event->starts_at?->copy()->addMonthsNoOverflow($index - 1),
                default => null,
            };
            $endsAt = match ($rule) {
                'daily' => $event->ends_at?->copy()->addDays($index - 1),
                'weekly' => $event->ends_at?->copy()->addWeeks($index - 1),
                'monthly' => $event->ends_at?->copy()->addMonthsNoOverflow($index - 1),
                default => null,
            };

            if (! $startsAt || $this->hasVenueConflict(array_merge($validated, ['starts_at' => $startsAt, 'ends_at' => $endsAt]), $event->id)) {
                continue;
            }

            CampusEvent::create(array_merge($validated, [
                'university_user_id' => $request->user()->id,
                'recurrence_parent_id' => $event->id,
                'recurrence_rule' => 'none',
                'recurrence_count' => 1,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'external_calendar_uid' => (string) Str::uuid(),
                'lifecycle_log' => [$this->lifecycleEntry('recurring occurrence from #'.$event->id, $request->user()->name)],
            ]));
        }
    }

    private function queueScheduleChangeNotifications(CampusEvent $event): void
    {
        $event->loadMissing('registrations');

        foreach ($event->registrations as $registration) {
            PlatformNotification::create([
                'user_id' => $registration->user_id,
                'campus_event_id' => $event->id,
                'notification_type' => 'schedule_update',
                'target_type' => 'attendee',
                'target_id' => $registration->id,
                'channel' => 'email',
                'subject' => 'Visit schedule updated',
                'body' => "{$event->title} is now scheduled for ".$event->starts_at?->format('M j, Y g:i A')." at {$event->venue}.",
                'status' => 'queued',
                'scheduled_for' => now(),
                'metadata' => ['source' => 'schedule_change'],
            ]);
        }
    }

    private function queueStatusChangeNotifications(CampusEvent $event, string $previousStatus): void
    {
        $event->loadMissing('registrations');

        foreach ($event->registrations->whereIn('status', ['confirmed', 'waitlisted']) as $registration) {
            PlatformNotification::create([
                'user_id' => $registration->user_id,
                'campus_event_id' => $event->id,
                'notification_type' => 'event_status_update',
                'target_type' => 'event_registration',
                'target_id' => $registration->id,
                'channel' => 'email',
                'subject' => 'Visit program '.$event->status,
                'body' => $event->title.' changed from '.$previousStatus.' to '.$event->status.'.',
                'status' => 'queued',
                'scheduled_for' => now(),
                'metadata' => [
                    'registration_id' => $registration->id,
                    'registrant_email' => $registration->registrant_email,
                    'registrant_name' => $registration->registrant_name,
                ],
            ]);
        }
    }

    private function icsEscape(?string $value): string
    {
        return str_replace(['\\', "\n", "\r", ',', ';'], ['\\\\', '\\n', '', '\\,', '\\;'], (string) $value);
    }

    private function logProgramActivity(Request $request, string $action, CampusEvent $event, array $metadata = []): void
    {
        $user = $request->user();
        if (! $user) {
            return;
        }

        SystemLog::create([
            'user_id' => $user->id,
            'action' => $action,
            'subject_type' => CampusEvent::class,
            'subject_id' => $event->id,
            'metadata' => array_merge([
                'university_user_id' => $event->university_user_id,
                'program_title' => $event->title,
                'ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 180, ''),
            ], $metadata),
        ]);
    }
}
