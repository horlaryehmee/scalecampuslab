<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Models\School;
use App\Models\TargetSchool;
use App\Models\User;
use App\Models\VisitArchive;
use App\Models\VisitRequest;
use App\Models\VisitTask;
use App\Services\PlatformNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class VisitOperationsController extends Controller
{
    public function __construct(private readonly PlatformNotifier $notifier) {}

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
            $rules['school_id'] = ['required', 'exists:schools,id'];
            $rules['campus_event_id'] = ['required', 'exists:campus_events,id'];
        } else {
            $rules['campus_event_id'] = ['required', 'exists:campus_events,id'];
        }

        $validated = $request->validate($rules);

        if ($user->role === 'university') {
            $event = CampusEvent::query()
                ->whereKey($validated['campus_event_id'])
                ->where('university_user_id', $user->id)
                ->where('status', 'published')
                ->firstOrFail();
            $school = School::findOrFail($validated['school_id']);
            abort_unless($school->users()->whereIn('role', ['school', 'high_school'])->where('access_status', 'active')->whereNotNull('email_verified_at')->exists(), 422, 'This school has no active verified coordinator.');

            $visitRequest = $this->createOrReopenRequest($event, $school, $user, $validated);
            $recipients = $school->users()->whereIn('role', ['school', 'high_school'])->where('access_status', 'active')->whereNotNull('email_verified_at')->get();
            foreach ($recipients as $recipient) {
                $this->notifier->notify(
                    $recipient,
                    'New university visit request',
                    "{$user->name} invited {$school->name} to {$event->title} for {$validated['group_size']} student(s).",
                    'visit.requested',
                    ['visit_request_id' => $visitRequest->id, 'campus_event_id' => $event->id],
                    false,
                );
            }

            return back()->with('status', "Visit request REQ-{$visitRequest->id} sent to {$school->name}.");
        }

        abort_unless($user->school_id, 422, 'Your account must be linked to a school before requesting a visit.');
        $event = CampusEvent::query()
            ->whereKey($validated['campus_event_id'])
            ->where('status', 'published')
            ->firstOrFail();
        $school = School::findOrFail($user->school_id);
        $visitRequest = $this->createOrReopenRequest($event, $school, $user, $validated);

        $this->notifier->notify(
            $event->university,
            'New school visit request',
            "{$school->name} requested {$validated['group_size']} seats for {$event->title}.",
            'visit.requested',
            ['visit_request_id' => $visitRequest->id, 'campus_event_id' => $event->id],
            false,
        );

        return back()->with('status', "Visit request REQ-{$visitRequest->id} submitted.");
    }

    /** @param array<string, mixed> $validated */
    private function createOrReopenRequest(CampusEvent $event, School $school, User $requester, array $validated): VisitRequest
    {
        $existing = VisitRequest::query()
            ->where('campus_event_id', $event->id)
            ->where('school_id', $school->id)
            ->first();

        if ($existing && $existing->status !== 'declined') {
            abort(409, 'A visit request already exists for this school and event.');
        }

        $payload = [
            'school_id' => $school->id,
            'campus_event_id' => $event->id,
            'requested_by_user_id' => $requester->id,
            'requested_window' => Carbon::parse($validated['requested_window'])->format('M d, Y'),
            'group_size' => $validated['group_size'],
            'priority' => $validated['priority'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'requested',
            'responded_by_user_id' => null,
            'responded_at' => null,
            'decision_note' => null,
        ];

        if ($existing) {
            $existing->update($payload);

            return $existing;
        }

        return VisitRequest::create($payload);
    }

    /* Legacy target-school directories are retained for relationship notes, but
       scheduling always resolves to a real School tenant and canonical visit. */
    public function schedulePartnerVisit(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $recipientSchool = School::query()->where('name', $school->name)->first();
        if (! $recipientSchool) {
            return back()->withErrors(['school_visit' => 'This partner-school record is only an outreach directory entry. Create or link a registered School account before scheduling a visit request.']);
        }

        $event = CampusEvent::query()
            ->where('university_user_id', $request->user()->id)
            ->where('status', 'published')
            ->where('starts_at', '>', now())
            ->orderBy('starts_at')
            ->first();

        if (! $event) {
            return back()->withErrors(['school_visit' => 'Publish an upcoming event before scheduling a partner school visit.']);
        }

        $visit = $this->createOrReopenRequest($event, $recipientSchool, $request->user(), [
            'requested_window' => $event->starts_at,
            'group_size' => max(1, $school->active_applicants),
            'priority' => max(1, min(5, (int) ceil($school->match_score / 20))),
            'notes' => 'Partner school visit requested from the University Schools workspace.',
        ]);

        foreach ($recipientSchool->users()->whereIn('role', ['school', 'high_school'])->where('access_status', 'active')->whereNotNull('email_verified_at')->get() as $recipient) {
            $this->notifier->notify($recipient, 'New university visit request', "{$request->user()->name} invited {$recipientSchool->name} to {$event->title}.", 'visit.requested', ['visit_request_id' => $visit->id], false);
        }

        return back()->with('status', "Visit request sent to {$recipientSchool->name}.");
    }

    public function decideRequest(Request $request, VisitRequest $visitRequest): RedirectResponse
    {
        $user = $request->user();
        abort_unless(in_array($user?->role, ['university', 'school', 'high_school', 'admin'], true), 403);
        $visitRequest->loadMissing(['event.university', 'recipientSchool.users', 'requester']);

        $validated = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'declined', 'scheduled'])],
            'decision_note' => ['nullable', 'string', 'max:2000'],
        ]);

        if (! $visitRequest->school_id || ! $visitRequest->recipientSchool) {
            $isAdmin = $user->role === 'admin';
            $isEventOwner = $user->role === 'university' && $visitRequest->event?->university_user_id === $user->id;
            $isRequesterCancellation = $visitRequest->requested_by_user_id === $user->id && $validated['decision'] === 'declined';
            abort_unless($isAdmin || ($isEventOwner && $visitRequest->requested_by_user_id !== $user->id) || $isRequesterCancellation, 403);

            $visitRequest->update([
                'status' => $validated['decision'],
                'responded_by_user_id' => $user->id,
                'responded_at' => now(),
                'decision_note' => $validated['decision_note'] ?? null,
            ]);

            if ($visitRequest->requester && $visitRequest->requester->id !== $user->id) {
                $this->notifier->notify($visitRequest->requester, 'Visit request updated', "REQ-{$visitRequest->id} is now {$validated['decision']}.", 'visit.status_changed', ['visit_request_id' => $visitRequest->id], false);
            }

            return back()->with('status', 'Visit request updated.');
        }

        abort_unless($visitRequest->campus_event_id && $visitRequest->event, 403);

        $isAdmin = $user->role === 'admin';
        $isEventOwner = $user->role === 'university' && $visitRequest->event->university_user_id === $user->id;
        $isRecipientSchool = $user->isSchool() && $user->school_id === $visitRequest->school_id;
        $isRequester = $visitRequest->requested_by_user_id === $user->id;
        $requesterIsUniversity = $visitRequest->requester?->role === 'university';

        if ($validated['decision'] === 'scheduled') {
            abort_unless($visitRequest->status === 'approved' && ($isAdmin || $isEventOwner), 403);
        } elseif ($isRequester && $validated['decision'] === 'declined') {
            abort_unless($visitRequest->status === 'requested', 422, 'Only a pending request can be cancelled.');
        } elseif ($requesterIsUniversity) {
            abort_unless($isAdmin || $isRecipientSchool, 403);
        } else {
            abort_unless($isAdmin || $isEventOwner, 403);
        }

        abort_if(in_array($visitRequest->status, ['declined', 'scheduled'], true), 422, 'This request has already reached a final state.');

        $visitRequest->update([
            'status' => $validated['decision'],
            'responded_by_user_id' => $user->id,
            'responded_at' => now(),
            'decision_note' => $validated['decision_note'] ?? null,
        ]);

        $recipients = collect();
        if (! $isEventOwner) {
            $recipients->push($visitRequest->event->university);
        }
        if (! $isRecipientSchool) {
            $recipients = $recipients->merge($visitRequest->recipientSchool->users
                ->whereIn('role', ['school', 'high_school'])
                ->where('access_status', 'active')
                ->filter(fn (User $recipient) => $recipient->hasVerifiedEmail()));
        }
        if ($visitRequest->requester && $visitRequest->requester->id !== $user->id) {
            $recipients->push($visitRequest->requester);
        }

        foreach ($recipients->filter()->unique('id') as $recipient) {
            $this->notifier->notify(
                $recipient,
                'Visit request updated',
                "REQ-{$visitRequest->id} is now {$validated['decision']} for {$visitRequest->event->title}.",
                'visit.status_changed',
                ['visit_request_id' => $visitRequest->id, 'campus_event_id' => $visitRequest->event->id, 'status' => $validated['decision']],
                false,
            );
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
