<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\User;
use App\Services\CampusWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function __construct(private readonly CampusWorkflowService $workflow) {}

    public function visits(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'student', 403);

        return response()->json([
            'data' => $this->studentVisitRows($request->user())->values(),
        ]);
    }

    public function visit(Request $request, string $visit): JsonResponse
    {
        abort_unless($request->user()?->role === 'student', 403);

        $row = $this->studentVisitRows($request->user())
            ->firstWhere('id', $visit);

        abort_unless($row, 404);

        return response()->json(['data' => $row]);
    }

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
            'password' => Str::random(64),
            'role' => 'student',
            'access_status' => 'pending',
            'school_id' => $schoolId,
            'student_identifier' => $validated['student_identifier'] ?? null,
            'grade_level' => $validated['grade_level'] ?? null,
            'interest_major' => $validated['interest_major'] ?? null,
            'assigned_events' => [],
            'email_verified_at' => null,
        ]);
        $setupEmailSent = $this->sendAccountSetup($student);

        return response()->json($this->studentAccountPayload($student, $setupEmailSent), 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'students' => ['nullable', 'array', 'max:500'],
            'students.*.name' => ['required_with:students', 'string', 'max:255'],
            'students.*.email' => ['required_with:students', 'email', 'max:255', 'distinct', 'unique:users,email'],
            'students.*.student_identifier' => ['nullable', 'string', 'max:40'],
            'students.*.grade_level' => ['nullable', 'string', 'max:40'],
            'students.*.interest_major' => ['nullable', 'string', 'max:120'],
            'csv' => ['nullable', 'string'],
        ]);

        $schoolId = $this->schoolIdFor($request, $validated['school_id'] ?? null);
        $rows = collect($validated['students'] ?? $this->studentsFromCsv($validated['csv'] ?? ''))
            ->map(function (array $row): array {
                $row['name'] = trim((string) ($row['name'] ?? ''));
                $row['email'] = Str::lower(trim((string) ($row['email'] ?? '')));

                return $row;
            })
            ->values()
            ->all();

        abort_unless(count($rows) > 0, 422, 'Provide at least one student.');

        validator(['students' => $rows], [
            'students' => ['required', 'array', 'min:1', 'max:500'],
            'students.*.name' => ['required', 'string', 'max:255'],
            'students.*.email' => ['required', 'email:rfc', 'max:255', 'distinct', 'unique:users,email'],
            'students.*.student_identifier' => ['nullable', 'string', 'max:40'],
            'students.*.grade_level' => ['nullable', 'string', 'max:40'],
            'students.*.interest_major' => ['nullable', 'string', 'max:120'],
        ])->validate();

        $students = DB::transaction(fn () => collect($rows)->map(
            fn (array $row): User => User::create([
                'name' => $row['name'],
                'email' => $row['email'],
                'password' => Str::random(64),
                'role' => 'student',
                'access_status' => 'pending',
                'school_id' => $schoolId,
                'student_identifier' => $row['student_identifier'] ?? null,
                'grade_level' => $row['grade_level'] ?? null,
                'interest_major' => $row['interest_major'] ?? null,
                'assigned_events' => [],
                'email_verified_at' => null,
            ])
        ));

        $created = $students
            ->map(fn (User $student): array => $this->studentAccountPayload($student, $this->sendAccountSetup($student)))
            ->all();

        return response()->json([
            'created' => $created,
            'setup_emails_sent' => collect($created)->where('setup_email_sent', true)->count(),
        ], 201);
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
        abort_if(
            EventRegistration::query()->where('user_id', $student->id)->exists()
            || EventRegistrationStudent::query()->where('user_id', $student->id)->exists(),
            409,
            'This student has campus participation records. Suspend the account to preserve attendance history.'
        );
        $student->delete();

        return response()->json(['message' => 'Student deleted.']);
    }

    private function validateStudent(Request $request, ?int $ignoreId = null, bool $updating = false): array
    {
        if ($request->has('email') && is_string($request->input('email'))) {
            $request->merge(['email' => Str::lower(trim($request->input('email')))]);
        }

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

    private function sendAccountSetup(User $student): bool
    {
        $student->sendEmailVerificationNotification();

        return Password::sendResetLink(['email' => $student->email]) === Password::RESET_LINK_SENT;
    }

    private function studentAccountPayload(User $student, bool $setupEmailSent): array
    {
        return [
            ...$student->only([
                'id',
                'name',
                'email',
                'school_id',
                'student_identifier',
                'grade_level',
                'interest_major',
                'assigned_events',
                'access_status',
            ]),
            'email_verified' => $student->hasVerifiedEmail(),
            'setup_email_sent' => $setupEmailSent,
        ];
    }

    private function studentVisitRows(User $student)
    {
        $direct = EventRegistration::query()
            ->with('event')
            ->where('user_id', $student->id)
            ->get()
            ->map(fn (EventRegistration $registration): array => $this->directVisitRow($registration));

        $assigned = EventRegistrationStudent::query()
            ->with('registration.event')
            ->where(function ($query) use ($student): void {
                $query->where('user_id', $student->id)
                    ->orWhere('email', $student->email);
            })
            ->get()
            ->map(fn (EventRegistrationStudent $studentRecord): array => $this->assignedVisitRow($studentRecord));

        return collect($direct->all())
            ->merge($assigned->all())
            ->filter(fn (array $row): bool => (bool) $row['event'])
            ->sortBy(fn (array $row): string => $row['starts_at'] ?: '9999-12-31')
            ->values();
    }

    private function directVisitRow(EventRegistration $registration): array
    {
        $event = $registration->event;
        $status = $this->studentVisitStatus(
            $registration->status,
            $registration->checked_in_at ?: $registration->attended_at
        );

        return [
            'id' => 'registration-'.$registration->id,
            'source' => 'direct',
            'event' => $event ? $this->eventPayload($event) : null,
            'title' => $event?->title,
            'date' => $event?->starts_at?->toIso8601String(),
            'starts_at' => $event?->starts_at?->toIso8601String(),
            'ends_at' => $event?->ends_at?->toIso8601String(),
            'location' => $event?->location ?: $event?->venue,
            'venue' => $event?->venue,
            'status' => $status,
            'raw_status' => $registration->status,
            'confirmed_at' => $registration->student_confirmed_at?->toIso8601String(),
            'itinerary' => $event ? $this->itineraryForEvent($event, $registration->visit_request_id) : [],
        ];
    }

    private function assignedVisitRow(EventRegistrationStudent $studentRecord): array
    {
        $registration = $studentRecord->registration;
        $event = $registration?->event;
        $status = $this->studentVisitStatus(
            $studentRecord->status,
            $studentRecord->checked_in_at ?: $registration?->attended_at
        );

        return [
            'id' => 'student-'.$studentRecord->id,
            'source' => 'school_assignment',
            'event' => $event ? $this->eventPayload($event) : null,
            'title' => $event?->title,
            'date' => $event?->starts_at?->toIso8601String(),
            'starts_at' => $event?->starts_at?->toIso8601String(),
            'ends_at' => $event?->ends_at?->toIso8601String(),
            'location' => $event?->location ?: $event?->venue,
            'venue' => $event?->venue,
            'status' => $status,
            'raw_status' => $studentRecord->status,
            'confirmed_at' => $studentRecord->student_confirmed_at?->toIso8601String(),
            'school_group' => $registration?->registrant_name,
            'student' => [
                'name' => $studentRecord->name,
                'email' => $studentRecord->email,
                'grade' => $studentRecord->grade_level,
                'interest' => $studentRecord->interest_major,
            ],
            'itinerary' => $event ? $this->itineraryForEvent($event, $registration?->visit_request_id) : [],
        ];
    }

    private function eventPayload($event): array
    {
        return [
            'id' => $event->id,
            'title' => $event->title,
            'description' => $event->description,
            'date' => $event->starts_at?->toIso8601String(),
            'starts_at' => $event->starts_at?->toIso8601String(),
            'ends_at' => $event->ends_at?->toIso8601String(),
            'location' => $event->location,
            'venue' => $event->venue,
            'status' => $event->status,
        ];
    }

    private function itineraryForEvent($event, ?int $visitRequestId): array
    {
        return $this->workflow->itineraryForParticipation($event, $visitRequestId);
    }

    private function studentVisitStatus(?string $recordStatus, mixed $attendedAt): string
    {
        if ($attendedAt) {
            return 'attended';
        }

        if ($recordStatus === 'confirmed') {
            return 'confirmed';
        }

        return $recordStatus ?: 'invited';
    }
}
