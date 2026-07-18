<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountLifecycleSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_school_student_creation_uses_an_email_invitation_account(): void
    {
        Notification::fake();
        $school = School::create(['name' => 'Invitation School', 'location' => 'Lagos']);
        $otherSchool = School::create(['name' => 'Other School', 'location' => 'Abuja']);
        $coordinator = User::factory()->create([
            'role' => 'school',
            'school_id' => $school->id,
        ]);

        Sanctum::actingAs($coordinator);
        $this->postJson('/api/students', [
            'name' => 'Invited Student',
            'email' => '  INVITED.STUDENT@example.edu ',
            'school_id' => $otherSchool->id,
            'student_identifier' => 'STU-101',
        ])->assertCreated()
            ->assertJsonPath('email', 'invited.student@example.edu')
            ->assertJsonPath('school_id', $school->id)
            ->assertJsonPath('access_status', 'active')
            ->assertJsonPath('email_verified', false)
            ->assertJsonPath('setup_email_sent', true);

        $student = User::query()->where('email', 'invited.student@example.edu')->firstOrFail();

        $this->assertNull($student->email_verified_at);
        $this->assertSame('active', $student->access_status);
        $this->assertFalse(Hash::check('password', $student->password));
        Notification::assertSentTo($student, VerifyEmail::class);
        Notification::assertSentTo($student, ResetPassword::class);
    }

    public function test_legacy_bulk_student_creation_sends_setup_messages_for_each_pending_account(): void
    {
        Notification::fake();
        $school = School::create(['name' => 'Bulk School', 'location' => 'Ibadan']);
        $coordinator = User::factory()->create([
            'role' => 'school',
            'school_id' => $school->id,
        ]);

        Sanctum::actingAs($coordinator);
        $this->postJson('/api/students/bulk', [
            'students' => [
                ['name' => 'Student One', 'email' => 'ONE@example.edu'],
                ['name' => 'Student Two', 'email' => 'TWO@example.edu'],
            ],
        ])->assertCreated()
            ->assertJsonCount(2, 'created')
            ->assertJsonPath('created.0.access_status', 'active')
            ->assertJsonPath('created.1.email_verified', false)
            ->assertJsonPath('setup_emails_sent', 2);

        $students = User::query()
            ->whereIn('email', ['one@example.edu', 'two@example.edu'])
            ->get();

        $this->assertCount(2, $students);
        $this->assertTrue($students->every(fn (User $student): bool => $student->school_id === $school->id));
        $this->assertTrue($students->every(fn (User $student): bool => $student->access_status === 'active'));
        $this->assertTrue($students->every(fn (User $student): bool => $student->email_verified_at === null));

        foreach ($students as $student) {
            Notification::assertSentTo($student, VerifyEmail::class);
            Notification::assertSentTo($student, ResetPassword::class);
        }
    }

    public function test_api_password_reset_revokes_tokens_and_database_sessions_for_only_that_account(): void
    {
        Notification::fake();
        config()->set('session.driver', 'database');

        $user = User::factory()->create([
            'password' => Hash::make('OldCampus2026'),
        ]);
        $other = User::factory()->create();
        $user->createToken('mobile-session');
        $user->createToken('integration-token');

        DB::table('sessions')->insert([
            [
                'id' => 'first-user-session',
                'user_id' => $user->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Test browser',
                'payload' => 'test',
                'last_activity' => now()->timestamp,
            ],
            [
                'id' => 'second-user-session',
                'user_id' => $user->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Test browser',
                'payload' => 'test',
                'last_activity' => now()->timestamp,
            ],
            [
                'id' => 'other-user-session',
                'user_id' => $other->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Other browser',
                'payload' => 'test',
                'last_activity' => now()->timestamp,
            ],
        ]);

        $this->postJson('/api/v1/forgot-password', ['email' => $user->email])
            ->assertOk();

        $resetToken = null;
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$resetToken): bool {
                $resetToken = $notification->token;

                return true;
            },
        );

        $this->postJson('/api/v1/reset-password', [
            'token' => $resetToken,
            'email' => $user->email,
            'password' => 'NewCampus2026',
            'password_confirmation' => 'NewCampus2026',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewCampus2026', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('sessions', ['id' => 'other-user-session', 'user_id' => $other->id]);
    }
}
