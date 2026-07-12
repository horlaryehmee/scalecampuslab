<?php

namespace App\Http\Controllers;

use App\Models\VisitArchive;
use App\Models\VisitRequest;
use App\Models\VisitTask;
use App\Models\CampusEvent;
use App\Models\PlatformNotification;
use App\Models\TargetSchool;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class VisitOperationsController extends Controller
{
    public function storeRequest(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless(in_array($user?->role, ['university', 'school', 'high_school'], true), 403);

        $rules = [
            'requested_window' => ['required', 'date', 'after_or_equal:today'],
            'group_size' => ['required', 'integer', 'min:1', 'max:10000'],
            'priority' => ['required', 'integer', 'min:1', 'max:5'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];

        if ($user->role === 'university') {
            $rules['target_school_id'] = ['required', 'exists:target_schools,id'];
        } else {
            $rules['campus_event_id'] = ['required', 'exists:campus_events,id'];
        }

        $validated = $request->validate($rules);

        if ($user->role === 'university') {
            VisitRequest::create([
                ...$validated,
                'requested_by_user_id' => $user->id,
                'requested_window' => Carbon::parse($validated['requested_window'])->format('M d, Y'),
                'status' => 'requested',
            ]);

            return back()->with('status', 'Visit request added to the pipeline.');
        }

        $event = CampusEvent::query()
            ->whereKey($validated['campus_event_id'])
            ->where('status', 'published')
            ->firstOrFail();

        $school = $user->school;
        $schoolName = $school?->name ?: $user->name;
        $location = $school?->location ?: 'School portal';
        [$city, $region] = array_pad(array_map('trim', explode(',', $location, 2)), 2, 'United States');

        $targetSchool = TargetSchool::firstOrCreate(
            ['name' => $schoolName],
            [
                'city' => $city ?: 'School portal',
                'region' => $region ?: 'United States',
                'country' => 'United States',
                'school_type' => 'private',
                'performance_tier' => 'stable',
                'match_score' => 72,
                'active_applicants' => 0,
                'notes' => 'Created from the School portal request workflow.',
            ]
        );

        $visitRequest = VisitRequest::updateOrCreate(
            [
                'campus_event_id' => $event->id,
                'requested_by_user_id' => $user->id,
            ],
            [
                'target_school_id' => $targetSchool->id,
                'requested_window' => Carbon::parse($validated['requested_window'])->format('M d, Y'),
                'group_size' => $validated['group_size'],
                'priority' => $validated['priority'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'requested',
            ]
        );

        PlatformNotification::create([
            'user_id' => $event->university_user_id,
            'campus_event_id' => $event->id,
            'channel' => 'in_app',
            'subject' => 'New school visit request',
            'body' => "{$schoolName} requested {$validated['group_size']} seats for {$event->title}.",
            'status' => 'queued',
        ]);

        return back()->with('status', "Visit request REQ-{$visitRequest->id} submitted.");
    }

    public function schedulePartnerVisit(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $event = CampusEvent::query()
            ->where('university_user_id', $request->user()->id)
            ->where('status', 'published')
            ->where('starts_at', '>', now())
            ->orderBy('starts_at')
            ->first();

        if (! $event) {
            return back()->withErrors(['school_visit' => 'Publish an upcoming event before scheduling a partner school visit.']);
        }

        VisitRequest::firstOrCreate(
            ['target_school_id' => $school->id, 'campus_event_id' => $event->id],
            [
                'requested_by_user_id' => $request->user()->id,
                'requested_window' => $event->starts_at->format('M d, Y - h:i A'),
                'group_size' => max(15, $school->active_applicants),
                'status' => 'requested',
                'priority' => max(1, min(5, (int) ceil($school->match_score / 20))),
                'notes' => 'Partner school visit scheduled from the University Schools workspace.',
            ]
        );

        return back()->with('status', "Visit planning started for {$school->name}.");
    }

    public function decideRequest(Request $request, VisitRequest $visitRequest): RedirectResponse
    {
        $user = $request->user();
        abort_unless(in_array($user?->role, ['university', 'school', 'high_school', 'admin'], true), 403);

        $validated = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'declined', 'scheduled'])],
        ]);

        if ($user->role === 'university') {
            abort_unless(
                $visitRequest->event?->university_user_id === $user->id
                || $visitRequest->requested_by_user_id === $user->id
                || ($visitRequest->event === null && $visitRequest->requested_by_user_id === null),
                403
            );
        }

        if (in_array($user->role, ['school', 'high_school'], true)) {
            abort_unless($visitRequest->requested_by_user_id === $user->id, 403);
            abort_unless($validated['decision'] === 'declined', 403);
        }

        $visitRequest->update(['status' => $validated['decision']]);

        if ($visitRequest->event && $visitRequest->requested_by_user_id) {
            $recipientId = $user->role === 'university'
                ? $visitRequest->requested_by_user_id
                : $visitRequest->event->university_user_id;

            PlatformNotification::create([
                'user_id' => $recipientId,
                'campus_event_id' => $visitRequest->event->id,
                'channel' => 'in_app',
                'subject' => 'Visit request updated',
                'body' => "REQ-{$visitRequest->id} is now {$validated['decision']} for {$visitRequest->event->title}.",
                'status' => 'queued',
            ]);
        }

        return back()->with('status', $validated['decision'] === 'declined' ? 'Visit request cancelled.' : 'Visit request updated.');
    }

    public function syncArchive(Request $request, VisitArchive $archive): RedirectResponse
    {
        abort_unless(in_array($request->user()?->role, ['university', 'admin'], true), 403);

        $archive->update(['status' => 'synced']);

        return back()->with('status', 'Visit archive synced.');
    }

    public function updateTask(Request $request, VisitTask $task): RedirectResponse
    {
        abort_unless(in_array($request->user()?->role, ['university', 'admin'], true), 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'done'])],
        ]);

        $task->update(['status' => $validated['status']]);

        return back()->with('status', 'Visit task updated.');
    }
}
