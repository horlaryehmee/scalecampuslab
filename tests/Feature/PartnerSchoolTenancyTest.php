<?php

namespace Tests\Feature;

use App\Jobs\DeliverPlatformNotification;
use App\Models\CampusEvent;
use App\Models\PartnerSchoolTask;
use App\Models\PlatformNotification;
use App\Models\TargetSchool;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PartnerSchoolTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_university_created_partner_school_is_owned_and_hidden_from_other_universities(): void
    {
        $owner = User::factory()->create(['role' => 'university']);
        $otherUniversity = User::factory()->create(['role' => 'university']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($owner)
            ->post('/dashboard/university/partner-schools', $this->schoolPayload('Owner Partner', 'OWN-001'))
            ->assertRedirect();

        $ownedSchool = TargetSchool::withoutGlobalScopes()->where('school_code', 'OWN-001')->firstOrFail();
        $this->assertSame($owner->id, $ownedSchool->university_user_id);

        $this->actingAs($owner)
            ->put(
                "/dashboard/university/partner-schools/{$ownedSchool->id}",
                $this->schoolPayload('Owner Partner Updated', 'OWN-001'),
            )
            ->assertRedirect();
        $this->assertDatabaseHas('target_schools', [
            'id' => $ownedSchool->id,
            'university_user_id' => $owner->id,
            'name' => 'Owner Partner Updated',
        ]);

        $this->actingAs($otherUniversity)
            ->post('/dashboard/university/partner-schools', $this->schoolPayload('Other Partner', 'OTH-001'))
            ->assertRedirect();

        $otherSchool = TargetSchool::withoutGlobalScopes()->where('school_code', 'OTH-001')->firstOrFail();

        $this->actingAs($admin);
        $sharedSchool = TargetSchool::create($this->schoolPayload('Shared Directory School', 'SHR-001'));

        $ownerSchools = collect($this->actingAs($owner)
            ->get('/dashboard/university')
            ->assertOk()
            ->viewData('props')['schools']);

        $this->assertTrue($ownerSchools->contains('id', $ownedSchool->id));
        $this->assertTrue($ownerSchools->contains('id', $sharedSchool->id));
        $this->assertFalse($ownerSchools->contains('id', $otherSchool->id));

        $adminSchools = collect($this->actingAs($admin)
            ->get('/dashboard/admin')
            ->assertOk()
            ->viewData('props')['schools']);

        $this->assertTrue($adminSchools->contains('id', $ownedSchool->id));
        $this->assertTrue($adminSchools->contains('id', $otherSchool->id));
        $this->assertTrue($adminSchools->contains('id', $sharedSchool->id));
    }

    public function test_university_cannot_access_or_mutate_another_university_partner_school(): void
    {
        $owner = User::factory()->create(['role' => 'university']);
        $intruder = User::factory()->create(['role' => 'university']);

        $this->actingAs($owner);
        $school = TargetSchool::create($this->schoolPayload('Private Partner', 'PRI-001'));

        $this->actingAs($intruder)
            ->put("/dashboard/university/partner-schools/{$school->id}", $this->schoolPayload('Compromised', 'PRI-001'))
            ->assertNotFound();
        $this->actingAs($intruder)
            ->delete("/dashboard/university/partner-schools/{$school->id}")
            ->assertNotFound();
        $this->actingAs($intruder)
            ->post("/dashboard/university/partner-schools/{$school->id}/contact", [
                'subject' => 'Unauthorized',
                'message' => 'Unauthorized contact attempt.',
            ])
            ->assertNotFound();
        $this->actingAs($intruder)
            ->post("/dashboard/university/partner-schools/{$school->id}/tasks", [
                'title' => 'Unauthorized task',
            ])
            ->assertNotFound();
        $this->actingAs($intruder)
            ->post("/partner-schools/{$school->id}/schedule-visit")
            ->assertNotFound();

        $this->assertDatabaseHas('target_schools', [
            'id' => $school->id,
            'university_user_id' => $owner->id,
            'name' => 'Private Partner',
        ]);
        $this->assertDatabaseMissing('partner_school_tasks', ['title' => 'Unauthorized task']);
    }

    public function test_only_admin_can_manage_shared_directory_records(): void
    {
        $university = User::factory()->create(['role' => 'university']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin);
        $sharedSchool = TargetSchool::create($this->schoolPayload('Shared School', 'SHR-002'));
        $this->assertNull($sharedSchool->university_user_id);

        $this->actingAs($university)
            ->put("/dashboard/university/partner-schools/{$sharedSchool->id}", $this->schoolPayload('University Rewrite', 'SHR-002'))
            ->assertForbidden();
        $this->actingAs($university)
            ->delete("/dashboard/university/partner-schools/{$sharedSchool->id}")
            ->assertForbidden();

        $this->actingAs($admin)
            ->put("/dashboard/admin/schools/{$sharedSchool->id}", $this->schoolPayload('Admin Managed School', 'SHR-002'))
            ->assertRedirect();

        $this->assertDatabaseHas('target_schools', [
            'id' => $sharedSchool->id,
            'name' => 'Admin Managed School',
            'university_user_id' => null,
        ]);
    }

    public function test_university_cannot_invite_another_university_partner_school(): void
    {
        $owner = User::factory()->create(['role' => 'university']);
        $intruder = User::factory()->create(['role' => 'university']);

        $this->actingAs($owner);
        $school = TargetSchool::create($this->schoolPayload('Invitation Boundary School', 'INV-001'));

        $event = CampusEvent::create([
            'university_user_id' => $intruder->id,
            'title' => 'Private Invitation Test',
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'venue' => 'Admissions Hall',
            'location' => 'Main Campus',
            'capacity' => 80,
            'status' => 'published',
        ]);

        $this->actingAs($intruder)
            ->post("/campus-events/{$event->id}/invite-schools", [
                'school_ids' => [$school->id],
                'message' => 'Unauthorized invitation attempt.',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('school_ids');

        $this->assertDatabaseMissing('visit_requests', [
            'target_school_id' => $school->id,
            'campus_event_id' => $event->id,
        ]);
    }

    public function test_partner_school_tasks_are_scoped_to_the_current_university(): void
    {
        $firstUniversity = User::factory()->create(['role' => 'university']);
        $secondUniversity = User::factory()->create(['role' => 'university']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin);
        $sharedSchool = TargetSchool::create($this->schoolPayload('Shared Task School', 'TSK-001'));

        PartnerSchoolTask::create([
            'target_school_id' => $sharedSchool->id,
            'user_id' => $firstUniversity->id,
            'title' => 'First university task',
            'status' => 'open',
        ]);
        PartnerSchoolTask::create([
            'target_school_id' => $sharedSchool->id,
            'user_id' => $secondUniversity->id,
            'title' => 'Second university task',
            'status' => 'open',
        ]);

        $firstSchool = collect($this->actingAs($firstUniversity)
            ->get('/dashboard/university')
            ->assertOk()
            ->viewData('props')['schools'])
            ->firstWhere('id', $sharedSchool->id);

        $this->assertSame(['First university task'], collect($firstSchool['tasks'])->pluck('title')->all());
        $this->assertSame(1, $firstSchool['taskCount']);

        $adminSchool = collect($this->actingAs($admin)
            ->get('/dashboard/admin')
            ->assertOk()
            ->viewData('props')['schools'])
            ->firstWhere('id', $sharedSchool->id);

        $this->assertEqualsCanonicalizing(
            ['First university task', 'Second university task'],
            collect($adminSchool['tasks'])->pluck('title')->all(),
        );
        $this->assertSame(2, $adminSchool['taskCount']);
    }

    public function test_partner_school_contact_queues_a_deliverable_email_and_records_it_in_message_history(): void
    {
        Queue::fake();

        $university = User::factory()->create(['role' => 'university']);
        $this->actingAs($university);
        $school = TargetSchool::create($this->schoolPayload('Outreach School', 'OUT-001'));

        $this->post("/dashboard/university/partner-schools/{$school->id}/contact", [
            'subject' => 'Campus visit invitation',
            'message' => 'We would like to coordinate an admissions visit with your school.',
        ])->assertRedirect()->assertSessionHas('status', 'Email outreach queued for delivery.');

        $notification = PlatformNotification::query()->sole();
        $this->assertSame('partner_school.outreach', $notification->notification_type);
        $this->assertSame('outbound_contact', $notification->target_type);
        $this->assertSame($university->id, $notification->target_id);
        $this->assertSame('out-001@example.test', $notification->metadata['registrant_email']);
        $this->assertSame('queued', $notification->status);
        $this->assertDatabaseHas('partner_school_tasks', [
            'target_school_id' => $school->id,
            'user_id' => $university->id,
            'title' => 'Follow up with Outreach School',
        ]);
        Queue::assertPushed(DeliverPlatformNotification::class, fn (DeliverPlatformNotification $job) => $job->notificationId === $notification->id);

        $messages = collect($this->get('/dashboard/university')->assertOk()->viewData('props')['messages']);
        $this->assertTrue($messages->contains('id', $notification->id));
    }

    public function test_partner_school_contact_requires_a_deliverable_coordinator_email(): void
    {
        Queue::fake();

        $university = User::factory()->create(['role' => 'university']);
        $this->actingAs($university);
        $school = TargetSchool::create(array_merge(
            $this->schoolPayload('No Email School', 'NOE-001'),
            ['coordinator_email' => null],
        ));

        $this->post("/dashboard/university/partner-schools/{$school->id}/contact", [
            'subject' => 'Campus visit invitation',
            'message' => 'This must not be reported as sent without an email recipient.',
        ])->assertRedirect()->assertSessionHasErrors('school');

        $this->assertDatabaseCount('platform_notifications', 0);
        $this->assertDatabaseCount('partner_school_tasks', 0);
        Queue::assertNothingPushed();
    }

    /** @return array<string, mixed> */
    private function schoolPayload(string $name, string $code): array
    {
        return [
            'school_code' => $code,
            'name' => $name,
            'city' => 'Lagos',
            'region' => 'West Africa',
            'country' => 'Nigeria',
            'district' => 'Lagos Mainland',
            'coordinator_name' => 'Partner Coordinator',
            'coordinator_email' => strtolower($code).'@example.test',
            'status' => 'verified',
            'school_type' => 'private',
            'performance_tier' => 'high',
            'average_sat' => 1300,
            'yield_rate' => 4.2,
            'match_score' => 88,
            'active_applicants' => 24,
            'notes' => 'Partner relationship notes.',
        ];
    }
}
