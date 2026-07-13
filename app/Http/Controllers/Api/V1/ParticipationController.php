<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParticipationController extends WorkflowController
{
    public function selfRegister(Request $request, VisitRequest $visitRequest): JsonResponse
    {
        $student = $this->requireRole($request, 'student');
        [$visit, $event] = $this->approvedVisitAndEvent($visitRequest);
        abort_unless($student->school_id && $student->school_id === $visit->school_id, 403);
        abort_unless($this->workflow->registrationIsOpen($event), 422, 'Registration is not open for this event.');

        $registration = DB::transaction(function () use ($student, $visit, $event): EventRegistration {
            $event = CampusEvent::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            abort_if($this->studentAlreadyParticipates($event->id, $student), 409, 'Student is already participating in this event.');
            $this->ensureCapacity($event, $visit->school_id, 1);

            $registration = new EventRegistration;
            $registration->forceFill([
                'campus_event_id' => $event->id,
                'visit_request_id' => $visit->id,
                'user_id' => $student->id,
                'registrant_name' => $student->name,
                'registrant_email' => $student->email,
                'registrant_type' => 'student',
                'party_size' => 1,
                'status' => 'confirmed',
                'consent_status' => 'not_required',
                'is_minor' => $student->date_of_birth?->gt(now()->subYears(18)) ?? false,
            ]);
            $registration->save();

            $this->workflow->notifyUsers(
                $this->workflow->activeSchoolUsers($visit->school_id)
                    ->push($student)
                    ->push($event->university_user_id),
                'Student joined a campus visit',
                "{$student->name} registered for {$event->title}.",
                'participation.self_registered',
                $event,
                EventRegistration::class,
                $registration->id,
                ['visit_request_id' => $visit->id, 'student_id' => $student->id],
            );

            return $registration;
        });

        return $this->data($this->registrationPayload($registration->fresh(), $event), 201);
    }

    public function assign(Request $request, VisitRequest $visitRequest): JsonResponse
    {
        $actor = $this->requireRole($request, 'school', 'admin');
        [$visit, $event] = $this->approvedVisitAndEvent($visitRequest);

        if ($this->workflow->normalizedRole($actor) === 'school') {
            abort_unless($actor->school_id === $visit->school_id, 403);
        }

        abort_unless($this->workflow->registrationIsOpen($event), 422, 'Registration is not open for this event.');
        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1', 'max:500'],
            'student_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);
        $studentIds = array_values(array_unique(array_map('intval', $validated['student_ids'])));
        $students = User::query()->whereIn('id', $studentIds)->get();

        abort_unless(
            $students->count() === count($studentIds)
            && $students->every(fn (User $student) => $student->role === 'student'
                && $student->school_id === $visit->school_id
                && $student->access_status === 'active'
                && $student->hasVerifiedEmail()),
            403,
            'Every selected student must be an active, verified member of the recipient school.'
        );

        [$group, $records] = DB::transaction(function () use ($actor, $visit, $event, $students): array {
            $event = CampusEvent::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            $groupContactEmail = $this->workflow->activeSchoolUsers($visit->school_id)->first()?->email
                ?? "visit-{$visit->id}@groups.scalecampuslab.invalid";

            foreach ($students as $student) {
                abort_if($this->studentAlreadyParticipates($event->id, $student), 409, "{$student->name} is already participating in this event.");
            }

            $group = EventRegistration::query()
                ->where('campus_event_id', $event->id)
                ->where('visit_request_id', $visit->id)
                ->where('registrant_type', 'school_group')
                ->lockForUpdate()
                ->first();
            $existingGroupSize = $group
                ? EventRegistrationStudent::query()->where('event_registration_id', $group->id)->where('status', 'confirmed')->count()
                : 0;
            $newGroupSize = $existingGroupSize + $students->count();

            abort_if(
                $event->per_group_capacity && $newGroupSize > $event->per_group_capacity,
                422,
                'The assignment exceeds the event group capacity.'
            );
            $this->ensureCapacity($event, $visit->school_id, $students->count());

            if (! $group) {
                $group = new EventRegistration;
                $group->forceFill([
                    'campus_event_id' => $event->id,
                    'visit_request_id' => $visit->id,
                    'user_id' => $actor->id,
                    'registrant_name' => ($students->first()?->school?->name ?? 'School').' group',
                    'registrant_email' => $groupContactEmail,
                    'registrant_type' => 'school_group',
                    'party_size' => 0,
                    'status' => 'confirmed',
                    'consent_status' => 'not_required',
                    'is_minor' => true,
                ]);
                $group->save();
            }

            $records = collect();
            foreach ($students as $student) {
                $record = new EventRegistrationStudent;
                $record->forceFill([
                    'event_registration_id' => $group->id,
                    'user_id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'student_identifier' => $student->student_identifier,
                    'grade_level' => $student->grade_level,
                    'interest_major' => $student->interest_major,
                    'status' => 'confirmed',
                    'consent_status' => 'not_required',
                    'is_minor' => $student->date_of_birth?->gt(now()->subYears(18)) ?? true,
                    'guardian_name' => $student->guardian_name,
                    'guardian_email' => $student->guardian_email,
                    'guardian_phone' => $student->guardian_phone,
                    'emergency_contact_name' => $student->emergency_contact_name,
                    'emergency_contact_phone' => $student->emergency_contact_phone,
                    'medical_notes' => $student->medical_notes,
                ]);
                $record->save();
                $records->push($record);
            }

            $group->update(['party_size' => $newGroupSize]);
            $this->workflow->notifyUsers(
                $this->workflow->activeSchoolUsers($visit->school_id)
                    ->merge($students)
                    ->push($event->university_user_id)
                    ->push($actor),
                'Students assigned to campus visit',
                $students->count()." student(s) were assigned to {$event->title}.",
                'participation.school_assigned',
                $event,
                EventRegistration::class,
                $group->id,
                ['visit_request_id' => $visit->id, 'student_ids' => $students->pluck('id')->all()],
            );

            return [$group, $records];
        });

        return $this->data([
            'registration' => $this->registrationPayload($group->fresh(), $event),
            'students' => $records->map(fn (EventRegistrationStudent $record) => $this->studentRecordPayload($record))->all(),
        ], 201);
    }

    private function approvedVisitAndEvent(VisitRequest $visit): array
    {
        abort_unless($visit->school_id && $visit->campus_event_id, 404);
        abort_unless(in_array($visit->status, ['approved', 'scheduled'], true), 422, 'The school must approve this visit first.');
        $event = CampusEvent::findOrFail($visit->campus_event_id);

        return [$visit, $event];
    }

    private function ensureCapacity(CampusEvent $event, int $schoolId, int $additional): void
    {
        $participants = $this->workflow->eventParticipantCounts($event->id)['registered'];
        abort_if($participants + $additional > $event->capacity, 422, 'The event does not have enough remaining capacity.');

        if ($event->per_school_capacity) {
            $schoolParticipants = $this->workflow->schoolParticipantCount($event->id, $schoolId);
            abort_if(
                $schoolParticipants + $additional > $event->per_school_capacity,
                422,
                'The school has reached its capacity for this event.'
            );
        }
    }

    private function studentAlreadyParticipates(int $eventId, User $student): bool
    {
        if (EventRegistration::query()
            ->where('campus_event_id', $eventId)
            ->where('user_id', $student->id)
            ->where('status', '!=', 'cancelled')
            ->exists()) {
            return true;
        }

        return EventRegistrationStudent::query()
            ->where('event_registration_students.user_id', $student->id)
            ->where('event_registration_students.status', '!=', 'cancelled')
            ->join('event_registrations', 'event_registrations.id', '=', 'event_registration_students.event_registration_id')
            ->where('event_registrations.campus_event_id', $eventId)
            ->exists();
    }

    private function registrationPayload(EventRegistration $registration, CampusEvent $event): array
    {
        return [
            'id' => $registration->id,
            'campus_event_id' => $registration->campus_event_id,
            'visit_request_id' => $registration->visit_request_id,
            'user_id' => $registration->user_id,
            'registrant_type' => $registration->registrant_type,
            'party_size' => (int) $registration->party_size,
            'status' => $registration->status,
            'checked_in_at' => $registration->checked_in_at?->toIso8601String(),
            'event' => $this->workflow->eventPayload($event),
            'created_at' => $registration->created_at?->toIso8601String(),
            'updated_at' => $registration->updated_at?->toIso8601String(),
        ];
    }

    private function studentRecordPayload(EventRegistrationStudent $record): array
    {
        return [
            'id' => $record->id,
            'event_registration_id' => $record->event_registration_id,
            'user_id' => $record->user_id,
            'name' => $record->name,
            'email' => $record->email,
            'status' => $record->status,
            'checked_in_at' => $record->checked_in_at?->toIso8601String(),
            'created_at' => $record->created_at?->toIso8601String(),
            'updated_at' => $record->updated_at?->toIso8601String(),
        ];
    }
}
