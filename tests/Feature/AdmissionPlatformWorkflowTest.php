<?php

namespace Tests\Feature;

use App\Jobs\DeliverPlatformNotification;
use App\Models\AdmissionApplication;
use App\Models\Announcement;
use App\Models\InstitutionProgram;
use App\Models\School;
use App\Models\StudentDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdmissionPlatformWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();
    }

    public function test_university_program_crud_is_tenant_scoped_and_owner_fields_cannot_be_spoofed(): void
    {
        $university = $this->user('university', 'program-owner@example.test');
        $otherUniversity = $this->user('university', 'program-outsider@example.test');
        $school = School::create(['name' => 'Spoofed School', 'location' => 'Lagos']);

        Sanctum::actingAs($university);
        $created = $this->postJson('/api/v1/programs', $this->programPayload([
            'institution_type' => 'school',
            'university_user_id' => $otherUniversity->id,
            'school_id' => $school->id,
        ]))->assertCreated()
            ->assertJsonPath('data.institution_type', 'university')
            ->assertJsonPath('data.university_user_id', $university->id)
            ->assertJsonPath('data.school_id', null);

        $programId = $created->json('data.id');

        Sanctum::actingAs($otherUniversity);
        $this->patchJson("/api/v1/programs/{$programId}", $this->programPayload([
            'name' => 'Unauthorized change',
        ]))->assertForbidden();
        $this->deleteJson("/api/v1/programs/{$programId}")->assertForbidden();

        Sanctum::actingAs($university);
        $this->patchJson("/api/v1/programs/{$programId}", $this->programPayload([
            'name' => 'Data Science',
            'code' => 'DSC',
        ]))->assertOk()
            ->assertJsonPath('data.name', 'Data Science')
            ->assertJsonPath('data.code', 'DSC');

        $this->deleteJson("/api/v1/programs/{$programId}")->assertNoContent();
        $this->assertDatabaseMissing('institution_programs', ['id' => $programId]);
    }

    public function test_student_application_and_university_decision_are_tenant_scoped_and_notify_both_sides(): void
    {
        $student = $this->user('student', 'university-applicant@example.test');
        $university = $this->user('university', 'application-university@example.test');
        $otherUniversity = $this->user('university', 'application-outsider@example.test');
        $program = $this->program($university);

        Sanctum::actingAs($student);
        $submitted = $this->postJson('/api/v1/applications', [
            'institution_program_id' => $program->id,
            'personal_statement' => 'I want to study computing and solve useful problems.',
            'academic_summary' => 'Strong mathematics and science results.',
            'submit' => true,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.student_user_id', $student->id);

        $applicationId = $submitted->json('data.id');
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $university->id,
            'notification_type' => 'application.submitted',
        ]);

        Sanctum::actingAs($otherUniversity);
        $this->postJson("/api/v1/applications/{$applicationId}/decision", [
            'status' => 'accepted',
        ])->assertForbidden();

        Sanctum::actingAs($university);
        $this->postJson("/api/v1/applications/{$applicationId}/decision", [
            'status' => 'accepted',
            'decision_note' => 'Your offer is ready.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.reviewed_by_user_id', $university->id);

        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $student->id,
            'notification_type' => 'application.status_changed',
        ]);
        Queue::assertPushed(DeliverPlatformNotification::class, 2);
    }

    public function test_school_application_notifies_active_school_coordinators_and_only_that_school_can_decide(): void
    {
        $student = $this->user('student', 'school-applicant@example.test');
        $school = School::create(['name' => 'Scale Academy', 'location' => 'Abuja']);
        $otherSchool = School::create(['name' => 'Outside Academy', 'location' => 'Kano']);
        $coordinator = $this->user('school', 'coordinator@example.test', $school->id);
        $secondCoordinator = $this->user('high_school', 'second-coordinator@example.test', $school->id);
        $this->user('school', 'pending-coordinator@example.test', $school->id, 'pending');
        $outsider = $this->user('school', 'outside-coordinator@example.test', $otherSchool->id);
        $program = $this->schoolProgram($school);

        Sanctum::actingAs($student);
        $applicationId = $this->postJson('/api/v1/applications', [
            'institution_program_id' => $program->id,
            'submit' => true,
        ])->assertCreated()
            ->json('data.id');

        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $coordinator->id,
            'notification_type' => 'application.submitted',
        ]);
        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $secondCoordinator->id,
            'notification_type' => 'application.submitted',
        ]);
        $this->assertDatabaseMissing('platform_notifications', [
            'user_id' => User::where('email', 'pending-coordinator@example.test')->value('id'),
            'notification_type' => 'application.submitted',
        ]);

        Sanctum::actingAs($outsider);
        $this->postJson("/api/v1/applications/{$applicationId}/decision", [
            'status' => 'rejected',
        ])->assertForbidden();

        Sanctum::actingAs($coordinator);
        $this->postJson("/api/v1/applications/{$applicationId}/decision", [
            'status' => 'waitlisted',
            'decision_note' => 'Awaiting one final result.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'waitlisted');

        $this->assertDatabaseHas('platform_notifications', [
            'user_id' => $student->id,
            'notification_type' => 'application.status_changed',
        ]);
    }

    public function test_students_only_see_and_apply_to_programs_with_an_active_verified_institution(): void
    {
        $student = $this->user('student', 'availability-student@example.test');
        $activeUniversity = $this->user('university', 'available-university@example.test');
        $pendingUniversity = $this->user('university', 'pending-university@example.test', accessStatus: 'pending');
        $activeProgram = $this->program($activeUniversity);
        $pendingProgram = InstitutionProgram::create([
            'university_user_id' => $pendingUniversity->id,
            'institution_type' => 'university',
            'name' => 'Unavailable Programme',
            'code' => 'UNAVAILABLE',
            'application_fee' => 0,
            'currency' => 'NGN',
            'status' => 'published',
        ]);

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/programs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activeProgram->id)
            ->assertJsonPath('data.0.name', $activeProgram->name);

        $this->postJson('/api/v1/applications', [
            'institution_program_id' => $pendingProgram->id,
            'submit' => true,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This institution is not currently accepting applications.');

        $this->assertDatabaseCount('admission_applications', 0);
    }

    public function test_student_documents_are_private_and_only_visible_to_the_application_institution_after_submission(): void
    {
        Storage::fake('local');
        $student = $this->user('student', 'document-owner@example.test');
        $otherStudent = $this->user('student', 'document-outsider@example.test');
        $university = $this->user('university', 'document-university@example.test');
        $otherUniversity = $this->user('university', 'document-other-university@example.test');
        $program = $this->program($university);
        $application = AdmissionApplication::create([
            'student_user_id' => $student->id,
            'institution_program_id' => $program->id,
            'reference' => 'SCL-DOCUMENT-001',
            'status' => 'draft',
        ]);

        Sanctum::actingAs($otherStudent);
        $this->postJson('/api/v1/student/documents', [
            'category' => 'transcript',
            'admission_application_id' => $application->id,
            'document' => UploadedFile::fake()->create('stolen.pdf', 64, 'application/pdf'),
        ])->assertForbidden();

        Sanctum::actingAs($student);
        $documentId = $this->postJson('/api/v1/student/documents', [
            'category' => 'transcript',
            'admission_application_id' => $application->id,
            'document' => UploadedFile::fake()->create('official-transcript.pdf', 64, 'application/pdf'),
        ])->assertCreated()
            ->assertJsonPath('data.application_id', $application->id)
            ->json('data.id');

        $document = StudentDocument::findOrFail($documentId);
        Storage::disk('local')->assertExists($document->path);

        $this->actingAs($student)
            ->get("/student/documents/{$documentId}/preview")
            ->assertOk()
            ->assertHeader('content-disposition', 'inline; filename="official-transcript.pdf"');

        $this->actingAs($otherStudent)
            ->get("/student/documents/{$documentId}/download")
            ->assertForbidden();
        $this->actingAs($otherUniversity)
            ->get("/student/documents/{$documentId}/download")
            ->assertForbidden();
        $this->actingAs($university)
            ->get("/student/documents/{$documentId}/preview")
            ->assertForbidden();

        $application->update(['status' => 'submitted', 'submitted_at' => now()]);

        $this->actingAs($university)
            ->get("/student/documents/{$documentId}/download")
            ->assertOk()
            ->assertDownload('official-transcript.pdf');
        $this->actingAs($university)
            ->postJson("/student/documents/{$documentId}/review", ['status' => 'verified'])
            ->assertOk()
            ->assertJsonPath('data.status', 'verified');
    }

    public function test_application_drafts_are_visible_only_to_the_student_until_submission(): void
    {
        $student = $this->user('student', 'private-draft@example.test');
        $university = $this->user('university', 'draft-reviewer@example.test');
        $admin = $this->user('admin', 'draft-admin@example.test');
        $program = $this->program($university);
        $application = AdmissionApplication::create([
            'student_user_id' => $student->id,
            'institution_program_id' => $program->id,
            'reference' => 'APP-PRIVATE-DRAFT',
            'status' => 'draft',
            'personal_statement' => 'This statement is private until I submit it.',
        ]);

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/applications')
            ->assertOk()
            ->assertJsonPath('data.0.id', $application->id);

        Sanctum::actingAs($university);
        $this->getJson('/api/v1/applications')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->actingAs($university)
            ->get('/dashboard/university')
            ->assertOk()
            ->assertViewHas('props', fn (array $props): bool => $props['admissionApplications'] === []);

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/applications')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $application->update(['status' => 'submitted', 'submitted_at' => now()]);

        Sanctum::actingAs($university);
        $this->getJson('/api/v1/applications')
            ->assertOk()
            ->assertJsonPath('data.0.id', $application->id);
    }

    public function test_program_capacity_is_enforced_when_applications_are_accepted(): void
    {
        $university = $this->user('university', 'capacity-owner@example.test');
        $firstStudent = $this->user('student', 'capacity-first@example.test');
        $secondStudent = $this->user('student', 'capacity-second@example.test');
        $program = $this->program($university);
        $program->update(['capacity' => 1]);

        $firstApplication = AdmissionApplication::create([
            'student_user_id' => $firstStudent->id,
            'institution_program_id' => $program->id,
            'reference' => 'SCL-CAPACITY-001',
            'status' => 'accepted',
            'submitted_at' => now(),
        ]);
        $secondApplication = AdmissionApplication::create([
            'student_user_id' => $secondStudent->id,
            'institution_program_id' => $program->id,
            'reference' => 'SCL-CAPACITY-002',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($university);
        $this->postJson("/api/v1/applications/{$secondApplication->id}/decision", [
            'status' => 'accepted',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This program has reached its enrollment capacity. Waitlist or reject the application instead.');

        $this->assertDatabaseHas('admission_applications', [
            'id' => $secondApplication->id,
            'status' => 'submitted',
        ]);

        $this->postJson("/api/v1/applications/{$secondApplication->id}/decision", [
            'status' => 'waitlisted',
        ])->assertOk()->assertJsonPath('data.status', 'waitlisted');

        $program->update(['capacity' => 2]);
        $this->postJson("/api/v1/applications/{$secondApplication->id}/decision", [
            'status' => 'accepted',
        ])->assertOk()->assertJsonPath('data.status', 'accepted');

        $this->putJson("/api/v1/programs/{$program->id}", $this->programPayload([
            'capacity' => 1,
        ]))->assertUnprocessable()
            ->assertJsonPath('message', 'Capacity cannot be lower than the number of accepted applications.');
        $this->assertDatabaseHas('admission_applications', ['id' => $firstApplication->id, 'status' => 'accepted']);
    }

    public function test_admin_content_crud_is_admin_only_and_published_announcements_notify_the_selected_audience(): void
    {
        $admin = $this->user('admin', 'content-admin@example.test');
        $schoolUser = $this->user('school', 'announcement-school@example.test');
        $highSchoolUser = $this->user('high_school', 'announcement-high-school@example.test');
        $student = $this->user('student', 'announcement-student@example.test');
        $pendingSchool = $this->user('school', 'announcement-pending@example.test', accessStatus: 'pending');

        $this->actingAs($student)
            ->post('/admin/content/announcements', $this->announcementPayload())
            ->assertRedirect('/dashboard/student');
        $this->assertDatabaseCount('announcements', 0);

        $this->actingAs($admin)
            ->from('/dashboard/admin')
            ->post('/admin/content/announcements', $this->announcementPayload())
            ->assertRedirect('/dashboard/admin');

        $announcementId = (int) Announcement::query()->value('id');
        foreach ([$schoolUser, $highSchoolUser] as $recipient) {
            $this->assertDatabaseHas('platform_notifications', [
                'user_id' => $recipient->id,
                'notification_type' => 'announcement.published',
            ]);
        }
        foreach ([$student, $pendingSchool] as $excluded) {
            $this->assertDatabaseMissing('platform_notifications', [
                'user_id' => $excluded->id,
                'notification_type' => 'announcement.published',
            ]);
        }

        $this->actingAs($admin)
            ->put("/admin/content/announcements/{$announcementId}", $this->announcementPayload([
                'title' => 'Updated admissions window',
            ]))->assertRedirect();

        $this->actingAs($admin)->post('/admin/content/faqs', [
            'audience' => 'student',
            'question' => 'How do I submit an application?',
            'answer' => 'Choose a published program and complete the application form.',
            'sort_order' => 10,
            'is_published' => true,
        ])->assertRedirect();
        $this->actingAs($admin)->post('/admin/content/email-templates', [
            'key' => 'application.accepted',
            'name' => 'Application accepted',
            'subject' => 'Your application was accepted',
            'body' => 'Congratulations, {{ student_name }}.',
            'enabled' => true,
        ])->assertRedirect();

        $this->assertDatabaseHas('announcements', [
            'id' => $announcementId,
            'title' => 'Updated admissions window',
        ]);
        $this->assertDatabaseHas('faqs', [
            'audience' => 'student',
            'is_published' => true,
        ]);
        $this->assertDatabaseHas('email_templates', [
            'key' => 'application.accepted',
            'enabled' => true,
            'updated_by_user_id' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->delete("/admin/content/announcements/{$announcementId}")
            ->assertRedirect();
        $this->assertDatabaseMissing('announcements', ['id' => $announcementId]);
    }

    /** @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function programPayload(array $overrides = []): array
    {
        return array_replace([
            'name' => 'Computer Science',
            'code' => 'CSC',
            'level' => 'Undergraduate',
            'description' => 'A practical computing program.',
            'requirements' => 'Five relevant credits.',
            'application_fee' => 2500,
            'currency' => 'NGN',
            'capacity' => 120,
            'status' => 'published',
        ], $overrides);
    }

    private function program(User $university): InstitutionProgram
    {
        return InstitutionProgram::create([
            'university_user_id' => $university->id,
            'institution_type' => 'university',
            'name' => 'Computer Science',
            'code' => 'CSC',
            'application_fee' => 2500,
            'currency' => 'NGN',
            'status' => 'published',
        ]);
    }

    private function schoolProgram(School $school): InstitutionProgram
    {
        return InstitutionProgram::create([
            'school_id' => $school->id,
            'institution_type' => 'school',
            'name' => 'Senior Science Programme',
            'code' => 'SSP',
            'application_fee' => 0,
            'currency' => 'NGN',
            'status' => 'published',
        ]);
    }

    /** @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function announcementPayload(array $overrides = []): array
    {
        return array_replace([
            'audience' => 'school',
            'title' => 'Admissions window',
            'body' => 'The admissions window is now open.',
            'status' => 'published',
        ], $overrides);
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
