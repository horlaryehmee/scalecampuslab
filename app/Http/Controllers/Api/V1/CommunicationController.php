<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CampusEvent;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunicationController extends WorkflowController
{
    public function store(Request $request): JsonResponse
    {
        $actor = $this->requireRole($request, 'university', 'school', 'admin');
        $validated = $request->validate([
            'visit_request_id' => ['required', 'integer', 'exists:visit_requests,id'],
            'subject' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'min:2', 'max:5000'],
        ]);

        $visit = VisitRequest::query()
            ->whereKey($validated['visit_request_id'])
            ->whereNotNull('school_id')
            ->whereNotNull('campus_event_id')
            ->firstOrFail();
        abort_unless($this->workflow->canViewVisit($actor, $visit), 403);

        $event = CampusEvent::findOrFail($visit->campus_event_id);
        $role = $this->workflow->normalizedRole($actor);
        $recipients = match ($role) {
            'university' => $this->workflow->activeSchoolUsers($visit->school_id),
            'school' => User::query()->whereKey($event->university_user_id)->get(),
            'admin' => $this->workflow->activeSchoolUsers($visit->school_id)
                ->push(User::find($event->university_user_id)),
        };
        abort_if($recipients->filter()->isEmpty(), 422, 'This visit has no active message recipients.');

        $metadata = [
            'sender' => ['id' => $actor->id, 'name' => $actor->name, 'role' => $role],
            'visit_request_id' => $visit->id,
            'school_id' => $visit->school_id,
        ];
        $sent = $this->workflow->notifyUsers(
            $recipients,
            $validated['subject'],
            $validated['body'],
            'message.received',
            $event,
            VisitRequest::class,
            $visit->id,
            $metadata,
        );
        $this->workflow->notifyUsers(
            [$actor],
            'Sent: '.$validated['subject'],
            $validated['body'],
            'message.sent',
            $event,
            VisitRequest::class,
            $visit->id,
            $metadata + ['recipient_count' => $sent],
        );

        return $this->data([
            'message' => 'Message sent.',
            'recipients' => $sent,
            'visit_request_id' => $visit->id,
            'sent_at' => now()->toIso8601String(),
        ], 201);
    }
}
