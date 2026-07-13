<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(School::query()->orderBy('name')->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
        ]);

        return response()->json(School::create($validated), 201);
    }

    public function update(Request $request, School $school): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'location' => ['sometimes', 'string', 'max:255'],
        ]);

        $school->update($validated);

        return response()->json($school);
    }

    public function destroy(School $school): JsonResponse
    {
        abort_if(
            $school->users()->exists() || $school->registrations()->exists(),
            409,
            'Move or remove the school accounts and participation records before deleting this school.'
        );

        $school->delete();

        return response()->json(['message' => 'School deleted.']);
    }
}
