<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentVisitController extends WorkflowController
{
    public function upcoming(Request $request): JsonResponse
    {
        $student = $this->requireRole($request, 'student');
        $rows = $this->workflow->studentParticipations($student)
            ->reject(fn (array $row) => $this->workflow->participationIsHistory($row))
            ->values();

        return $this->data($rows->all(), meta: ['total' => $rows->count()]);
    }

    public function history(Request $request): JsonResponse
    {
        $student = $this->requireRole($request, 'student');
        $rows = $this->workflow->studentParticipations($student)
            ->filter(fn (array $row) => $this->workflow->participationIsHistory($row))
            ->values();

        return $this->data($rows->all(), meta: ['total' => $rows->count()]);
    }

    public function confirm(Request $request, string $type, int $id): JsonResponse
    {
        $student = $this->requireRole($request, 'student');
        abort_unless(in_array($type, ['self', 'school-assignment'], true), 404);

        if ($type === 'self') {
            $record = EventRegistration::query()
                ->whereKey($id)
                ->where('user_id', $student->id)
                ->where('registrant_type', 'student')
                ->firstOrFail();
            abort_if(in_array($record->status, ['cancelled', 'declined', 'rejected'], true), 422, 'This visit cannot be confirmed.');
            $record->update([
                'student_confirmed_at' => now(),
                'consent_status' => $record->consent_status === 'pending' ? 'received' : $record->consent_status,
            ]);

            return $this->data([
                'participation_type' => 'self',
                'participation_id' => $record->id,
                'student_confirmed_at' => $record->student_confirmed_at?->toIso8601String(),
                'consent_status' => $record->consent_status,
            ]);
        }

        $record = EventRegistrationStudent::query()
            ->whereKey($id)
            ->where('user_id', $student->id)
            ->firstOrFail();
        abort_if(in_array($record->status, ['cancelled', 'declined', 'rejected'], true), 422, 'This visit cannot be confirmed.');
        $record->update([
            'student_confirmed_at' => now(),
            'consent_status' => $record->consent_status === 'pending' ? 'received' : $record->consent_status,
        ]);

        return $this->data([
            'participation_type' => 'school_assignment',
            'participation_id' => $record->id,
            'student_confirmed_at' => $record->student_confirmed_at?->toIso8601String(),
            'consent_status' => $record->consent_status,
        ]);
    }
}
