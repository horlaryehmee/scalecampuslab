<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Registration;
use App\Models\School;
use App\Models\SystemLog;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WaitlistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegistrationController extends Controller
{
    public function __construct(
        private readonly WaitlistService $waitlist,
        private readonly NotificationService $notifications,
    ) {}

    public function index(Request $request, Event $event): JsonResponse
    {
        abort_unless($request->user()->role === 'admin' || $request->user()->id === $event->university_id, 403);

        return response()->json($event->registrations()->with(['student:id,name,email', 'school:id,name'])->paginate(50));
    }

    public function mine(Request $request): JsonResponse
    {
        $registrations = Registration::query()
            ->with(['event:id,title,event_date,location,status', 'school:id,name', 'student:id,name,email'])
            ->when($request->user()->role === 'student', fn ($query) => $query->where('student_id', $request->user()->id))
            ->when($request->user()->isSchool(), fn ($query) => $query->where('school_id', $request->user()->school_id))
            ->latest()
            ->paginate(30);

        return response()->json($registrations);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        abort_unless($event->status === 'published', 422, 'Only published events accept registrations.');

        $validated = $request->validate([
            'student_id' => ['sometimes', 'integer', 'exists:users,id'],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
        ]);

        $studentId = $request->user()->role === 'student' ? $request->user()->id : ($validated['student_id'] ?? null);
        abort_unless($studentId, 422, 'student_id is required for school bookings.');

        if ($request->user()->isSchool()) {
            $validated['school_id'] = $validated['school_id'] ?? $request->user()->school_id;
            abort_unless($validated['school_id'], 422, 'school_id is required for school bookings.');

            $student = User::query()->whereKey($studentId)->where('role', 'student')->firstOrFail();
            abort_unless($student->school_id === $request->user()->school_id, 403, 'The student does not belong to your school.');
        }

        $registration = DB::transaction(function () use ($event, $studentId, $validated) {
            $event = Event::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            $status = $this->waitlist->statusFor($event);

            return Registration::updateOrCreate(
                ['event_id' => $event->id, 'student_id' => $studentId],
                [
                    'school_id' => $validated['school_id'] ?? null,
                    'status' => $status,
                ]
            );
        });

        $student = User::findOrFail($studentId);
        $this->notifications->queue($student, "Your registration for {$event->title} is {$registration->status}.");
        $this->notifySchoolAccounts($registration, "A student registration for {$event->title} is {$registration->status}.");
        $this->log($request, 'booking.created', $registration, [
            'event_id' => $event->id,
            'student_id' => $studentId,
            'status' => $registration->status,
        ]);

        return response()->json($registration->load('event:id,title,event_date'), 201);
    }

    public function groupStore(Request $request, Event $event): JsonResponse
    {
        abort_unless($request->user()->isSchool() || $request->user()->role === 'admin', 403);
        abort_unless($event->status === 'published', 422, 'Only published events accept registrations.');

        $validated = $request->validate([
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $actor = $request->user();
        $schoolId = (int) ($validated['school_id'] ?? $actor->school_id);
        abort_unless($schoolId, 422, 'school_id is required.');

        if ($actor->isSchool()) {
            abort_unless($actor->school_id, 422, 'Your school account is not linked to a school.');
            abort_unless(
                $schoolId === (int) $actor->school_id,
                403,
                'You can only create group bookings for your own school.'
            );
        }

        $studentIds = array_values(array_unique(array_map('intval', $validated['student_ids'])));
        $students = User::query()
            ->whereIn('id', $studentIds)
            ->where('role', 'student')
            ->get()
            ->keyBy('id');
        abort_unless($students->count() === count($studentIds), 404, 'One or more students were not found.');

        foreach ($studentIds as $studentId) {
            $student = $students->get($studentId);
            abort_unless($student->school_id === $schoolId, 403, 'One or more students do not belong to the selected school.');
        }

        $registrations = DB::transaction(function () use ($event, $studentIds, $schoolId) {
            $lockedEvent = Event::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            $registrations = [];

            foreach ($studentIds as $studentId) {
                $status = $this->waitlist->statusFor($lockedEvent);

                $registrations[] = Registration::updateOrCreate(
                    ['event_id' => $lockedEvent->id, 'student_id' => $studentId],
                    ['school_id' => $schoolId, 'status' => $status]
                );
            }

            return $registrations;
        });

        foreach ($registrations as $registration) {
            $this->log($request, 'booking.group_created', $registration, [
                'event_id' => $event->id,
                'student_id' => $registration->student_id,
                'school_id' => $schoolId,
                'status' => $registration->status,
            ]);

            $this->notifications->queue(
                $registration->student,
                "Your school booked you for {$event->title}. Status: {$registration->status}."
            );
        }

        School::query()
            ->with('users')
            ->find($schoolId)
            ?->users
            ->each(fn (User $user) => $this->notifications->queue($user, "Group booking submitted for {$event->title}."));

        return response()->json(['registrations' => $registrations], 201);
    }

    public function cancel(Request $request, Registration $registration): JsonResponse
    {
        $event = $registration->event;
        abort_unless(
            $request->user()->role === 'admin'
            || $request->user()->id === $registration->student_id
            || $request->user()->id === $event->university_id
            || ($request->user()->isSchool() && $request->user()->school_id === $registration->school_id),
            403
        );

        $wasConfirmed = $registration->status === 'confirmed';
        $registration->update(['status' => 'cancelled']);

        $promoted = $wasConfirmed ? $this->waitlist->promoteNext($event) : null;

        if ($promoted) {
            $this->notifications->queue($promoted->student, "You have been promoted from waitlist for {$event->title}.");
            $this->notifySchoolAccounts($promoted, "A waitlisted student was promoted for {$event->title}.");
        }

        $this->notifications->queue($registration->student, "Your registration for {$event->title} was cancelled.");
        $this->notifySchoolAccounts($registration, "A school booking for {$event->title} was cancelled.");

        $this->log($request, 'booking.cancelled', $registration, [
            'event_id' => $event->id,
            'student_id' => $registration->student_id,
            'promoted_id' => $promoted?->id,
        ]);

        return response()->json(['registration' => $registration, 'promoted' => $promoted]);
    }

    private function log(Request $request, string $action, Registration $registration, array $metadata = []): void
    {
        SystemLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => Registration::class,
            'subject_id' => $registration->id,
            'metadata' => $metadata,
        ]);
    }

    private function notifySchoolAccounts(Registration $registration, string $content): void
    {
        if (! $registration->school_id) {
            return;
        }

        School::query()
            ->with('users')
            ->find($registration->school_id)
            ?->users
            ->each(fn (User $user) => $this->notifications->queue($user, $content));
    }
}
