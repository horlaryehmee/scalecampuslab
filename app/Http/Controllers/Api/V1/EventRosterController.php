<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventRosterController extends WorkflowController
{
    public function index(Request $request, CampusEvent $campusEvent): JsonResponse
    {
        $actor = $this->requireRole($request, 'university', 'admin');
        abort_unless($this->workflow->canManageEvent($actor, $campusEvent), 403);

        $direct = EventRegistration::query()
            ->with('user.school')
            ->where('campus_event_id', $campusEvent->id)
            ->where('registrant_type', 'student')
            ->orderBy('registrant_name')
            ->get()
            ->map(function (EventRegistration $registration): array {
                $student = $registration->user;

                return [
                    'attendance_record_type' => 'registration',
                    'attendance_record_id' => $registration->id,
                    'registration_id' => $registration->id,
                    'registration_student_id' => null,
                    'visit_request_id' => $registration->visit_request_id,
                    'student_id' => $student?->id,
                    'name' => $student?->name ?? $registration->registrant_name,
                    'email' => $student?->email ?? $registration->registrant_email,
                    'student_identifier' => $student?->student_identifier,
                    'grade_level' => $student?->grade_level,
                    'school' => $student?->school ? [
                        'id' => $student->school->id,
                        'name' => $student->school->name,
                    ] : null,
                    'source' => 'self',
                    'status' => $registration->status,
                    'checked_in_at' => $registration->checked_in_at?->toIso8601String(),
                    'checked_out_at' => $registration->checked_out_at?->toIso8601String(),
                    'attendance_status' => $this->attendanceStatus($registration->checked_in_at, $registration->checked_out_at),
                    'updated_at' => $registration->updated_at?->toIso8601String(),
                ];
            });

        $assigned = EventRegistrationStudent::query()
            ->with(['user', 'registration.visitRequest.recipientSchool'])
            ->whereIn('event_registration_id', EventRegistration::query()
                ->where('campus_event_id', $campusEvent->id)
                ->where('registrant_type', 'school_group')
                ->select('id'))
            ->orderBy('name')
            ->get()
            ->map(function (EventRegistrationStudent $record): array {
                $registration = $record->registration;
                $school = $registration?->visitRequest?->recipientSchool;

                return [
                    'attendance_record_type' => 'registration_student',
                    'attendance_record_id' => $record->id,
                    'registration_id' => $registration?->id,
                    'registration_student_id' => $record->id,
                    'visit_request_id' => $registration?->visit_request_id,
                    'student_id' => $record->user_id,
                    'name' => $record->user?->name ?? $record->name,
                    'email' => $record->user?->email ?? $record->email,
                    'student_identifier' => $record->student_identifier,
                    'grade_level' => $record->grade_level,
                    'school' => $school ? ['id' => $school->id, 'name' => $school->name] : null,
                    'source' => 'school_assignment',
                    'status' => $record->status,
                    'checked_in_at' => $record->checked_in_at?->toIso8601String(),
                    'checked_out_at' => $record->checked_out_at?->toIso8601String(),
                    'attendance_status' => $this->attendanceStatus($record->checked_in_at, $record->checked_out_at),
                    'updated_at' => $record->updated_at?->toIso8601String(),
                ];
            });

        $roster = collect($direct->all())
            ->merge($assigned->all())
            ->sortBy('name')
            ->values();

        return $this->data($roster->all(), meta: [
            'event_id' => $campusEvent->id,
            'event_status' => $campusEvent->status,
            'event_updated_at' => $campusEvent->updated_at?->toIso8601String(),
            'total' => $roster->count(),
            'checked_in' => $roster->whereIn('attendance_status', ['checked_in', 'checked_out'])->count(),
        ]);
    }

    private function attendanceStatus(mixed $checkedInAt, mixed $checkedOutAt): string
    {
        return match (true) {
            (bool) $checkedOutAt => 'checked_out',
            (bool) $checkedInAt => 'checked_in',
            default => 'not_checked_in',
        };
    }
}
