<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $applications = Application::query()
            ->with(['student:id,name,email', 'university:id,name,email'])
            ->when($request->user()->role === 'student', fn ($query) => $query->where('student_id', $request->user()->id))
            ->when($request->user()->role === 'university', fn ($query) => $query->where('university_id', $request->user()->id))
            ->paginate(30);

        return response()->json($applications);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => ['sometimes', 'exists:users,id'],
            'university_id' => ['required', 'exists:users,id'],
            'status' => ['sometimes', Rule::in(['applied', 'accepted', 'rejected'])],
        ]);

        $studentId = $request->user()->role === 'student' ? $request->user()->id : ($validated['student_id'] ?? null);
        abort_unless($studentId, 422, 'student_id is required.');

        $application = Application::updateOrCreate(
            ['student_id' => $studentId, 'university_id' => $validated['university_id']],
            ['status' => $validated['status'] ?? 'applied']
        );

        return response()->json($application, 201);
    }

    public function update(Request $request, Application $application): JsonResponse
    {
        abort_unless($request->user()->role === 'admin' || $request->user()->id === $application->university_id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['applied', 'accepted', 'rejected'])],
        ]);

        $application->update($validated);

        return response()->json($application);
    }
}
