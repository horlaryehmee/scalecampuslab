<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentDirectoryController extends WorkflowController
{
    public function index(Request $request): JsonResponse
    {
        $actor = $this->requireRole($request, 'school', 'admin');
        $role = $this->workflow->normalizedRole($actor);
        $query = User::query()
            ->where('role', 'student')
            ->when($request->boolean('eligible'), fn ($builder) => $builder
                ->where('access_status', 'active')
                ->whereNotNull('email_verified_at'))
            ->when($role === 'school', function ($builder) use ($actor): void {
                $actor->school_id
                    ? $builder->where('school_id', $actor->school_id)
                    : $builder->whereRaw('1 = 0');
            })
            ->when($role === 'admin' && $request->filled('school_id'), fn ($builder) => $builder->where('school_id', $request->integer('school_id')))
            ->when($request->filled('q'), function ($builder) use ($request): void {
                $term = '%'.$request->string('q')->toString().'%';
                $builder->where(fn ($nested) => $nested->where('name', 'like', $term)->orWhere('email', 'like', $term));
            })
            ->orderBy('name');
        $students = $query->paginate(min(200, max(1, $request->integer('per_page', 50))));
        $studentIds = collect($students->items())->pluck('id');
        $directParticipationCounts = EventRegistration::query()
            ->whereIn('user_id', $studentIds)
            ->where('registrant_type', 'student')
            ->where('status', '!=', 'cancelled')
            ->select('user_id')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('user_id')
            ->pluck('aggregate', 'user_id');
        $assignedParticipationCounts = EventRegistrationStudent::query()
            ->whereIn('user_id', $studentIds)
            ->where('status', '!=', 'cancelled')
            ->select('user_id')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('user_id')
            ->pluck('aggregate', 'user_id');

        return $this->data(
            collect($students->items())->map(fn (User $student) => $this->studentPayload(
                $student,
                (int) ($directParticipationCounts->get($student->id, 0))
                    + (int) ($assignedParticipationCounts->get($student->id, 0)),
            ))->all(),
            meta: [
                'current_page' => $students->currentPage(),
                'last_page' => $students->lastPage(),
                'total' => $students->total(),
            ],
        );
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->requireRole($request, 'school', 'admin');
        $role = $this->workflow->normalizedRole($actor);
        $validated = $request->validate([
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:180', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:60'],
            'student_identifier' => ['nullable', 'string', 'max:120'],
            'grade_level' => ['nullable', 'string', 'max:40'],
            'interest_major' => ['nullable', 'string', 'max:120'],
        ]);
        $schoolId = $role === 'school' ? $actor->school_id : ($validated['school_id'] ?? null);
        abort_unless($schoolId, 422, 'school_id is required when adding a student.');

        $student = User::create([
            'school_id' => $schoolId,
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'phone' => $validated['phone'] ?? null,
            'student_identifier' => $validated['student_identifier'] ?? null,
            'grade_level' => $validated['grade_level'] ?? null,
            'interest_major' => $validated['interest_major'] ?? null,
            'role' => 'student',
            'access_status' => 'active',
            'password' => Str::random(48),
        ]);
        $student->sendEmailVerificationNotification();
        $resetStatus = Password::sendResetLink(['email' => $student->email]);

        return $this->data([
            'student' => $this->studentPayload($student, 0),
            'setup_email_sent' => $resetStatus === Password::RESET_LINK_SENT,
            'message' => 'Student added. Verification and password setup instructions were sent by email.',
        ], 201);
    }

    public function update(Request $request, User $student): JsonResponse
    {
        $actor = $this->requireRole($request, 'school', 'admin');
        abort_unless($student->role === 'student', 404);
        if ($this->workflow->normalizedRole($actor) === 'school') {
            abort_unless($actor->school_id && $actor->school_id === $student->school_id, 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email:rfc', 'max:180', Rule::unique('users', 'email')->ignore($student->id)],
            'phone' => ['nullable', 'string', 'max:60'],
            'student_identifier' => ['nullable', 'string', 'max:120'],
            'grade_level' => ['nullable', 'string', 'max:40'],
            'interest_major' => ['nullable', 'string', 'max:120'],
            'access_status' => ['sometimes', Rule::in(['active', 'suspended'])],
        ]);
        $emailChanged = isset($validated['email']) && strtolower(trim($validated['email'])) !== $student->email;
        if ($emailChanged) {
            $validated['email'] = strtolower(trim($validated['email']));
            $validated['email_verified_at'] = null;
        }
        $student->update($validated);
        if ($emailChanged) {
            $student->sendEmailVerificationNotification();
        }

        $participations = EventRegistration::query()
            ->where('user_id', $student->id)
            ->where('registrant_type', 'student')
            ->where('status', '!=', 'cancelled')
            ->count()
            + EventRegistrationStudent::query()
                ->where('user_id', $student->id)
                ->where('status', '!=', 'cancelled')
                ->count();

        return $this->data($this->studentPayload($student->fresh(), $participations));
    }

    private function studentPayload(User $student, int $participations): array
    {
        return [
            'id' => $student->id,
            'school_id' => $student->school_id,
            'name' => $student->name,
            'email' => $student->email,
            'phone' => $student->phone,
            'student_identifier' => $student->student_identifier,
            'grade_level' => $student->grade_level,
            'interest_major' => $student->interest_major,
            'access_status' => $student->access_status,
            'email_verified' => $student->hasVerifiedEmail(),
            'participations_count' => $participations,
            'updated_at' => $student->updated_at?->toIso8601String(),
        ];
    }
}
