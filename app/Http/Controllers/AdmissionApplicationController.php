<?php

namespace App\Http\Controllers;

use App\Models\AdmissionApplication;
use App\Models\InstitutionProgram;
use App\Models\User;
use App\Services\PlatformNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdmissionApplicationController extends Controller
{
    public function __construct(private readonly PlatformNotifier $notifier) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = AdmissionApplication::query()
            ->with(['student:id,name,email,school_id', 'program.university:id,name', 'program.school:id,name'])
            ->withCount(['documents', 'payments']);

        if ($user->role === 'student') {
            $query->where('student_user_id', $user->id);
        } elseif ($user->role === 'university') {
            $query->whereNotNull('submitted_at')
                ->where('status', '!=', 'draft')
                ->whereHas('program', fn ($program) => $program->where('university_user_id', $user->id));
        } elseif ($user->isSchool()) {
            abort_unless($user->school_id, 403);
            $query->whereNotNull('submitted_at')
                ->where('status', '!=', 'draft')
                ->whereHas('program', fn ($program) => $program->where('school_id', $user->school_id));
        } else {
            abort_unless($user->role === 'admin', 403);
            $query->whereNotNull('submitted_at')->where('status', '!=', 'draft');
        }

        $applications = $query
            ->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')))
            ->latest()
            ->paginate(min(100, max(1, $request->integer('per_page', 30))));

        return response()->json($applications);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $student = $request->user();
        abort_unless($student?->role === 'student', 403);

        $validated = $request->validate([
            'institution_program_id' => ['required', 'exists:institution_programs,id'],
            'personal_statement' => ['nullable', 'string', 'max:10000'],
            'academic_summary' => ['nullable', 'string', 'max:5000'],
            'submit' => ['nullable', 'boolean'],
        ]);

        $program = InstitutionProgram::query()
            ->with(['university:id,name,email,access_status,email_verified_at', 'school.users:id,name,email,role,school_id,access_status,email_verified_at'])
            ->findOrFail($validated['institution_program_id']);

        abort_unless($program->status === 'published', 422, 'This program is not accepting applications.');
        abort_if($program->application_deadline?->isPast(), 422, 'The application deadline has passed.');
        $recipients = $this->institutionRecipients($program);
        abort_if($recipients->isEmpty(), 422, 'This institution is not currently accepting applications.');

        $submit = $request->boolean('submit');
        $application = DB::transaction(function () use ($student, $program, $validated, $submit): AdmissionApplication {
            $application = AdmissionApplication::query()->firstOrNew([
                'student_user_id' => $student->id,
                'institution_program_id' => $program->id,
            ]);

            if ($application->exists && ! in_array($application->status, ['draft', 'withdrawn'], true)) {
                abort(409, 'You already submitted an application for this program.');
            }

            $application->fill([
                'reference' => $application->reference ?: $this->reference(),
                'status' => $submit ? 'submitted' : 'draft',
                'personal_statement' => $validated['personal_statement'] ?? null,
                'academic_summary' => $validated['academic_summary'] ?? null,
                'submitted_at' => $submit ? now() : null,
                'reviewed_by_user_id' => null,
                'reviewed_at' => null,
                'decision_note' => null,
            ])->save();

            return $application;
        });

        if ($submit) {
            foreach ($recipients as $recipient) {
                $this->notifier->notify(
                    $recipient,
                    'New application received',
                    "{$student->name} submitted an application for {$program->name} ({$application->reference}).",
                    'application.submitted',
                    ['application_id' => $application->id, 'program_id' => $program->id],
                );
            }
        }

        $message = $submit ? 'Application submitted successfully.' : 'Application draft saved.';

        return $this->success($request, $application, $message, 201);
    }

    public function decide(Request $request, AdmissionApplication $application): RedirectResponse|JsonResponse
    {
        $this->authorizeReviewer($request, $application);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['under_review', 'waitlisted', 'accepted', 'rejected'])],
            'decision_note' => ['nullable', 'string', 'max:5000'],
        ]);

        $application = DB::transaction(function () use ($application, $request, $validated): AdmissionApplication {
            $lockedApplication = AdmissionApplication::query()
                ->lockForUpdate()
                ->findOrFail($application->id);
            abort_if(in_array($lockedApplication->status, ['draft', 'withdrawn'], true), 422, 'Only submitted applications can be reviewed.');

            $program = InstitutionProgram::query()->lockForUpdate()->findOrFail($lockedApplication->institution_program_id);
            if ($validated['status'] === 'accepted' && $program->capacity !== null) {
                $acceptedCount = AdmissionApplication::query()
                    ->where('institution_program_id', $program->id)
                    ->where('status', 'accepted')
                    ->whereKeyNot($lockedApplication->id)
                    ->count();

                abort_if(
                    $acceptedCount >= $program->capacity,
                    422,
                    'This program has reached its enrollment capacity. Waitlist or reject the application instead.'
                );
            }

            $lockedApplication->update([
                'status' => $validated['status'],
                'decision_note' => $validated['decision_note'] ?? null,
                'reviewed_by_user_id' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            return $lockedApplication;
        });

        $application->loadMissing(['student', 'program']);
        $label = str_replace('_', ' ', $validated['status']);
        $this->notifier->notify(
            $application->student,
            'Application status updated',
            "Your application for {$application->program->name} is now {$label}.",
            'application.status_changed',
            ['application_id' => $application->id, 'status' => $validated['status']],
        );

        return $this->success($request, $application, 'Application status updated.');
    }

    public function withdraw(Request $request, AdmissionApplication $application): RedirectResponse|JsonResponse
    {
        abort_unless($request->user()?->role === 'student' && $application->student_user_id === $request->user()->id, 403);
        abort_if(in_array($application->status, ['accepted', 'rejected', 'withdrawn'], true), 422, 'This application can no longer be withdrawn.');

        $application->update(['status' => 'withdrawn']);

        return $this->success($request, $application, 'Application withdrawn.');
    }

    private function authorizeReviewer(Request $request, AdmissionApplication $application): void
    {
        $application->loadMissing('program');
        $user = $request->user();
        $allowed = $user?->role === 'admin'
            || ($user?->role === 'university' && $application->program->university_user_id === $user->id)
            || ($user?->isSchool() && $user->school_id && $application->program->school_id === $user->school_id);

        abort_unless($allowed, 403);
    }

    /** @return Collection<int, User> */
    private function institutionRecipients(InstitutionProgram $program)
    {
        if ($program->institution_type === 'university') {
            return collect([$program->university])->filter(fn (?User $university): bool => $university !== null
                && $university->access_status === 'active'
                && $university->email_verified_at !== null);
        }

        return $program->school?->users
            ->whereIn('role', ['school', 'high_school'])
            ->where('access_status', 'active')
            ->whereNotNull('email_verified_at')
            ->take(10)
            ->values() ?? collect();
    }

    private function reference(): string
    {
        do {
            $reference = 'SCL-'.now()->format('Y').'-'.strtoupper(Str::random(10));
        } while (AdmissionApplication::query()->where('reference', $reference)->exists());

        return $reference;
    }

    private function success(Request $request, AdmissionApplication $application, string $message, int $status = 200): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'data' => $application->fresh()->load(['student:id,name,email,school_id', 'program.university:id,name', 'program.school:id,name']),
            ], $status);
        }

        return back()->with('status', $message);
    }
}
