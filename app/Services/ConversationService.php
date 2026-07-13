<?php

namespace App\Services;

use App\Models\AdmissionApplication;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\ConversationParticipant;
use App\Models\StudentDocument;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConversationService
{
    public function __construct(private readonly PlatformNotifier $notifier) {}

    public function recipients(User $actor, ?string $search, int $perPage): LengthAwarePaginator
    {
        $actorRole = $this->normalizedRole($actor);

        $query = User::query()
            ->with('school:id,name')
            ->whereKeyNot($actor->id)
            ->where('access_status', 'active')
            ->whereNotNull('email_verified_at');

        if ($actorRole !== 'admin') {
            $roles = $actorRole === 'student'
                ? ['admin', 'university', 'school', 'high_school']
                : ['admin', 'student'];

            $query->whereIn('role', $roles);
        }

        if ($search !== null && trim($search) !== '') {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], trim($search)).'%';

            $query->where(function (Builder $query) use ($actorRole, $term): void {
                $query->where('name', 'like', $term);

                if ($actorRole === 'admin') {
                    $query->orWhere('email', 'like', $term);
                }
            });
        }

        return $query
            ->orderBy('name')
            ->paginate($perPage);
    }

    public function conversations(User $actor, int $perPage): LengthAwarePaginator
    {
        return Conversation::query()
            ->whereHas('participants', fn (Builder $query) => $query->where('user_id', $actor->id))
            ->with($this->conversationRelations())
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function start(
        User $actor,
        User $recipient,
        string $subject,
        string $body,
        ?AdmissionApplication $application = null,
        ?StudentDocument $document = null,
    ): Conversation {
        $this->assertCompatible($actor, $recipient);
        $this->assertApplicationAccess($application, collect([$actor, $recipient]));
        $this->assertDocumentAttachment($actor, $application, $document);

        [$conversation, $message] = DB::transaction(function () use ($actor, $recipient, $subject, $body, $application, $document): array {
            $now = now();
            $conversation = Conversation::create([
                'created_by_user_id' => $actor->id,
                'admission_application_id' => $application?->id,
                'subject' => trim($subject),
                'last_message_at' => $now,
            ]);

            ConversationParticipant::insert([
                [
                    'conversation_id' => $conversation->id,
                    'user_id' => $actor->id,
                    'last_read_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'conversation_id' => $conversation->id,
                    'user_id' => $recipient->id,
                    'last_read_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);

            $message = ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_user_id' => $actor->id,
                'student_document_id' => $document?->id,
                'body' => trim($body),
            ]);

            return [$conversation, $message];
        });

        $this->notifyRecipient($recipient, $actor, $conversation, $message);

        return $conversation->load($this->conversationRelations());
    }

    public function reply(
        User $actor,
        Conversation $conversation,
        string $body,
        ?StudentDocument $document = null,
    ): ConversationMessage {
        $this->participant($actor, $conversation);
        $conversation->loadMissing('application');
        $this->assertDocumentAttachment($actor, $conversation->application, $document);

        $message = DB::transaction(function () use ($actor, $conversation, $body, $document): ConversationMessage {
            $lockedConversation = Conversation::query()->lockForUpdate()->findOrFail($conversation->id);
            $now = now();

            $message = ConversationMessage::create([
                'conversation_id' => $lockedConversation->id,
                'sender_user_id' => $actor->id,
                'student_document_id' => $document?->id,
                'body' => trim($body),
            ]);

            $lockedConversation->update(['last_message_at' => $now]);
            ConversationParticipant::query()
                ->where('conversation_id', $lockedConversation->id)
                ->where('user_id', $actor->id)
                ->update(['last_read_at' => $now]);

            return $message;
        });

        $recipients = $conversation->participants()
            ->with('user')
            ->where('user_id', '!=', $actor->id)
            ->get()
            ->pluck('user')
            ->filter(fn (?User $user) => $user?->access_status === 'active' && $user->hasVerifiedEmail());

        foreach ($recipients as $recipient) {
            $this->notifyRecipient($recipient, $actor, $conversation, $message);
        }

        return $message->load(['sender:id,name,role', 'document:id,original_name,mime_type,size,status']);
    }

    public function markRead(User $actor, Conversation $conversation): ConversationParticipant
    {
        $participant = $this->participant($actor, $conversation);
        $participant->forceFill(['last_read_at' => now()])->save();

        return $participant->refresh();
    }

    public function participant(User $actor, Conversation $conversation): ConversationParticipant
    {
        $participant = $conversation->participants()
            ->where('user_id', $actor->id)
            ->first();

        abort_unless($participant, 403, 'You are not a participant in this conversation.');

        return $participant;
    }

    /**
     * @param  Collection<int, Conversation>  $conversations
     * @return array<int, int>
     */
    public function unreadCounts(User $actor, Collection $conversations): array
    {
        if ($conversations->isEmpty()) {
            return [];
        }

        $participants = ConversationParticipant::query()
            ->where('user_id', $actor->id)
            ->whereIn('conversation_id', $conversations->pluck('id'))
            ->get()
            ->keyBy('conversation_id');

        $query = ConversationMessage::query()
            ->selectRaw('conversation_id, COUNT(*) AS aggregate')
            ->where('sender_user_id', '!=', $actor->id)
            ->where(function (Builder $query) use ($participants): void {
                foreach ($participants as $conversationId => $participant) {
                    $query->orWhere(function (Builder $query) use ($conversationId, $participant): void {
                        $query->where('conversation_id', $conversationId);

                        if ($participant->last_read_at) {
                            $query->where('created_at', '>', $participant->last_read_at);
                        }
                    });
                }
            })
            ->groupBy('conversation_id')
            ->pluck('aggregate', 'conversation_id');

        return $conversations
            ->mapWithKeys(fn (Conversation $conversation) => [
                $conversation->id => (int) ($query[$conversation->id] ?? 0),
            ])
            ->all();
    }

    /** @return array<int, string> */
    public function conversationRelations(): array
    {
        return [
            'participants.user:id,name,email,role,school_id,access_status,email_verified_at',
            'participants.user.school:id,name',
            'latestMessage.sender:id,name,role',
            'latestMessage.document:id,original_name,mime_type,size,status',
            'application:id,institution_program_id,reference,status,student_user_id',
            'application.program:id,university_user_id,school_id,institution_type,name',
        ];
    }

    public function normalizedRole(User $user): string
    {
        return in_array($user->role, ['school', 'high_school'], true) ? 'school' : $user->role;
    }

    private function assertCompatible(User $actor, User $recipient): void
    {
        if ($actor->is($recipient)) {
            throw ValidationException::withMessages([
                'recipient_user_id' => 'Choose another user as the recipient.',
            ]);
        }

        if ($recipient->access_status !== 'active' || ! $recipient->hasVerifiedEmail()) {
            throw ValidationException::withMessages([
                'recipient_user_id' => 'This recipient is not available for messaging.',
            ]);
        }

        $actorRole = $this->normalizedRole($actor);
        $recipientRole = $this->normalizedRole($recipient);
        $allowed = $actorRole === 'admin'
            || $recipientRole === 'admin'
            || ($actorRole === 'student' && in_array($recipientRole, ['university', 'school'], true))
            || ($recipientRole === 'student' && in_array($actorRole, ['university', 'school'], true));

        if (! $allowed) {
            throw ValidationException::withMessages([
                'recipient_user_id' => 'Messaging is not available between these account types.',
            ]);
        }
    }

    /** @param  Collection<int, User>  $participants */
    private function assertApplicationAccess(?AdmissionApplication $application, Collection $participants): void
    {
        if (! $application) {
            return;
        }

        $application->loadMissing('program');

        foreach ($participants as $participant) {
            abort_unless(
                $this->canAccessApplication($participant, $application),
                403,
                'This user cannot access the selected application.',
            );
        }
    }

    private function canAccessApplication(User $user, AdmissionApplication $application): bool
    {
        if ($this->normalizedRole($user) === 'admin') {
            return true;
        }

        if ($this->normalizedRole($user) === 'student') {
            return $application->student_user_id === $user->id;
        }

        $program = $application->program;

        return ($this->normalizedRole($user) === 'university' && $program->university_user_id === $user->id)
            || ($this->normalizedRole($user) === 'school' && $user->school_id && $program->school_id === $user->school_id);
    }

    private function assertDocumentAttachment(
        User $actor,
        ?AdmissionApplication $application,
        ?StudentDocument $document,
    ): void {
        if (! $document) {
            return;
        }

        $allowed = $application
            && $this->normalizedRole($actor) === 'student'
            && $document->student_user_id === $actor->id
            && $document->admission_application_id === $application->id;

        if (! $allowed) {
            throw ValidationException::withMessages([
                'student_document_id' => 'Only your document attached to this application can be included.',
            ]);
        }
    }

    private function notifyRecipient(
        User $recipient,
        User $sender,
        Conversation $conversation,
        ConversationMessage $message,
    ): void {
        $this->notifier->notify(
            $recipient,
            'New message from '.$sender->name,
            'You have a new message about "'.$conversation->subject.'".',
            'message.received',
            [
                'conversation_id' => $conversation->id,
                'message_id' => $message->id,
                'sender_user_id' => $sender->id,
                'admission_application_id' => $conversation->admission_application_id,
            ],
        );
    }
}
