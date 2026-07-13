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

class AttendanceController extends WorkflowController
{
    public function checkInRegistration(Request $request, EventRegistration $registration): JsonResponse
    {
        $event = $this->authorizeRegistration($request, $registration);
        $this->ensureCheckInWindow($event);
        abort_unless($registration->registrant_type === 'student' && $registration->user_id, 422, 'Use the student-record check-in endpoint for school groups.');
        abort_unless($registration->status === 'confirmed', 422, 'Only confirmed participants can check in.');
        abort_if($registration->checked_in_at, 409, 'Participant is already checked in.');

        DB::transaction(function () use ($registration, $event, $request): void {
            $registration->update(['checked_in_at' => now(), 'attended_at' => now()]);
            $this->notifyAttendance($request->user(), $event, $registration->user_id, $registration->visit_request_id, 'checked in');
        });

        return $this->data($this->registrationAttendancePayload($registration->fresh(), $event));
    }

    public function checkOutRegistration(Request $request, EventRegistration $registration): JsonResponse
    {
        $event = $this->authorizeRegistration($request, $registration);
        abort_unless($registration->registrant_type === 'student' && $registration->user_id, 422, 'Use the student-record check-out endpoint for school groups.');
        abort_unless($registration->checked_in_at, 422, 'Participant must check in first.');
        abort_if($registration->checked_out_at, 409, 'Participant is already checked out.');

        DB::transaction(function () use ($registration, $event, $request): void {
            $registration->update(['checked_out_at' => now()]);
            $this->notifyAttendance($request->user(), $event, $registration->user_id, $registration->visit_request_id, 'checked out');
        });

        return $this->data($this->registrationAttendancePayload($registration->fresh(), $event));
    }

    public function checkInStudent(Request $request, EventRegistrationStudent $registrationStudent): JsonResponse
    {
        [$registration, $event] = $this->authorizeStudentRecord($request, $registrationStudent);
        $this->ensureCheckInWindow($event);
        abort_unless($registrationStudent->status === 'confirmed', 422, 'Only confirmed participants can check in.');
        abort_if($registrationStudent->checked_in_at, 409, 'Participant is already checked in.');

        DB::transaction(function () use ($registrationStudent, $registration, $event, $request): void {
            $registrationStudent->update(['checked_in_at' => now()]);
            if (! $registration->attended_at) {
                $registration->update(['attended_at' => now()]);
            }
            $this->notifyAttendance($request->user(), $event, $registrationStudent->user_id, $registration->visit_request_id, 'checked in');
        });

        return $this->data($this->studentAttendancePayload($registrationStudent->fresh(), $event));
    }

    public function checkOutStudent(Request $request, EventRegistrationStudent $registrationStudent): JsonResponse
    {
        [$registration, $event] = $this->authorizeStudentRecord($request, $registrationStudent);
        abort_unless($registrationStudent->checked_in_at, 422, 'Participant must check in first.');
        abort_if($registrationStudent->checked_out_at, 409, 'Participant is already checked out.');

        DB::transaction(function () use ($registrationStudent, $registration, $event, $request): void {
            $registrationStudent->update(['checked_out_at' => now()]);
            $this->notifyAttendance($request->user(), $event, $registrationStudent->user_id, $registration->visit_request_id, 'checked out');
        });

        return $this->data($this->studentAttendancePayload($registrationStudent->fresh(), $event));
    }

    private function authorizeRegistration(Request $request, EventRegistration $registration): CampusEvent
    {
        $actor = $this->requireRole($request, 'university', 'admin');
        $event = CampusEvent::findOrFail($registration->campus_event_id);
        abort_unless($this->workflow->canManageEvent($actor, $event), 403);

        return $event;
    }

    private function authorizeStudentRecord(Request $request, EventRegistrationStudent $record): array
    {
        $registration = EventRegistration::findOrFail($record->event_registration_id);
        $event = $this->authorizeRegistration($request, $registration);

        return [$registration, $event];
    }

    private function ensureCheckInWindow(CampusEvent $event): void
    {
        abort_if($event->status === 'cancelled', 409, 'Attendance cannot be recorded for a cancelled event.');

        $opensAt = $event->starts_at->copy()->subMinutes(max(0, (int) config('visits.check_in_early_minutes', 240)));
        $eventEndsAt = $event->ends_at ?: $event->starts_at->copy()->addHours(8);
        $closesAt = $eventEndsAt->copy()->addMinutes(max(0, (int) config('visits.check_in_late_minutes', 720)));

        abort_unless(
            now()->betweenIncluded($opensAt, $closesAt),
            422,
            'Check-in is only available near the scheduled event time.'
        );
    }

    private function notifyAttendance(
        User $actor,
        CampusEvent $event,
        ?int $studentId,
        ?int $visitRequestId,
        string $verb,
    ): void {
        $recipients = collect([$actor, $event->university_user_id, $studentId]);
        $visit = $visitRequestId ? VisitRequest::find($visitRequestId) : null;
        if ($visit?->school_id) {
            $recipients = $recipients->merge($this->workflow->activeSchoolUsers($visit->school_id));
        }
        $student = $studentId ? User::find($studentId) : null;

        $this->workflow->notifyUsers(
            $recipients,
            'Visit attendance updated',
            ($student?->name ?? 'A participant')." {$verb} for {$event->title}.",
            'attendance.'.str_replace(' ', '_', $verb),
            $event,
            User::class,
            $studentId,
            ['visit_request_id' => $visitRequestId, 'attendance_status' => $verb],
        );
    }

    private function registrationAttendancePayload(EventRegistration $registration, CampusEvent $event): array
    {
        return [
            'participant_type' => 'self',
            'id' => $registration->id,
            'user_id' => $registration->user_id,
            'campus_event_id' => $event->id,
            'status' => $registration->checked_out_at ? 'checked_out' : 'checked_in',
            'checked_in_at' => $registration->checked_in_at?->toIso8601String(),
            'checked_out_at' => $registration->checked_out_at?->toIso8601String(),
            'updated_at' => $registration->updated_at?->toIso8601String(),
        ];
    }

    private function studentAttendancePayload(EventRegistrationStudent $record, CampusEvent $event): array
    {
        return [
            'participant_type' => 'school_assignment',
            'id' => $record->id,
            'user_id' => $record->user_id,
            'campus_event_id' => $event->id,
            'status' => $record->checked_out_at ? 'checked_out' : 'checked_in',
            'checked_in_at' => $record->checked_in_at?->toIso8601String(),
            'checked_out_at' => $record->checked_out_at?->toIso8601String(),
            'updated_at' => $record->updated_at?->toIso8601String(),
        ];
    }
}
