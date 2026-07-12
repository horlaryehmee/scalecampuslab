<?php

namespace Tests\Feature;

use App\Models\CampusEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampusEventManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_university_can_update_and_delete_its_own_event(): void
    {
        $university = User::factory()->create(['role' => 'university']);
        $event = CampusEvent::create([
            'university_user_id' => $university->id,
            'title' => 'Original Event',
            'starts_at' => now()->addWeek(),
            'ends_at' => now()->addWeek()->addHours(2),
            'venue' => 'Admissions Hall',
            'location' => 'Main Campus',
            'capacity' => 50,
            'status' => 'draft',
        ]);

        $this->actingAs($university)->put("/campus-events/{$event->id}", [
            'title' => 'Updated Event',
            'starts_at' => now()->addWeeks(2)->format('Y-m-d H:i:s'),
            'ends_at' => now()->addWeeks(2)->addHours(2)->format('Y-m-d H:i:s'),
            'venue' => 'Admissions Hall',
            'location' => 'North Campus',
            'description' => 'Updated event details.',
            'capacity' => 80,
            'status' => 'published',
        ])->assertRedirect();

        $this->assertDatabaseHas('campus_events', ['id' => $event->id, 'title' => 'Updated Event', 'capacity' => 80, 'status' => 'published']);

        $this->actingAs($university)->delete("/campus-events/{$event->id}")->assertRedirect();

        $this->assertDatabaseMissing('campus_events', ['id' => $event->id]);
    }

    public function test_university_cannot_update_another_university_event(): void
    {
        $owner = User::factory()->create(['role' => 'university']);
        $otherUniversity = User::factory()->create(['role' => 'university']);
        $event = CampusEvent::create([
            'university_user_id' => $owner->id,
            'title' => 'Protected Event',
            'starts_at' => now()->addWeek(),
            'venue' => 'Admissions Hall',
            'capacity' => 50,
            'status' => 'published',
        ]);

        $this->actingAs($otherUniversity)->delete("/campus-events/{$event->id}")->assertForbidden();
    }
}
