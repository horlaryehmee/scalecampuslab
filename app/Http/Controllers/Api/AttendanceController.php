<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function store(Request $request, Event $event): JsonResponse
    {
        abort_unless($request->user()->role === 'admin' || $request->user()->id === $event->university_id, 403);

        $validated = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'integer', 'exists:users,id'],
            'records.*.attended' => ['required', 'boolean'],
        ]);

        $records = collect($validated['records'])->map(fn ($record) => Attendance::updateOrCreate(
            ['event_id' => $event->id, 'student_id' => $record['student_id']],
            ['attended' => $record['attended']]
        ));

        return response()->json(['attendance' => $records]);
    }
}
