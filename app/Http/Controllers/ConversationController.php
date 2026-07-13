<?php

namespace App\Http\Controllers;

use App\Models\AdmissionApplication;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\StudentDocument;
use App\Models\User;
use App\Services\ConversationService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function __construct(private readonly ConversationService $conversations) {}

    public function recipients(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $recipients = $this->conversations->recipients(
            $request->user(),
            $validated['search'] ?? null,
            (int) ($validated['per_page'] ?? 30),
        );

        return response()->json([
            'data' => collect($recipients->items())
                ->map(fn (User $user) => $this->recipientData($user, $request->user()))
                ->all(),
            'meta' => $this->paginationMeta($recipients),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $actor = $request->user();
        $conversations = $this->conversations->conversations(
            $actor,
            (int) ($validated['per_page'] ?? 30),
        );
        $items = collect($conversations->items());
        $unread = $this->conversations->unreadCounts($actor, $items);

        return response()->json([
            'data' => $items
                ->map(fn (Conversation $conversation) => $this->conversationData(
                    $conversation,
                    $actor,
                    $unread[$conversation->id] ?? 0,
                ))
                ->all(),
            'meta' => $this->paginationMeta($conversations),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateMessage($request, true);
        $application = isset($validated['admission_application_id'])
            ? AdmissionApplication::findOrFail($validated['admission_application_id'])
            : null;
        $document = isset($validated['student_document_id'])
            ? StudentDocument::findOrFail($validated['student_document_id'])
            : null;
        $conversation = $this->conversations->start(
            $request->user(),
            User::findOrFail($validated['recipient_user_id']),
            $validated['subject'],
            $validated['body'],
            $application,
            $document,
        );

        return response()->json([
            'data' => $this->conversationData($conversation, $request->user(), 0),
        ], 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $actor = $request->user();
        $participant = $this->conversations->participant($actor, $conversation);
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $conversation->load($this->conversations->conversationRelations());
        $messages = $conversation->messages()
            ->with([
                'sender:id,name,role',
                'document:id,original_name,mime_type,size,status',
            ])
            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 50));
        $unread = $this->conversations->unreadCounts($actor, collect([$conversation]));

        return response()->json([
            'data' => [
                'conversation' => $this->conversationData(
                    $conversation,
                    $actor,
                    $unread[$conversation->id] ?? 0,
                ),
                'messages' => collect($messages->items())
                    ->map(fn (ConversationMessage $message) => $this->messageData($message))
                    ->all(),
                'last_read_at' => $participant->last_read_at?->toIso8601String(),
            ],
            'meta' => $this->paginationMeta($messages) + ['message_order' => 'newest_first'],
        ]);
    }

    public function reply(Request $request, Conversation $conversation): JsonResponse
    {
        $validated = $this->validateMessage($request, false);
        $document = isset($validated['student_document_id'])
            ? StudentDocument::findOrFail($validated['student_document_id'])
            : null;
        $message = $this->conversations->reply(
            $request->user(),
            $conversation,
            $validated['body'],
            $document,
        );

        return response()->json(['data' => $this->messageData($message)], 201);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $participant = $this->conversations->markRead($request->user(), $conversation);

        return response()->json([
            'data' => [
                'conversation_id' => $conversation->id,
                'last_read_at' => $participant->last_read_at?->toIso8601String(),
                'unread_count' => 0,
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function validateMessage(Request $request, bool $starting): array
    {
        $normalized = [
            'body' => is_string($request->input('body')) ? trim($request->input('body')) : $request->input('body'),
        ];

        if ($starting) {
            $normalized['subject'] = is_string($request->input('subject'))
                ? trim($request->input('subject'))
                : $request->input('subject');
        }

        $request->merge($normalized);

        $rules = [
            'body' => ['required', 'string', 'max:5000', 'regex:/\S/u'],
            'student_document_id' => ['nullable', 'integer', 'exists:student_documents,id'],
        ];

        if ($starting) {
            $rules += [
                'recipient_user_id' => ['required', 'integer', 'exists:users,id'],
                'admission_application_id' => ['nullable', 'integer', 'exists:admission_applications,id'],
                'subject' => ['required', 'string', 'min:2', 'max:180', 'regex:/\S/u'],
            ];
        }

        return $request->validate($rules);
    }

    /** @return array<string, mixed> */
    private function conversationData(Conversation $conversation, User $actor, int $unreadCount): array
    {
        return [
            'id' => $conversation->id,
            'subject' => $conversation->subject,
            'created_by_user_id' => $conversation->created_by_user_id,
            'admission_application' => $conversation->application ? [
                'id' => $conversation->application->id,
                'reference' => $conversation->application->reference,
                'status' => $conversation->application->status,
                'program' => $conversation->application->program ? [
                    'id' => $conversation->application->program->id,
                    'name' => $conversation->application->program->name,
                    'institution_type' => $conversation->application->program->institution_type,
                ] : null,
            ] : null,
            'participants' => $conversation->participants
                ->map(fn ($participant) => [
                    ...$this->recipientData($participant->user, $actor),
                    'last_read_at' => $participant->last_read_at?->toIso8601String(),
                ])
                ->values()
                ->all(),
            'latest_message' => $conversation->latestMessage
                ? $this->messageData($conversation->latestMessage)
                : null,
            'unread_count' => $unreadCount,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'created_at' => $conversation->created_at?->toIso8601String(),
            'updated_at' => $conversation->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function messageData(ConversationMessage $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'body' => $message->body,
            'sender' => $message->sender ? [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
                'role' => $this->conversations->normalizedRole($message->sender),
            ] : null,
            'document' => $message->document ? [
                'id' => $message->document->id,
                'name' => $message->document->original_name,
                'mime_type' => $message->document->mime_type,
                'size' => $message->document->size,
                'status' => $message->document->status,
            ] : null,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function recipientData(User $user, User $actor): array
    {
        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $this->conversations->normalizedRole($user),
            'institution_name' => $user->isSchool() ? $user->school?->name : null,
        ];

        if ($actor->isAdmin()) {
            $data['email'] = $user->email;
        }

        return $data;
    }

    /** @return array<string, int> */
    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
