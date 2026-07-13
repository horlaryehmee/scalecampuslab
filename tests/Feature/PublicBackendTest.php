<?php

namespace Tests\Feature;

use App\Models\Faq;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicBackendTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_options_expose_only_real_school_choices_without_homepage_metrics(): void
    {
        $school = School::create(['name' => 'Partner School', 'location' => 'Lagos']);

        $this->getJson('/api/v1/public/registration-options')
            ->assertOk()
            ->assertJsonPath('schools.0.id', $school->id)
            ->assertJsonMissingPath('stats')
            ->assertJsonMissingPath('upcoming_visits');

        $this->getJson('/api/v1/public/home')
            ->assertOk()
            ->assertJsonMissingPath('stats')
            ->assertJsonMissingPath('upcoming_visits');
    }

    public function test_public_faq_endpoint_returns_only_published_general_entries(): void
    {
        $visible = Faq::create([
            'audience' => 'all',
            'question' => 'How do visit approvals work?',
            'answer' => 'Schools approve requests sent for published visit events.',
            'sort_order' => 1,
            'is_published' => true,
        ]);
        Faq::create([
            'audience' => 'student',
            'question' => 'Student-only answer',
            'answer' => 'This belongs in the authenticated student portal.',
            'sort_order' => 2,
            'is_published' => true,
        ]);
        Faq::create([
            'audience' => 'all',
            'question' => 'Draft answer',
            'answer' => 'This is not published.',
            'sort_order' => 3,
            'is_published' => false,
        ]);

        $this->getJson('/api/v1/public/faqs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $visible->id)
            ->assertJsonMissing(['question' => 'Student-only answer'])
            ->assertJsonMissing(['question' => 'Draft answer']);
    }

    public function test_contact_endpoint_validates_and_persists_a_real_message(): void
    {
        $this->postJson('/api/v1/contact', [
            'name' => 'Amina Bello',
            'email' => 'amina@example.com',
            'phone' => '+2348000000000',
            'organization' => 'Campus Partners',
            'subject' => 'University outreach planning',
            'message' => 'We would like to coordinate outreach visits for the next term.',
        ])->assertCreated()
            ->assertJsonStructure(['message', 'contact_message_id']);

        $this->assertDatabaseHas('contact_messages', [
            'email' => 'amina@example.com',
            'organization' => 'Campus Partners',
            'status' => 'new',
        ]);
    }

    public function test_public_spa_pages_are_all_live_and_use_the_platform_entry(): void
    {
        foreach (['/', '/about', '/how-it-works', '/contact', '/faq', '/register', '/login', '/forgot-password'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertSee('platform-root');
        }

        $this->get('/reset-password/example-token?email=user%40example.com')
            ->assertOk()
            ->assertSee('platform-root');

        $this->actingAs(User::factory()->unverified()->create())
            ->get('/verify-email')
            ->assertOk()
            ->assertSee('platform-root');
    }
}
