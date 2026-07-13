<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\ComplianceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComplianceRequestIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_university_can_log_only_owned_subjects_and_cancel_only_an_open_request(): void
    {
        $university = $this->activeUser('university');
        $otherUniversity = $this->activeUser('university');
        $ownedEvent = $this->event($university, 'Owned Visit');
        $outsideEvent = $this->event($otherUniversity, 'Outside Visit');

        $this->actingAs($university)->post('/dashboard/university/compliance-requests', [
            'type' => 'privacy_review',
            'subject_type' => 'program',
            'subject_id' => $outsideEvent->id,
            'reason' => 'This record is outside the requester tenant.',
        ])->assertRedirect()->assertSessionHasErrors('subject_id');
        $this->assertDatabaseCount('compliance_requests', 0);

        $this->post('/dashboard/university/compliance-requests', [
            'type' => 'data_export',
            'subject_type' => 'program',
            'subject_id' => $ownedEvent->id,
            'subject_label' => $ownedEvent->title,
            'reason' => 'Prepare this request for an authorized processor.',
        ])->assertRedirect()->assertSessionHas('status', 'Compliance request created.');

        $record = ComplianceRequest::query()->sole();
        $this->post("/dashboard/university/compliance-requests/{$record->id}/status", [
            'status' => 'completed',
        ])->assertSessionHasErrors('status');
        $this->assertSame('open', $record->fresh()->status);

        $this->post("/dashboard/university/compliance-requests/{$record->id}/status", [
            'status' => 'cancelled',
        ])->assertRedirect()->assertSessionHas('status');
        $this->assertSame('cancelled', $record->fresh()->status);

        $this->post("/dashboard/university/compliance-requests/{$record->id}/status", [
            'status' => 'cancelled',
        ])->assertUnprocessable();
    }

    public function test_admin_processor_requires_a_resolution_note_and_cannot_process_cancelled_requests(): void
    {
        $university = $this->activeUser('university');
        $admin = $this->activeUser('admin');
        $record = ComplianceRequest::create([
            'university_user_id' => $university->id,
            'requested_by_user_id' => $university->id,
            'type' => 'data_deletion',
            'reason' => 'Remove an approved obsolete record.',
            'status' => 'open',
        ]);

        $this->actingAs($admin)->post("/dashboard/admin/compliance-requests/{$record->id}/status", [
            'status' => 'completed',
        ])->assertSessionHasErrors('resolution_note');

        $this->post("/dashboard/admin/compliance-requests/{$record->id}/status", [
            'status' => 'completed',
            'resolution_note' => 'The authorized processor verified and completed the request.',
        ])->assertRedirect()->assertSessionHas('status');

        $record->refresh();
        $this->assertSame('completed', $record->status);
        $this->assertNotNull($record->completed_at);
        $this->assertSame($admin->id, $record->metadata['processed_by_user_id']);
    }

    private function activeUser(string $role): User
    {
        return User::factory()->create([
            'role' => $role,
            'access_status' => 'active',
            'email_verified_at' => now(),
        ]);
    }

    private function event(User $university, string $title): CampusEvent
    {
        return CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => $title,
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'venue' => 'Admissions Hall',
            'location' => 'Main Campus',
            'capacity' => 80,
            'status' => 'published',
        ]);
    }
}
