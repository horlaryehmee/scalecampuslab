<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CampusEvent;
use App\Models\School;
use App\Models\VisitRequest;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VisitRequestController extends WorkflowController
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->string('status')->toString();
        $status = $status === 'rejected' ? 'declined' : $status;
        $query = $this->workflow->visibleVisits($request->user())
            ->when($request->filled('status'), fn ($builder) => $builder->where('status', $status))
            ->when($request->filled('campus_event_id'), fn ($builder) => $builder->where('campus_event_id', $request->integer('campus_event_id')))
            ->latest();
        $visits = $query->paginate(min(100, max(1, $request->integer('per_page', 25))));

        return $this->data(
            $this->workflow->visitPayloads($visits->items())->all(),
            meta: [
                'current_page' => $visits->currentPage(),
                'last_page' => $visits->lastPage(),
                'total' => $visits->total(),
            ],
        );
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->requireRole($request, 'university', 'admin');
        $validated = $request->validate([
            'campus_event_id' => ['required', 'integer', 'exists:campus_events,id'],
            'school_id' => ['required', 'integer', 'exists:schools,id'],
            'requested_window' => ['nullable', 'string', 'max:255'],
            'group_size' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $event = CampusEvent::findOrFail($validated['campus_event_id']);
        abort_unless($this->workflow->canManageEvent($actor, $event), 403);
        abort_if($event->status === 'cancelled', 422, 'Cancelled events cannot receive visit requests.');

        $school = School::findOrFail($validated['school_id']);
        $schoolUsers = $this->workflow->activeSchoolUsers($school->id);
        abort_if($schoolUsers->isEmpty(), 422, 'The selected school has no active coordinator account.');

        try {
            $visit = DB::transaction(function () use ($validated, $event, $actor, $school, $schoolUsers): VisitRequest {
                abort_if(
                    VisitRequest::query()->where('campus_event_id', $event->id)->where('school_id', $school->id)->exists(),
                    409,
                    'This school already has a visit request for the event.'
                );

                $visit = new VisitRequest;
                $visit->forceFill([
                    'target_school_id' => null,
                    'school_id' => $school->id,
                    'campus_event_id' => $event->id,
                    'requested_by_user_id' => $actor->id,
                    'requested_window' => $validated['requested_window'] ?? $event->starts_at->toIso8601String(),
                    'group_size' => $validated['group_size'] ?? 1,
                    'status' => 'requested',
                    'priority' => 1,
                    'notes' => $validated['notes'] ?? null,
                ]);
                $visit->save();

                $this->workflow->notifyUsers(
                    $schoolUsers->push($actor)->push($event->university_user_id),
                    'New campus visit request',
                    "{$event->title} was sent to {$school->name} for approval.",
                    'visit.requested',
                    $event,
                    VisitRequest::class,
                    $visit->id,
                    ['school_id' => $school->id, 'status' => 'requested'],
                );

                return $visit;
            });
        } catch (QueryException $exception) {
            if (str_contains(strtolower($exception->getMessage()), 'unique')) {
                abort(409, 'This school already has a visit request for the event.');
            }

            throw $exception;
        }

        return $this->data($this->workflow->visitPayload($visit->fresh()), 201);
    }

    public function decide(Request $request, VisitRequest $visitRequest): JsonResponse
    {
        $actor = $this->requireRole($request, 'school', 'admin');
        abort_unless($visitRequest->school_id && $visitRequest->campus_event_id, 404);

        if ($this->workflow->normalizedRole($actor) === 'school') {
            abort_unless($actor->school_id === $visitRequest->school_id, 403);
        }

        abort_unless($visitRequest->status === 'requested', 409, 'This visit request has already been decided.');
        $validated = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'decision_note' => ['nullable', 'string', 'max:2000'],
        ]);
        $event = CampusEvent::findOrFail($visitRequest->campus_event_id);
        abort_if($event->status === 'cancelled', 409, 'Cancelled events cannot have visit requests approved or rejected.');
        abort_unless($event->starts_at->isFuture(), 422, 'Past visit requests can no longer be decided.');
        $storedStatus = $validated['decision'] === 'approved' ? 'approved' : 'declined';

        DB::transaction(function () use ($visitRequest, $actor, $validated, $storedStatus, $event): void {
            $visitRequest->forceFill([
                'status' => $storedStatus,
                'responded_by_user_id' => $actor->id,
                'responded_at' => now(),
                'decision_note' => $validated['decision_note'] ?? null,
            ])->save();

            $school = School::find($visitRequest->school_id);
            $recipients = $this->workflow->activeSchoolUsers($visitRequest->school_id)
                ->push($event->university_user_id)
                ->push($actor);
            $this->workflow->notifyUsers(
                $recipients,
                'Campus visit request '.($storedStatus === 'approved' ? 'approved' : 'rejected'),
                ($school?->name ?? 'The school').' '.($storedStatus === 'approved' ? 'approved' : 'rejected')." the visit for {$event->title}.",
                $storedStatus === 'approved' ? 'visit.approved' : 'visit.rejected',
                $event,
                VisitRequest::class,
                $visitRequest->id,
                ['school_id' => $visitRequest->school_id, 'status' => $storedStatus],
            );
        });

        return $this->data($this->workflow->visitPayload($visitRequest->fresh()));
    }
}
