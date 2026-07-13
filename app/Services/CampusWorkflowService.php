<?php

namespace App\Services;

use App\Models\CampusEvent;
use App\Models\EventItineraryItem;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\PlatformNotification;
use App\Models\School;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CampusWorkflowService
{
    public function normalizedRole(User $user): string
    {
        return $user->role === 'high_school' ? 'school' : $user->role;
    }

    public function isSchool(User $user): bool
    {
        return $this->normalizedRole($user) === 'school';
    }

    public function visibleEvents(User $user): Builder
    {
        $query = CampusEvent::query();
        $role = $this->normalizedRole($user);

        if ($role === 'admin') {
            return $query;
        }

        if ($role === 'university') {
            return $query->where('university_user_id', $user->id);
        }

        if ($role === 'school') {
            if (! $user->school_id) {
                return $query->whereRaw('1 = 0');
            }

            return $query->whereIn(
                'id',
                VisitRequest::query()
                    ->where('school_id', $user->school_id)
                    ->whereIn('status', ['approved', 'scheduled'])
                    ->whereNotNull('campus_event_id')
                    ->select('campus_event_id')
            );
        }

        $eventIds = $this->studentEventIds($user);

        return $query->whereIn('id', $eventIds);
    }

    public function canViewEvent(User $user, CampusEvent $event): bool
    {
        return $this->visibleEvents($user)->whereKey($event->id)->exists();
    }

    public function canManageEvent(User $user, CampusEvent $event): bool
    {
        return $this->normalizedRole($user) === 'admin'
            || ($this->normalizedRole($user) === 'university' && $event->university_user_id === $user->id);
    }

    public function visibleVisits(User $user): Builder
    {
        $query = VisitRequest::query()
            ->whereNotNull('campus_event_id')
            ->whereNotNull('school_id');
        $role = $this->normalizedRole($user);

        return match ($role) {
            'admin' => $query,
            'university' => $query->whereIn(
                'campus_event_id',
                CampusEvent::query()->where('university_user_id', $user->id)->select('id')
            ),
            'school' => $user->school_id
                ? $query->where('school_id', $user->school_id)
                : $query->whereRaw('1 = 0'),
            'student' => $user->school_id
                ? $query->where('school_id', $user->school_id)->whereIn('status', ['approved', 'scheduled'])
                : $query->whereRaw('1 = 0'),
            default => $query->whereRaw('1 = 0'),
        };
    }

    public function canViewVisit(User $user, VisitRequest $visit): bool
    {
        return $this->visibleVisits($user)->whereKey($visit->id)->exists();
    }

    public function canViewItinerary(User $user, CampusEvent $event, ?int $visitRequestId = null): bool
    {
        $role = $this->normalizedRole($user);

        if ($role === 'admin' || ($role === 'university' && $event->university_user_id === $user->id)) {
            return true;
        }

        if ($role === 'school') {
            if (! $user->school_id) {
                return false;
            }

            return VisitRequest::query()
                ->where('campus_event_id', $event->id)
                ->where('school_id', $user->school_id)
                ->whereIn('status', ['approved', 'scheduled'])
                ->when($visitRequestId, fn (Builder $query) => $query->whereKey($visitRequestId))
                ->exists();
        }

        if ($role !== 'student') {
            return false;
        }

        $direct = EventRegistration::query()
            ->where('campus_event_id', $event->id)
            ->where('user_id', $user->id)
            ->where('status', 'confirmed')
            ->when($visitRequestId, fn (Builder $query) => $query->where('visit_request_id', $visitRequestId))
            ->exists();

        if ($direct) {
            return true;
        }

        return EventRegistrationStudent::query()
            ->where('event_registration_students.user_id', $user->id)
            ->where('event_registration_students.status', 'confirmed')
            ->join('event_registrations', 'event_registrations.id', '=', 'event_registration_students.event_registration_id')
            ->where('event_registrations.campus_event_id', $event->id)
            ->when($visitRequestId, fn ($query) => $query->where('event_registrations.visit_request_id', $visitRequestId))
            ->exists();
    }

    public function eventPayload(CampusEvent $event, ?array $summary = null): array
    {
        if ($summary === null) {
            $participantCounts = $this->eventParticipantCounts($event->id);
            $summary = [
                'visits_count' => VisitRequest::query()
                    ->where('campus_event_id', $event->id)
                    ->whereNotNull('school_id')
                    ->count(),
                'approved_visits_count' => VisitRequest::query()
                    ->where('campus_event_id', $event->id)
                    ->whereNotNull('school_id')
                    ->whereIn('status', ['approved', 'scheduled'])
                    ->count(),
                'participants_count' => $participantCounts['registered'],
                'checked_in_count' => $participantCounts['checked_in'],
            ];
        }

        return [
            'id' => $event->id,
            'university_user_id' => $event->university_user_id,
            'title' => $event->title,
            'description' => $event->description,
            'starts_at' => $event->starts_at?->toIso8601String(),
            'ends_at' => $event->ends_at?->toIso8601String(),
            'registration_opens_at' => $event->registration_opens_at?->toIso8601String(),
            'registration_closes_at' => $event->registration_closes_at?->toIso8601String(),
            'venue' => $event->venue,
            'location' => $event->location,
            'capacity' => (int) $event->capacity,
            'per_school_capacity' => $event->per_school_capacity !== null ? (int) $event->per_school_capacity : null,
            'per_group_capacity' => $event->per_group_capacity !== null ? (int) $event->per_group_capacity : null,
            'status' => $event->status,
            'visibility' => $event->visibility,
            'lifecycle_stage' => $event->lifecycle_stage,
            'visits_count' => (int) $summary['visits_count'],
            'approved_visits_count' => (int) $summary['approved_visits_count'],
            'participants_count' => (int) $summary['participants_count'],
            'checked_in_count' => (int) $summary['checked_in_count'],
            'registration_open' => $this->registrationIsOpen($event, (int) $summary['participants_count']),
            'attendance_open' => $this->attendanceIsOpen($event),
            'remaining_capacity' => max(0, (int) $event->capacity - (int) $summary['participants_count']),
            'created_at' => $event->created_at?->toIso8601String(),
            'updated_at' => $event->updated_at?->toIso8601String(),
        ];
    }

    public function eventPayloads(iterable $events): Collection
    {
        $events = collect($events)->values();
        $eventIds = $events->pluck('id')->filter()->unique()->values();

        if ($eventIds->isEmpty()) {
            return collect();
        }

        $visitCounts = VisitRequest::query()
            ->whereIn('campus_event_id', $eventIds)
            ->whereNotNull('school_id')
            ->select('campus_event_id')
            ->selectRaw('COUNT(*) as visits_count')
            ->selectRaw("SUM(CASE WHEN status IN ('approved', 'scheduled') THEN 1 ELSE 0 END) as approved_visits_count")
            ->groupBy('campus_event_id')
            ->get()
            ->keyBy('campus_event_id');

        $participantCounts = $this->participantSummaries($eventIds);

        return $events->map(function (CampusEvent $event) use ($visitCounts, $participantCounts): array {
            $visit = $visitCounts->get($event->id);
            $participants = $participantCounts->get($event->id, ['registered' => 0, 'checked_in' => 0]);

            return $this->eventPayload($event, [
                'visits_count' => (int) ($visit?->visits_count ?? 0),
                'approved_visits_count' => (int) ($visit?->approved_visits_count ?? 0),
                'participants_count' => (int) $participants['registered'],
                'checked_in_count' => (int) $participants['checked_in'],
            ]);
        });
    }

    public function visitPayload(VisitRequest $visit, ?array $eventSummary = null): array
    {
        $event = $visit->relationLoaded('event')
            ? $visit->event
            : ($visit->campus_event_id ? CampusEvent::find($visit->campus_event_id) : null);
        $school = $visit->relationLoaded('recipientSchool')
            ? $visit->recipientSchool
            : ($visit->school_id ? School::find($visit->school_id) : null);
        $respondent = $visit->relationLoaded('respondent')
            ? $visit->respondent
            : ($visit->responded_by_user_id ? User::find($visit->responded_by_user_id) : null);
        $respondedAt = $visit->responded_at ? Carbon::parse($visit->responded_at) : null;
        if ($event && $eventSummary === null) {
            $eventSummary = $this->eventPayload($event);
        }

        return [
            'id' => $visit->id,
            'campus_event_id' => $visit->campus_event_id,
            'school_id' => $visit->school_id,
            'legacy_target_school_id' => $visit->target_school_id,
            'requested_by_user_id' => $visit->requested_by_user_id,
            'responded_by_user_id' => $visit->responded_by_user_id,
            'requested_window' => $visit->requested_window,
            'group_size' => (int) ($visit->group_size ?: 1),
            'status' => $visit->status,
            'decision' => $visit->status === 'declined' ? 'rejected' : $visit->status,
            'notes' => $visit->notes,
            'decision_note' => $visit->decision_note,
            'responded_at' => $respondedAt?->toIso8601String(),
            'event' => $event ? [
                'id' => $event->id,
                'title' => $event->title,
                'starts_at' => $event->starts_at?->toIso8601String(),
                'ends_at' => $event->ends_at?->toIso8601String(),
                'venue' => $event->venue,
                'location' => $event->location,
                'status' => $event->status,
                'capacity' => (int) $event->capacity,
                'remaining_capacity' => $eventSummary['remaining_capacity'] ?? null,
                'registration_open' => $eventSummary['registration_open'] ?? $this->registrationIsOpen($event),
                'attendance_open' => $eventSummary['attendance_open'] ?? $this->attendanceIsOpen($event),
                'updated_at' => $event->updated_at?->toIso8601String(),
            ] : null,
            'school' => $school ? [
                'id' => $school->id,
                'name' => $school->name,
                'location' => $school->location,
            ] : null,
            'responded_by' => $respondent ? [
                'id' => $respondent->id,
                'name' => $respondent->name,
            ] : null,
            'created_at' => $visit->created_at?->toIso8601String(),
            'updated_at' => $visit->updated_at?->toIso8601String(),
        ];
    }

    public function visitPayloads(iterable $visits): Collection
    {
        $visits = new EloquentCollection(collect($visits)->values()->all());
        $visits->loadMissing([
            'event:id,title,starts_at,ends_at,venue,location,status,updated_at',
            'recipientSchool:id,name,location',
            'respondent:id,name',
        ]);
        $eventPayloads = $this->eventPayloads($visits->pluck('event')->filter()->unique('id'))->keyBy('id');

        return $visits->map(fn (VisitRequest $visit): array => $this->visitPayload(
            $visit,
            $visit->campus_event_id ? $eventPayloads->get($visit->campus_event_id) : null,
        ));
    }

    public function itineraryPayload(EventItineraryItem $item): array
    {
        return [
            'id' => $item->id,
            'campus_event_id' => $item->campus_event_id,
            'visit_request_id' => $item->visit_request_id,
            'title' => $item->title,
            'description' => $item->description,
            'starts_at' => $item->starts_at?->toIso8601String(),
            'ends_at' => $item->ends_at?->toIso8601String(),
            'location' => $item->location,
            'position' => (int) $item->position,
            'created_by_user_id' => $item->created_by_user_id,
            'created_at' => $item->created_at?->toIso8601String(),
            'updated_at' => $item->updated_at?->toIso8601String(),
        ];
    }

    public function itineraryForParticipation(CampusEvent $event, ?int $visitRequestId): array
    {
        return EventItineraryItem::query()
            ->where('campus_event_id', $event->id)
            ->where(function (Builder $query) use ($visitRequestId): void {
                $query->whereNull('visit_request_id');
                if ($visitRequestId) {
                    $query->orWhere('visit_request_id', $visitRequestId);
                }
            })
            ->orderBy('position')
            ->orderBy('starts_at')
            ->get()
            ->map(fn (EventItineraryItem $item) => $this->itineraryPayload($item))
            ->all();
    }

    public function activeSchoolUsers(int $schoolId): Collection
    {
        return User::query()
            ->where('school_id', $schoolId)
            ->whereIn('role', ['school', 'high_school'])
            ->where('access_status', 'active')
            ->whereNotNull('email_verified_at')
            ->get();
    }

    public function affectedUsersForVisit(VisitRequest $visit): Collection
    {
        $event = $visit->campus_event_id ? CampusEvent::find($visit->campus_event_id) : null;
        $userIds = collect([$event?->university_user_id])
            ->merge($visit->school_id ? $this->activeSchoolUsers($visit->school_id)->pluck('id') : []);

        $userIds = $userIds->merge(
            EventRegistration::query()
                ->where('visit_request_id', $visit->id)
                ->whereNotNull('user_id')
                ->pluck('user_id')
        );
        $userIds = $userIds->merge(
            EventRegistrationStudent::query()
                ->join('event_registrations', 'event_registrations.id', '=', 'event_registration_students.event_registration_id')
                ->where('event_registrations.visit_request_id', $visit->id)
                ->whereNotNull('event_registration_students.user_id')
                ->pluck('event_registration_students.user_id')
        );

        return User::query()
            ->whereIn('id', $userIds->filter()->unique()->values())
            ->where('access_status', 'active')
            ->whereNotNull('email_verified_at')
            ->get();
    }

    public function affectedUsersForEvent(CampusEvent $event): Collection
    {
        $userIds = collect([$event->university_user_id]);
        $schoolIds = VisitRequest::query()
            ->where('campus_event_id', $event->id)
            ->whereNotNull('school_id')
            ->pluck('school_id');

        if ($schoolIds->isNotEmpty()) {
            $userIds = $userIds->merge(
                User::query()
                    ->whereIn('school_id', $schoolIds)
                    ->whereIn('role', ['school', 'high_school'])
                    ->pluck('id')
            );
        }

        $userIds = $userIds->merge(
            EventRegistration::query()
                ->where('campus_event_id', $event->id)
                ->whereNotNull('user_id')
                ->pluck('user_id')
        );

        $userIds = $userIds->merge(
            EventRegistrationStudent::query()
                ->whereNotNull('event_registration_students.user_id')
                ->join('event_registrations', 'event_registrations.id', '=', 'event_registration_students.event_registration_id')
                ->where('event_registrations.campus_event_id', $event->id)
                ->pluck('event_registration_students.user_id')
        );

        return User::query()
            ->whereIn('id', $userIds->filter()->unique()->values())
            ->where('access_status', 'active')
            ->get();
    }

    public function notifyUsers(
        iterable $users,
        string $subject,
        ?string $body,
        string $type,
        ?CampusEvent $event = null,
        ?string $targetType = null,
        ?int $targetId = null,
        array $metadata = [],
    ): int {
        $ids = collect($users)
            ->map(fn ($user) => $user instanceof User ? $user->id : $user)
            ->filter()
            ->unique()
            ->values();

        $recipients = User::query()
            ->whereIn('id', $ids)
            ->where('access_status', 'active')
            ->get();

        foreach ($recipients as $recipient) {
            PlatformNotification::create([
                'user_id' => $recipient->id,
                'campus_event_id' => $event?->id,
                'notification_type' => $type,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'channel' => 'in_app',
                'subject' => $subject,
                'body' => $body,
                'status' => 'sent',
                'metadata' => $metadata,
                'sent_at' => now(),
            ]);
        }

        return $recipients->count();
    }

    public function registrationIsOpen(CampusEvent $event, ?int $participantCount = null): bool
    {
        if ($event->status !== 'published') {
            return false;
        }

        $now = now();

        return ($participantCount === null || $participantCount < (int) $event->capacity)
            && (! $event->registration_opens_at || $event->registration_opens_at->lte($now))
            && (! $event->registration_closes_at || $event->registration_closes_at->gte($now))
            && $event->starts_at->isFuture();
    }

    public function attendanceIsOpen(CampusEvent $event): bool
    {
        if ($event->status === 'cancelled') {
            return false;
        }

        $opensAt = $event->starts_at->copy()->subMinutes(max(0, (int) config('visits.check_in_early_minutes', 240)));
        $eventEndsAt = $event->ends_at ?: $event->starts_at->copy()->addHours(8);
        $closesAt = $eventEndsAt->copy()->addMinutes(max(0, (int) config('visits.check_in_late_minutes', 720)));

        return now()->betweenIncluded($opensAt, $closesAt);
    }

    public function eventParticipantCounts(int $eventId): array
    {
        return $this->participantSummaries(collect([$eventId]))
            ->get($eventId, ['registered' => 0, 'checked_in' => 0]);
    }

    public function eventCapacitySnapshot(int $eventId): array
    {
        $registrations = EventRegistration::query()
            ->with(['students', 'user:id,school_id', 'visitRequest:id,school_id'])
            ->where('campus_event_id', $eventId)
            ->where('status', 'confirmed')
            ->get();
        $schoolCounts = collect();
        $registered = 0;
        $largestGroup = 0;

        foreach ($registrations as $registration) {
            $confirmedAssigned = $registration->students->where('status', 'confirmed')->count();
            $seats = $registration->registrant_type === 'school_group'
                ? max((int) $registration->party_size, $confirmedAssigned)
                : max(1, (int) $registration->party_size);
            $schoolId = $registration->visitRequest?->school_id ?? $registration->user?->school_id;
            $registered += $seats;
            $largestGroup = max($largestGroup, $registration->registrant_type === 'school_group' ? $seats : 1);

            if ($schoolId) {
                $schoolCounts[$schoolId] = (int) ($schoolCounts[$schoolId] ?? 0) + $seats;
            }
        }

        return [
            'registered' => $registered,
            'largest_school' => (int) ($schoolCounts->max() ?? 0),
            'largest_group' => $largestGroup,
        ];
    }

    public function schoolParticipantCount(int $eventId, int $schoolId): int
    {
        return EventRegistration::query()
            ->with(['students', 'user:id,school_id', 'visitRequest:id,school_id'])
            ->where('campus_event_id', $eventId)
            ->where('status', 'confirmed')
            ->get()
            ->filter(fn (EventRegistration $registration): bool => ($registration->visitRequest?->school_id ?? $registration->user?->school_id) === $schoolId)
            ->sum(function (EventRegistration $registration): int {
                $confirmedAssigned = $registration->students->where('status', 'confirmed')->count();

                return $registration->registrant_type === 'school_group'
                    ? max((int) $registration->party_size, $confirmedAssigned)
                    : max(1, (int) $registration->party_size);
            });
    }

    public function studentParticipations(User $student): Collection
    {
        $direct = EventRegistration::query()
            ->with('event')
            ->where('user_id', $student->id)
            ->where('registrant_type', 'student')
            ->whereNotNull('visit_request_id')
            ->get();

        $assigned = EventRegistrationStudent::query()
            ->with('registration.event')
            ->where('user_id', $student->id)
            ->get()
            ->filter(fn (EventRegistrationStudent $record) => $record->registration?->visit_request_id);

        $events = $direct->pluck('event')
            ->merge($assigned->pluck('registration.event'))
            ->filter()
            ->unique('id')
            ->values();
        $eventPayloads = $this->eventPayloads($events)->keyBy('id');
        $itineraryItems = EventItineraryItem::query()
            ->whereIn('campus_event_id', $events->pluck('id'))
            ->orderBy('position')
            ->orderBy('starts_at')
            ->get()
            ->groupBy('campus_event_id');

        $direct = $direct->map(fn (EventRegistration $registration) => $this->directParticipationPayload(
            $registration,
            $registration->event ? $eventPayloads->get($registration->event->id) : null,
            $this->participationItineraryPayloads($itineraryItems, $registration->campus_event_id, $registration->visit_request_id),
        ));
        $assigned = $assigned->map(fn (EventRegistrationStudent $record) => $this->assignedParticipationPayload(
            $record,
            $record->registration?->event ? $eventPayloads->get($record->registration->event->id) : null,
            $this->participationItineraryPayloads($itineraryItems, $record->registration?->campus_event_id, $record->registration?->visit_request_id),
        ));

        return collect($direct->all())
            ->merge($assigned->all())
            ->filter(fn (array $row) => $row['event'] !== null)
            ->sortBy(fn (array $row) => $row['event']['starts_at'] ?? '9999-12-31')
            ->values();
    }

    public function metrics(User $user): array
    {
        $role = $this->normalizedRole($user);
        $eventIds = $this->visibleEvents($user)->pluck('id');
        $visits = $this->visibleVisits($user);

        if ($role === 'student') {
            $participations = $this->studentParticipations($user);
            $attended = $participations->whereNotNull('checked_in_at')->count();

            return [
                'scope' => 'student',
                'participations_total' => $participations->count(),
                'upcoming_visits' => $participations->filter(fn (array $row) => ! $this->participationIsHistory($row))->count(),
                'attended_visits' => $attended,
                'attendance_rate' => $participations->count() > 0 ? round(($attended / $participations->count()) * 100, 1) : 0.0,
            ];
        }

        $participantCounts = $this->scopedParticipantCounts($user, $eventIds->all());
        $registered = $participantCounts['registered'];
        $checkedIn = $participantCounts['checked_in'];

        return [
            'scope' => $role,
            'events_total' => $eventIds->count(),
            'events_upcoming' => CampusEvent::query()->whereIn('id', $eventIds)->where('status', 'published')->where('starts_at', '>=', now())->count(),
            'visits_total' => (clone $visits)->count(),
            'visits_pending' => (clone $visits)->where('status', 'requested')->count(),
            'visits_approved' => (clone $visits)->whereIn('status', ['approved', 'scheduled'])->count(),
            'participants_registered' => $registered,
            'participants_checked_in' => $checkedIn,
            'attendance_rate' => $registered > 0 ? round(($checkedIn / $registered) * 100, 1) : 0.0,
        ];
    }

    public function participationIsHistory(array $participation): bool
    {
        if ($participation['checked_in_at']
            || in_array($participation['status'], ['cancelled', 'declined', 'rejected'], true)
            || ($participation['event']['status'] ?? null) === 'cancelled') {
            return true;
        }

        $endsAt = $participation['event']['ends_at'] ?? $participation['event']['starts_at'] ?? null;

        return $endsAt ? Carbon::parse($endsAt)->isPast() : false;
    }

    private function participantSummaries(Collection $eventIds): Collection
    {
        $eventIds = $eventIds->filter()->unique()->values();
        if ($eventIds->isEmpty()) {
            return collect();
        }

        $registrations = EventRegistration::query()
            ->whereIn('campus_event_id', $eventIds)
            ->where('status', 'confirmed')
            ->get(['id', 'campus_event_id', 'registrant_type', 'party_size', 'checked_in_at']);
        $assignedCounts = EventRegistrationStudent::query()
            ->whereIn('event_registration_id', $registrations->pluck('id'))
            ->where('status', 'confirmed')
            ->select('event_registration_id')
            ->selectRaw('COUNT(*) as registered')
            ->selectRaw('SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END) as checked_in')
            ->groupBy('event_registration_id')
            ->get()
            ->keyBy('event_registration_id');
        $summaries = $eventIds->mapWithKeys(fn ($eventId): array => [
            (int) $eventId => ['registered' => 0, 'checked_in' => 0],
        ]);

        foreach ($registrations as $registration) {
            $assigned = $assignedCounts->get($registration->id);
            $assignedRegistered = (int) ($assigned?->registered ?? 0);
            $assignedCheckedIn = (int) ($assigned?->checked_in ?? 0);
            $seats = $registration->registrant_type === 'school_group'
                ? max((int) $registration->party_size, $assignedRegistered)
                : max(1, (int) $registration->party_size);
            $checkedIn = $registration->registrant_type === 'school_group'
                ? max($assignedCheckedIn, $registration->checked_in_at ? $seats : 0)
                : ($registration->checked_in_at ? $seats : 0);
            $eventId = (int) $registration->campus_event_id;
            $summary = $summaries->get($eventId, ['registered' => 0, 'checked_in' => 0]);
            $summary['registered'] += $seats;
            $summary['checked_in'] += $checkedIn;
            $summaries->put($eventId, $summary);
        }

        return $summaries;
    }

    private function studentEventIds(User $student): array
    {
        $ids = collect();

        if ($student->school_id) {
            $ids = $ids->merge(
                VisitRequest::query()
                    ->where('school_id', $student->school_id)
                    ->whereIn('status', ['approved', 'scheduled'])
                    ->whereNotNull('campus_event_id')
                    ->pluck('campus_event_id')
            );
        }

        $ids = $ids->merge(
            EventRegistration::query()
                ->where('user_id', $student->id)
                ->pluck('campus_event_id')
        );

        $ids = $ids->merge(
            EventRegistrationStudent::query()
                ->where('event_registration_students.user_id', $student->id)
                ->join('event_registrations', 'event_registrations.id', '=', 'event_registration_students.event_registration_id')
                ->pluck('event_registrations.campus_event_id')
        );

        return $ids->filter()->unique()->values()->all();
    }

    private function directParticipationPayload(EventRegistration $registration, ?array $eventPayload, array $itinerary): array
    {
        $event = $registration->event;

        return [
            'participation_type' => 'self',
            'participation_id' => $registration->id,
            'registration_id' => $registration->id,
            'registration_student_id' => null,
            'visit_request_id' => $registration->visit_request_id,
            'status' => $registration->status,
            'checked_in_at' => $registration->checked_in_at?->toIso8601String(),
            'checked_out_at' => $registration->checked_out_at?->toIso8601String(),
            'event' => $event ? $eventPayload : null,
            'itinerary' => $event ? $itinerary : [],
            'updated_at' => $registration->updated_at?->toIso8601String(),
        ];
    }

    private function assignedParticipationPayload(EventRegistrationStudent $record, ?array $eventPayload, array $itinerary): array
    {
        $registration = $record->registration;
        $event = $registration?->event;

        return [
            'participation_type' => 'school_assignment',
            'participation_id' => $record->id,
            'registration_id' => $registration?->id,
            'registration_student_id' => $record->id,
            'visit_request_id' => $registration?->visit_request_id,
            'status' => $record->status,
            'checked_in_at' => $record->checked_in_at?->toIso8601String(),
            'checked_out_at' => $record->checked_out_at?->toIso8601String(),
            'event' => $event ? $eventPayload : null,
            'itinerary' => $event ? $itinerary : [],
            'updated_at' => $record->updated_at?->toIso8601String(),
        ];
    }

    private function participationItineraryPayloads(Collection $itemsByEvent, ?int $eventId, ?int $visitRequestId): array
    {
        if (! $eventId) {
            return [];
        }

        return collect($itemsByEvent->get($eventId, []))
            ->filter(fn (EventItineraryItem $item): bool => $item->visit_request_id === null || $item->visit_request_id === $visitRequestId)
            ->map(fn (EventItineraryItem $item): array => $this->itineraryPayload($item))
            ->values()
            ->all();
    }

    private function scopedParticipantCounts(User $user, array $eventIds): array
    {
        $role = $this->normalizedRole($user);

        if ($role === 'school') {
            if (! $user->school_id) {
                return ['registered' => 0, 'checked_in' => 0];
            }

            $direct = DB::table('event_registrations')
                ->join('users', 'users.id', '=', 'event_registrations.user_id')
                ->whereIn('event_registrations.campus_event_id', $eventIds)
                ->where('event_registrations.registrant_type', 'student')
                ->where('event_registrations.status', 'confirmed')
                ->where('users.school_id', $user->school_id);
            $assigned = DB::table('event_registration_students')
                ->join('event_registrations', 'event_registrations.id', '=', 'event_registration_students.event_registration_id')
                ->join('visit_requests', 'visit_requests.id', '=', 'event_registrations.visit_request_id')
                ->whereIn('event_registrations.campus_event_id', $eventIds)
                ->where('event_registration_students.status', 'confirmed')
                ->where('visit_requests.school_id', $user->school_id);
        } else {
            $direct = DB::table('event_registrations')
                ->whereIn('campus_event_id', $eventIds)
                ->where('registrant_type', 'student')
                ->where('status', 'confirmed');
            $assigned = DB::table('event_registration_students')
                ->join('event_registrations', 'event_registrations.id', '=', 'event_registration_students.event_registration_id')
                ->whereIn('event_registrations.campus_event_id', $eventIds)
                ->where('event_registration_students.status', 'confirmed');
        }

        return [
            'registered' => (clone $direct)->count() + (clone $assigned)->count(),
            'checked_in' => (clone $direct)->whereNotNull('event_registrations.checked_in_at')->count()
                + (clone $assigned)->whereNotNull('event_registration_students.checked_in_at')->count(),
        ];
    }
}
