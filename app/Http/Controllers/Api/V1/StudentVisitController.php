<?php

namespace App\Http\Controllers\Api\V1;

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
}
