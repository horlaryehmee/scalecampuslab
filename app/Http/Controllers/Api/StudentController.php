<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $students = User::query()
            ->where('role', 'student')
            ->when($request->user()->isSchool(), fn ($query) => $query->where('school_id', $request->user()->school_id))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'school_id', 'student_identifier', 'grade_level', 'interest_major', 'assigned_events']);

        return response()->json($students);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateStudent($request);
        $schoolId = $this->schoolIdFor($request, $validated['school_id'] ?? null);

        $student = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make(Str::password(16)),
            'role' => 'student',
            'school_id' => $schoolId,
            'student_identifier' => $validated['student_identifier'] ?? null,
            'grade_level' => $validated['grade_level'] ?? null,
            'interest_major' => $validated['interest_major'] ?? null,
            'assigned_events' => [],
            'email_verified_at' => now(),
        ]);

        return response()->json($student->only(['id', 'name', 'email', 'school_id', 'student_identifier', 'grade_level', 'interest_major', 'assigned_events']), 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'students' => ['nullable', 'array'],
            'students.*.name' => ['required_with:students', 'string', 'max:255'],
            'students.*.email' => ['required_with:students', 'email', 'max:255', 'distinct', 'unique:users,email'],
            'students.*.student_identifier' => ['nullable', 'string', 'max:40'],
            'students.*.grade_level' => ['nullable', 'string', 'max:40'],
            'students.*.interest_major' => ['nullable', 'string', 'max:120'],
            'csv' => ['nullable', 'string'],
        ]);

        $schoolId = $this->schoolIdFor($request, $validated['school_id'] ?? null);
        $rows = $validated['students'] ?? $this->studentsFromCsv($validated['csv'] ?? '');

        abort_unless(count($rows) > 0, 422, 'Provide at least one student.');

        $created = [];

        foreach ($rows as $row) {
            validator($row, [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            ])->validate();

            $created[] = User::create([
                'name' => $row['name'],
                'email' => $row['email'],
                'password' => Hash::make(Str::password(16)),
                'role' => 'student',
                'school_id' => $schoolId,
                'student_identifier' => $row['student_identifier'] ?? null,
                'grade_level' => $row['grade_level'] ?? null,
                'interest_major' => $row['interest_major'] ?? null,
                'assigned_events' => [],
                'email_verified_at' => now(),
            ])->only(['id', 'name', 'email', 'school_id', 'student_identifier', 'grade_level', 'interest_major', 'assigned_events']);
        }

        return response()->json(['created' => $created], 201);
    }

    public function update(Request $request, User $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);

        $validated = $this->validateStudent($request, $student->id, updating: true);
        if ($request->user()->isSchool()) {
            unset($validated['school_id']);
        }

        $student->update($validated);

        return response()->json($student->only(['id', 'name', 'email', 'school_id', 'student_identifier', 'grade_level', 'interest_major', 'assigned_events']));
    }

    public function destroy(Request $request, User $student): JsonResponse
    {
        $this->authorizeStudent($request, $student);
        $student->delete();

        return response()->json(['message' => 'Student deleted.']);
    }

    private function validateStudent(Request $request, ?int $ignoreId = null, bool $updating = false): array
    {
        return $request->validate([
            'name' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'email' => [
                $updating ? 'sometimes' : 'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($ignoreId),
            ],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'student_identifier' => ['nullable', 'string', 'max:40'],
            'grade_level' => ['nullable', 'string', 'max:40'],
            'interest_major' => ['nullable', 'string', 'max:120'],
        ]);
    }

    private function schoolIdFor(Request $request, ?int $requestedSchoolId): int
    {
        if ($request->user()->isSchool()) {
            abort_unless($request->user()->school_id, 422, 'Your school account is not linked to a school.');

            return $request->user()->school_id;
        }

        abort_unless($requestedSchoolId, 422, 'school_id is required.');

        return $requestedSchoolId;
    }

    private function authorizeStudent(Request $request, User $student): void
    {
        abort_unless($student->role === 'student', 404);
        abort_unless(
            $request->user()->role === 'admin'
            || ($request->user()->isSchool() && $request->user()->school_id === $student->school_id),
            403
        );
    }

    private function studentsFromCsv(string $csv): array
    {
        return collect(preg_split('/\r\n|\r|\n/', trim($csv)))
            ->filter()
            ->map(function (string $line): array {
                [$name, $email, $gradeLevel, $interestMajor] = array_pad(array_map('trim', str_getcsv($line)), 4, null);

                return ['name' => $name, 'email' => $email, 'grade_level' => $gradeLevel, 'interest_major' => $interestMajor];
            })
            ->values()
            ->all();
    }
}
