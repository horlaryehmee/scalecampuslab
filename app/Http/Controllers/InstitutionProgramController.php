<?php

namespace App\Http\Controllers;

use App\Models\InstitutionProgram;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InstitutionProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = InstitutionProgram::query()
            ->with(['university:id,name', 'school:id,name,location'])
            ->withCount(['applications' => fn ($applications) => $applications->whereNotNull('submitted_at')]);

        if ($user->role === 'university') {
            $query->where('university_user_id', $user->id);
        } elseif ($user->isSchool()) {
            abort_unless($user->school_id, 403);
            $query->where('school_id', $user->school_id);
        } elseif ($user->role === 'student') {
            $query->where('status', 'published')
                ->where(fn ($deadline) => $deadline->whereNull('application_deadline')->orWhere('application_deadline', '>=', now()))
                ->where(function ($institution): void {
                    $institution
                        ->where(function ($university): void {
                            $university->where('institution_type', 'university')
                                ->whereHas('university', fn ($owner) => $owner
                                    ->where('access_status', 'active')
                                    ->whereNotNull('email_verified_at'));
                        })
                        ->orWhere(function ($school): void {
                            $school->where('institution_type', 'school')
                                ->whereHas('school.users', fn ($coordinator) => $coordinator
                                    ->whereIn('role', ['school', 'high_school'])
                                    ->where('access_status', 'active')
                                    ->whereNotNull('email_verified_at'));
                        });
                });
        } else {
            abort_unless($user->role === 'admin', 403);
        }

        $programs = $query->latest()->paginate(min(100, max(1, $request->integer('per_page', 30))));

        return response()->json($programs);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['admin', 'university', 'school', 'high_school'], true), 403);

        $validated = $this->validateProgram($request);
        [$institutionType, $universityId, $schoolId] = $this->ownerFor($request, $validated);

        $program = InstitutionProgram::create($this->programPayload($validated, $institutionType, $universityId, $schoolId));

        return $this->success($request, $program, 'Program created successfully.', 201);
    }

    public function update(Request $request, InstitutionProgram $program): RedirectResponse|JsonResponse
    {
        $this->authorizeProgram($request, $program);
        $validated = $this->validateProgram($request, $program);

        $program = DB::transaction(function () use ($program, $validated): InstitutionProgram {
            $lockedProgram = InstitutionProgram::query()->lockForUpdate()->findOrFail($program->id);
            $acceptedCount = $lockedProgram->applications()->where('status', 'accepted')->count();
            $nextCapacity = $validated['capacity'] ?? null;

            abort_if(
                $nextCapacity !== null && $nextCapacity < $acceptedCount,
                422,
                'Capacity cannot be lower than the number of accepted applications.'
            );

            $lockedProgram->update($this->programPayload(
                $validated,
                $lockedProgram->institution_type,
                $lockedProgram->university_user_id,
                $lockedProgram->school_id,
            ));

            return $lockedProgram;
        });

        return $this->success($request, $program->fresh(), 'Program updated successfully.');
    }

    public function destroy(Request $request, InstitutionProgram $program): RedirectResponse|JsonResponse
    {
        $this->authorizeProgram($request, $program);

        if ($program->applications()->exists()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Programs with application history must be closed instead of deleted.'], 422);
            }

            return back()->withErrors(['program' => 'Programs with application history must be closed instead of deleted.']);
        }

        $program->delete();

        return $request->expectsJson()
            ? response()->json(status: 204)
            : back()->with('status', 'Program deleted.');
    }

    /** @return array<string, mixed> */
    private function validateProgram(Request $request, ?InstitutionProgram $program = null): array
    {
        return $request->validate([
            'institution_type' => ['sometimes', Rule::in(['university', 'school'])],
            'university_user_id' => ['nullable', Rule::exists('users', 'id')->where('role', 'university')],
            'school_id' => ['nullable', 'exists:schools,id'],
            'name' => ['required', 'string', 'max:180'],
            'code' => [
                'required',
                'string',
                'max:40',
                'regex:/^[A-Za-z0-9._-]+$/',
                function (string $attribute, mixed $value, \Closure $fail) use ($request, $program): void {
                    $query = InstitutionProgram::query()->where('code', strtoupper((string) $value));
                    if ($program) {
                        $query->whereKeyNot($program->id);
                    }

                    $owner = $program
                        ? [$program->institution_type, $program->university_user_id, $program->school_id]
                        : $this->ownerFor($request, $request->all());

                    $owner[0] === 'university'
                        ? $query->where('university_user_id', $owner[1])
                        : $query->where('school_id', $owner[2]);

                    if ($query->exists()) {
                        $fail('That program code is already in use by this institution.');
                    }
                },
            ],
            'level' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:5000'],
            'requirements' => ['nullable', 'string', 'max:10000'],
            'location' => ['nullable', 'string', 'max:255'],
            'application_deadline' => ['nullable', 'date'],
            'application_fee' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'currency' => ['required', 'string', 'size:3'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'status' => ['required', Rule::in(['draft', 'published', 'closed'])],
        ]);
    }

    /** @param array<string, mixed> $validated
     * @return array{0: string, 1: int|null, 2: int|null}
     */
    private function ownerFor(Request $request, array $validated): array
    {
        $user = $request->user();

        if ($user->role === 'university') {
            return ['university', $user->id, null];
        }

        if (in_array($user->role, ['school', 'high_school'], true)) {
            abort_unless($user->school_id, 422, 'Your account must be linked to a school before managing programs.');

            return ['school', null, $user->school_id];
        }

        $institutionType = $validated['institution_type'] ?? null;
        abort_unless(in_array($institutionType, ['university', 'school'], true), 422, 'institution_type is required.');

        if ($institutionType === 'university') {
            $universityId = isset($validated['university_user_id']) ? (int) $validated['university_user_id'] : null;
            abort_unless($universityId && User::query()->whereKey($universityId)->where('role', 'university')->exists(), 422, 'Select a university account.');

            return ['university', $universityId, null];
        }

        $schoolId = isset($validated['school_id']) ? (int) $validated['school_id'] : null;
        abort_unless($schoolId, 422, 'Select a school.');

        return ['school', null, $schoolId];
    }

    /** @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    private function programPayload(array $validated, string $institutionType, ?int $universityId, ?int $schoolId): array
    {
        return [
            'institution_type' => $institutionType,
            'university_user_id' => $universityId,
            'school_id' => $schoolId,
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'level' => $validated['level'] ?? null,
            'description' => $validated['description'] ?? null,
            'requirements' => $validated['requirements'] ?? null,
            'location' => $validated['location'] ?? null,
            'application_deadline' => $validated['application_deadline'] ?? null,
            'application_fee' => $validated['application_fee'],
            'currency' => strtoupper($validated['currency']),
            'capacity' => $validated['capacity'] ?? null,
            'status' => $validated['status'],
        ];
    }

    private function authorizeProgram(Request $request, InstitutionProgram $program): void
    {
        $user = $request->user();
        $allowed = $user?->role === 'admin'
            || ($user?->role === 'university' && $program->university_user_id === $user->id)
            || ($user?->isSchool() && $user->school_id && $program->school_id === $user->school_id);

        abort_unless($allowed, 403);
    }

    private function success(Request $request, InstitutionProgram $program, string $message, int $status = 200): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'data' => $program->loadMissing(['university:id,name', 'school:id,name,location']),
            ], $status);
        }

        return back()->with('status', $message);
    }
}
