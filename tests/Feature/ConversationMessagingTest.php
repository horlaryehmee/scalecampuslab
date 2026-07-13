<?php

namespace Tests\Feature;

use App\Http\Controllers\ConversationController;
use App\Jobs\DeliverPlatformNotification;
use App\Models\AdmissionApplication;
use App\Models\InstitutionProgram;
use App\Models\PlatformNotification;
use App\Models\StudentDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConversationMessagingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['api', 'auth:sanctum'])
            ->prefix('api/_test-conversations')
            ->group(function (): void {
                Route::get('/recipients', [ConversationController::class, 'recipients']);
                Route::get('/', [ConversationController::class, 'index']);
                Route::post('/', [ConversationController::class, 'store']);
                Route::get('/{conversation}', [ConversationController::class, 'show']);
                Route::post('/{conversation}/messages', [ConversationController::class, 'reply']);
                Route::patch('/{conversation}/read', [ConversationController::class, 'markRead']);
            });
    }

    public function test_direct_thread_supports_reply_unread_state_notifications_and_participant_isolation(): void
    {
        Queue::fake();
        $student = $this->user('student', 'student@example.test');
        $university = $this->user('university', 'university@example.test');
        $outsider = $this->user('student', 'outsider@example.test');

        Sanctum::actingAs($student);
        $created = $this->postJson('/api/_test-conversations', [
            'recipient_user_id' => $university->id,
            'subject' => 'Admissions question',
            'body' => 'Can you confirm the transcript requirement?',
        ])->assertCreated()
            ->assertJsonPath('data.subject', 'Admissions question')
            ->assertJsonPath('data.participants.0.id', $student->id)
            ->assertJsonPath('data.participants.1.id', $university->id)
            ->assertJsonPath('data.latest_message.body', 'Can you confirm the transcript requirement?');

        $conversationId = $created->json('data.id');
        $this->assertDatabaseHas('conversation_participants', [
            'conversation_id' => $conversationId,
            'user_id' => $student->id,
        ]);
        $this->assertDatabaseHas('conversation_participants', [
            'conversation_id' => $conversationId,
            'user_id' => $university->id,
            'last_read_at' => null,
        ]);
        $notification = PlatformNotification::query()
            ->where('user_id', $university->id)
            ->where('notification_type', 'message.received')
            ->firstOrFail();
        $this->assertSame($conversationId, $notification->metadata['conversation_id']);
        Queue::assertPushed(
            DeliverPlatformNotification::class,
            fn (DeliverPlatformNotification $job) => $job->notificationId === $notification->id,
        );

        Sanctum::actingAs($outsider);
        $this->getJson("/api/_test-conversations/{$conversationId}")->assertForbidden();
        $this->postJson("/api/_test-conversations/{$conversationId}/messages", [
            'body' => 'I should not be able to join this thread.',
        ])->assertForbidden();

        Sanctum::actingAs($university);
        $this->getJson('/api/_test-conversations')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.unread_count', 1);
        $this->patchJson("/api/_test-conversations/{$conversationId}/read")
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);
        $this->getJson('/api/_test-conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 0);

        $this->travel(1)->seconds();
        $this->postJson("/api/_test-conversations/{$conversationId}/messages", [
            'body' => 'Yes. Please attach an official transcript.',
        ])->assertCreated()
            ->assertJsonPath('data.sender.id', $university->id);

        Sanctum::actingAs($student);
        $this->getJson('/api/_test-conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 1)
            ->assertJsonPath('data.0.latest_message.body', 'Yes. Please attach an official transcript.');
        $this->getJson("/api/_test-conversations/{$conversationId}")
            ->assertOk()
            ->assertJsonPath('meta.message_order', 'newest_first')
            ->assertJsonCount(2, 'data.messages');
    }

    public function test_role_compatibility_and_recipient_availability_are_enforced(): void
    {
        Queue::fake();
        $student = $this->user('student', 'student-role@example.test');
        $anotherStudent = $this->user('student', 'student-two@example.test');
        $university = $this->user('university', 'university-role@example.test');
        $anotherUniversity = $this->user('university', 'university-two@example.test');
        $pendingUniversity = $this->user('university', 'university-pending@example.test', accessStatus: 'pending');
        $admin = $this->user('admin', 'admin-directory@example.test');

        Sanctum::actingAs($student);
        $this->postJson('/api/_test-conversations', [
            'recipient_user_id' => $anotherStudent->id,
            'subject' => 'Not allowed',
            'body' => 'Students cannot start direct conversations with students.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('recipient_user_id');
        $this->postJson('/api/_test-conversations', [
            'recipient_user_id' => $pendingUniversity->id,
            'subject' => 'Not available',
            'body' => 'Pending recipients must not receive messages.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('recipient_user_id');
        $this->getJson('/api/_test-conversations/recipients')
            ->assertOk()
            ->assertJsonFragment(['id' => $university->id, 'role' => 'university'])
            ->assertJsonFragment(['id' => $admin->id, 'role' => 'admin'])
            ->assertJsonMissing(['id' => $anotherStudent->id])
            ->assertJsonMissing(['id' => $pendingUniversity->id]);

        Sanctum::actingAs($university);
        $this->postJson('/api/_test-conversations', [
            'recipient_user_id' => $anotherUniversity->id,
            'subject' => 'Not tenant safe',
            'body' => 'Institution-to-institution threads require a tenant relationship.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('recipient_user_id');

        $this->assertDatabaseCount('conversations', 0);
    }

    public function test_application_context_and_document_attachment_cannot_cross_tenant_boundaries(): void
    {
        Queue::fake();
        $student = $this->user('student', 'applicant@example.test');
        $otherStudent = $this->user('student', 'other-applicant@example.test');
        $university = $this->user('university', 'application-owner@example.test');
        $otherUniversity = $this->user('university', 'application-outsider@example.test');
        $program = InstitutionProgram::create([
            'university_user_id' => $university->id,
            'institution_type' => 'university',
            'name' => 'Computer Science',
            'code' => 'CSC',
            'status' => 'published',
        ]);
        $application = AdmissionApplication::create([
            'student_user_id' => $student->id,
            'institution_program_id' => $program->id,
            'reference' => 'SCL-TEST-001',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);
        $document = StudentDocument::create([
            'student_user_id' => $student->id,
            'admission_application_id' => $application->id,
            'category' => 'transcript',
            'original_name' => 'transcript.pdf',
            'disk' => 'local',
            'path' => 'student-documents/test/transcript.pdf',
            'mime_type' => 'application/pdf',
            'size' => 2048,
            'status' => 'uploaded',
        ]);

        Sanctum::actingAs($student);
        $this->postJson('/api/_test-conversations', [
            'recipient_user_id' => $otherUniversity->id,
            'admission_application_id' => $application->id,
            'subject' => 'Cross-tenant attempt',
            'body' => 'This application must remain private.',
        ])->assertForbidden();

        $conversationId = $this->postJson('/api/_test-conversations', [
            'recipient_user_id' => $university->id,
            'admission_application_id' => $application->id,
            'student_document_id' => $document->id,
            'subject' => 'Application document',
            'body' => 'I attached my transcript.',
        ])->assertCreated()
            ->assertJsonPath('data.admission_application.id', $application->id)
            ->assertJsonPath('data.latest_message.document.id', $document->id)
            ->json('data.id');

        Sanctum::actingAs($otherStudent);
        $this->getJson("/api/_test-conversations/{$conversationId}")->assertForbidden();

        Sanctum::actingAs($university);
        $this->postJson("/api/_test-conversations/{$conversationId}/messages", [
            'body' => 'I cannot attach a student-owned document as an institution.',
            'student_document_id' => $document->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('student_document_id');
    }

    public function test_admin_can_start_a_direct_thread_with_any_active_user(): void
    {
        Queue::fake();
        $admin = $this->user('admin', 'admin-message@example.test');
        $student = $this->user('student', 'admin-recipient@example.test');

        Sanctum::actingAs($admin);
        $this->getJson('/api/_test-conversations/recipients')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $student->id,
                'email' => $student->email,
                'role' => 'student',
            ]);
        $this->postJson('/api/_test-conversations', [
            'recipient_user_id' => $student->id,
            'subject' => 'Account review',
            'body' => 'Please review the latest account notice.',
        ])->assertCreated();

        $this->assertDatabaseHas('conversation_participants', ['user_id' => $admin->id]);
        $this->assertDatabaseHas('conversation_participants', ['user_id' => $student->id]);
    }

    private function user(
        string $role,
        string $email,
        ?int $schoolId = null,
        string $accessStatus = 'active',
    ): User {
        return User::factory()->create([
            'name' => ucfirst(str_replace(['-', '@example.test'], [' ', ''], $email)),
            'email' => $email,
            'role' => $role,
            'school_id' => $schoolId,
            'access_status' => $accessStatus,
            'email_verified_at' => now(),
        ]);
    }
}
