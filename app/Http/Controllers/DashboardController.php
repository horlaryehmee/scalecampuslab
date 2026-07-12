<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Models\EventRegistration;
use App\Models\Application;
use App\Models\Message;
use App\Models\PlatformNotification;
use App\Models\PlatformSetting;
use App\Models\PartnerSchoolTask;
use App\Models\ProjectMilestone;
use App\Models\SchoolItineraryItem;
use App\Models\TargetSchool;
use App\Models\User;
use App\Models\VisitArchive;
use App\Models\VisitRequest;
use App\Models\VisitTask;
use App\Models\WaitlistSignup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function admin(): View
    {
        return view('app', [
            'page' => 'dashboard',
            'props' => [
                'role' => 'admin',
                'title' => 'Admin Control Center',
                'subtitle' => 'Manage users, monitor platform activity, and prepare reports.',
                'metrics' => [
                    ['label' => 'Total users', 'value' => User::count()],
                    ['label' => 'Universities', 'value' => User::where('role', 'university')->count()],
                    ['label' => 'Campus events', 'value' => CampusEvent::count()],
                    ['label' => 'Registrations', 'value' => EventRegistration::count()],
                ],
                'actions' => [
                    'View all users',
                    'Monitor all events',
                    'Export reports',
                    'Review platform analytics',
                ],
                'roadmap' => $this->roadmap(),
                'events' => $this->events(),
                'registrations' => $this->registrations(),
                'users' => $this->users(),
                'schools' => $this->schools(),
                'visitRequests' => $this->visitRequests(),
                'archives' => $this->archives(),
                'tasks' => $this->tasks(),
                'analytics' => $this->analytics('admin', auth()->user()),
                'messages' => $this->messages(auth()->user()),
                'securityProfile' => $this->securityProfile(auth()->user()),
                'systemHealth' => $this->systemHealth(),
                'platformSettings' => $this->platformSettings(),
            ],
        ]);
    }

    public function university(): View
    {
        $user = auth()->user();

        return $this->dashboard('university', 'University Dashboard', 'Create campus visit events, manage capacity, and track registrations.', [
            ['label' => 'Published events', 'value' => CampusEvent::where('university_user_id', $user->id)->where('status', 'published')->count()],
            ['label' => 'Registrations', 'value' => EventRegistration::whereHas('event', fn ($query) => $query->where('university_user_id', $user->id))->count()],
            ['label' => 'Attendance rate', 'value' => '0%'],
            ['label' => 'Open seats', 'value' => $this->openSeatsForUniversity($user->id)],
        ], [
            'Create and publish campus visit events',
            'Set capacity limits',
            'View live attendee lists',
            'Track attendance and engagement',
        ], [
            'roadmap' => $this->roadmap(),
            'events' => $this->events($user->id),
            'registrations' => $this->registrations($user->id),
            'schools' => $this->schools(),
            'visitRequests' => $this->visitRequests($user->id),
            'archives' => $this->archives(),
            'tasks' => $this->tasks(),
            'analytics' => $this->analytics('university', $user),
            'messages' => $this->messages($user),
            'schoolProfile' => $this->schoolProfile($user),
            'universityOverview' => $this->universityOverview($user->id),
        ]);
    }

    public function populateUniversityDemoData(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->role === 'university', 403);

        DB::transaction(function () use ($user): void {
            CampusEvent::query()
                ->where('university_user_id', $user->id)
                ->where('is_demo', true)
                ->delete();

            $programs = [
                ['Engineering Discovery Day', 12, 180, 'Innovation Centre', 'Lagos, Nigeria'],
                ['Business & Leadership Preview', 24, 140, 'Main Auditorium', 'Lagos, Nigeria'],
                ['Health Sciences Experience', 38, 120, 'Clinical Skills Centre', 'Lagos, Nigeria'],
                ['Creative Arts Portfolio Day', 52, 100, 'Arts Pavilion', 'Lagos, Nigeria'],
                ['Computing & AI Campus Tour', 66, 160, 'Technology Hub', 'Lagos, Nigeria'],
                ['Admissions Open House', 82, 220, 'University Welcome Centre', 'Lagos, Nigeria'],
            ];

            foreach ($programs as $programIndex => [$title, $days, $capacity, $venue, $location]) {
                $startsAt = now()->addDays($days)->setTime(10, 0);
                $event = CampusEvent::create([
                    'university_user_id' => $user->id,
                    'title' => $title,
                    'starts_at' => $startsAt,
                    'ends_at' => $startsAt->copy()->addHours(3),
                    'venue' => $venue,
                    'location' => $location,
                    'description' => 'A guided campus visit program with faculty sessions, student panels, and admissions support.',
                    'capacity' => $capacity,
                    'status' => 'published',
                    'is_demo' => true,
                ]);

                foreach ([18, 22, 14, 27, 19] as $groupIndex => $partySize) {
                    $registration = EventRegistration::create([
                        'campus_event_id' => $event->id,
                        'registrant_name' => ['Lincoln High School', 'Westview Preparatory', 'St. Jude Academy', 'Greenfield College', 'Oakridge School'][$groupIndex],
                        'registrant_email' => 'demo-'.$event->id.'-'.$groupIndex.'@school.scalecampuslab.test',
                        'registrant_type' => 'school_group',
                        'party_size' => $partySize + ($programIndex * 2),
                        'status' => $groupIndex === 4 && $programIndex % 2 ? 'waitlisted' : 'confirmed',
                        'attended_at' => $programIndex === 0 && $groupIndex < 3 ? now()->subDays(2) : null,
                        'is_demo' => true,
                    ]);
                    $registration->forceFill([
                        'created_at' => now()->subWeeks(7 - $programIndex)->addDays($groupIndex),
                        'updated_at' => now(),
                    ])->saveQuietly();
                }
            }
        });

        return back()->with('status', 'University demo data populated from database records.');
    }

    public function clearUniversityDemoData(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->role === 'university', 403);

        $deleted = CampusEvent::query()
            ->where('university_user_id', $user->id)
            ->where('is_demo', true)
            ->delete();

        return back()->with('status', $deleted.' demo visit program(s) cleared. Real data was not changed.');
    }

    public function storeAdminUniversity(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', Password::defaults()],
            'verified' => ['nullable', 'boolean'],
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password'] ?? Str::password(16)),
            'role' => 'university',
            'email_verified_at' => $request->boolean('verified') ? now() : null,
        ]);

        return back()->with('status', 'Institution account created.');
    }

    public function updateAdminUniversity(Request $request, User $university): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);
        abort_unless($university->role === 'university', 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($university->id)],
            'password' => ['nullable', Password::defaults()],
            'verified' => ['nullable', 'boolean'],
        ]);

        $university->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'email_verified_at' => $request->boolean('verified') ? ($university->email_verified_at ?: now()) : null,
        ]);

        if (! empty($validated['password'])) {
            $university->password = Hash::make($validated['password']);
        }

        $university->save();

        return back()->with('status', 'Institution account updated.');
    }

    public function toggleAdminUniversityVerification(Request $request, User $university): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);
        abort_unless($university->role === 'university', 404);

        $validated = $request->validate([
            'verified' => ['required', 'boolean'],
        ]);

        $university->update([
            'email_verified_at' => $validated['verified'] ? now() : null,
        ]);

        return back()->with('status', $validated['verified'] ? 'Institution verified.' : 'Institution moved to pending verification.');
    }

    public function destroyAdminUniversity(Request $request, User $university): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);
        abort_unless($university->role === 'university', 404);

        if ($university->campusEvents()->exists()) {
            return back()->withErrors(['university' => 'This institution has visit programs. Remove or reassign those programs before deleting the account.']);
        }

        $university->delete();

        return back()->with('status', 'Institution account deleted.');
    }

    public function storeAdminSchool(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        $validated = $this->validateAdminSchool($request);
        $validated['school_code'] = $validated['school_code'] ?: $this->schoolCodeFromName($validated['name']);

        TargetSchool::create($validated);

        return back()->with('status', 'School directory entry created.');
    }

    public function updateAdminSchool(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        $validated = $this->validateAdminSchool($request, $school);
        $validated['school_code'] = $validated['school_code'] ?: $this->schoolCodeFromName($validated['name'], $school->id);

        $school->update($validated);

        return back()->with('status', 'School directory entry updated.');
    }

    public function updateAdminSchoolStatus(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['verified', 'pending', 'suspended'])],
        ]);

        $school->update(['status' => $validated['status']]);

        return back()->with('status', 'School status updated.');
    }

    public function storeUniversityPartnerSchool(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $this->validateAdminSchool($request);
        $validated['school_code'] = $validated['school_code'] ?: $this->schoolCodeFromName($validated['name']);
        $validated['status'] = $validated['status'] ?? 'verified';

        TargetSchool::create($validated);

        return back()->with('status', 'Partner school added.');
    }

    public function updateUniversityPartnerSchool(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $this->validateAdminSchool($request, $school);
        $validated['school_code'] = $validated['school_code'] ?: $this->schoolCodeFromName($validated['name'], $school->id);

        $school->update($validated);

        return back()->with('status', 'Partner school relationship updated.');
    }

    public function destroyUniversityPartnerSchool(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        if ($school->visitRequests()->exists() || $school->archives()->exists()) {
            return back()->withErrors(['school' => 'This school has engagement history. Suspend it instead of deleting shared records.']);
        }

        $school->delete();

        return back()->with('status', 'Partner school removed.');
    }

    public function contactUniversityPartnerSchool(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        Message::create([
            'user_id' => $request->user()->id,
            'type' => 'email',
            'content' => "{$validated['subject']}\n\nTo: {$school->coordinator_email}\n\n{$validated['message']}",
            'status' => 'pending',
        ]);

        PartnerSchoolTask::create([
            'target_school_id' => $school->id,
            'user_id' => $request->user()->id,
            'title' => 'Follow up with '.$school->name,
            'description' => 'Contact action queued: '.$validated['subject'],
            'status' => 'open',
            'ai_suggested' => false,
        ]);

        return back()->with('status', 'Contact action saved and queued.');
    }

    public function storeUniversityPartnerTask(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'ai_suggested' => ['nullable', 'boolean'],
        ]);

        PartnerSchoolTask::create([
            'target_school_id' => $school->id,
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => 'open',
            'ai_suggested' => $request->boolean('ai_suggested'),
        ]);

        return back()->with('status', 'Partner-school action saved.');
    }

    public function destroyAdminSchool(Request $request, TargetSchool $school): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        if ($school->visitRequests()->exists() || $school->archives()->exists()) {
            return back()->withErrors(['school' => 'This school has visit activity. Suspend it instead of deleting shared history.']);
        }

        $school->delete();

        return back()->with('status', 'School directory entry deleted.');
    }

    public function school(): View
    {
        $user = auth()->user();
        $this->ensureDemoStudentsForSchool($user);
        $this->ensureSchoolItineraryItems($user->id);

        return $this->dashboard('school', 'School Dashboard', 'Register groups of students and track participation across campus visits.', [
            ['label' => 'Discover Visits', 'value' => CampusEvent::where('status', 'published')->count()],
            ['label' => 'My Requests', 'value' => VisitRequest::where('requested_by_user_id', $user->id)->count()],
            ['label' => 'Confirmed Visits', 'value' => EventRegistration::where('user_id', $user->id)->where('status', 'confirmed')->count()],
            ['label' => 'My Students', 'value' => User::where('role', 'student')->where('school_id', $user->school_id)->count()],
        ], [
            'Register multiple students',
            'Manage student lists',
            'Assign students to events',
            'Track attendance per student',
        ], [
            'roadmap' => [],
            'events' => $this->events(statuses: ['published']),
            'registrations' => $this->registrationsForUser($user->id),
            'schools' => $this->schools(),
            'visitRequests' => $this->visitRequests(requestedByUserId: $user->id),
            'archives' => [],
            'tasks' => [],
            'analytics' => $this->analytics('school', $user),
            'messages' => $this->messages($user),
            'schoolProfile' => $this->schoolProfile($user),
            'students' => $this->students($user),
            'itineraryItems' => $this->itineraryItems($user->id),
        ]);
    }

    public function student(): View
    {
        $user = auth()->user();

        return $this->dashboard('student', 'Student Dashboard', 'Browse visit opportunities, register, and receive updates from institutions.', [
            ['label' => 'Available events', 'value' => CampusEvent::where('status', 'published')->count()],
            ['label' => 'Registrations', 'value' => EventRegistration::where('user_id', $user->id)->where('status', 'confirmed')->count()],
            ['label' => 'Waitlisted', 'value' => EventRegistration::where('user_id', $user->id)->where('status', 'waitlisted')->count()],
            ['label' => 'Notifications', 'value' => PlatformNotification::where('user_id', $user->id)->count()],
        ], [
            'Browse available campus visits',
            'Register in one click',
            'Join event waitlists',
            'Receive reminders and updates',
        ], [
            'roadmap' => [],
            'events' => $this->events(statuses: ['published']),
            'registrations' => $this->registrationsForUser($user->id),
            'schools' => [],
            'visitRequests' => [],
            'archives' => [],
            'tasks' => [],
            'analytics' => $this->analytics('student', $user),
            'messages' => $this->messages($user),
        ]);
    }

    public function sendMessage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'recipient_scope' => ['required', 'in:all,universities,schools,students,admins'],
            'content' => ['required', 'string', 'max:2000'],
            'channel' => ['required', 'in:email,sms'],
        ]);

        $roleMap = [
            'universities' => ['university'],
            'schools' => ['school', 'high_school'],
            'students' => ['student'],
            'admins' => ['admin'],
        ];

        $recipients = User::query()
            ->when($validated['recipient_scope'] !== 'all', fn ($query) => $query->whereIn('role', $roleMap[$validated['recipient_scope']]))
            ->whereKeyNot($request->user()->id)
            ->limit(100)
            ->get();

        foreach ($recipients as $recipient) {
            Message::create([
                'user_id' => $recipient->id,
                'type' => $validated['channel'],
                'content' => $validated['content'],
                'status' => 'pending',
            ]);

            PlatformNotification::create([
                'user_id' => $recipient->id,
                'channel' => $validated['channel'],
                'subject' => 'New campus visit message',
                'body' => $validated['content'],
                'status' => 'queued',
            ]);
        }

        return back()->with('status', 'Message queued for '.$recipients->count().' recipient(s).');
    }

    public function updateUniversityAttendee(Request $request, EventRegistration $registration): RedirectResponse
    {
        $this->authorizeUniversityRegistration($request, $registration);

        $validated = $request->validate([
            'registrant_name' => ['required', 'string', 'max:160'],
            'registrant_email' => [
                'required',
                'email:rfc',
                'max:160',
                Rule::unique('event_registrations', 'registrant_email')
                    ->where('campus_event_id', $registration->campus_event_id)
                    ->ignore($registration->id),
            ],
            'registrant_type' => ['required', Rule::in(['student', 'school_group'])],
            'party_size' => ['required', 'integer', 'min:1', 'max:5000'],
            'status' => ['required', Rule::in(['confirmed', 'waitlisted', 'cancelled'])],
            'attended' => ['nullable', 'boolean'],
        ]);

        $event = $registration->event;
        if ($validated['status'] === 'confirmed') {
            $confirmedSeats = (int) $event->registrations()
                ->whereKeyNot($registration->id)
                ->where('status', 'confirmed')
                ->sum('party_size');

            if (($confirmedSeats + (int) $validated['party_size']) > $event->capacity) {
                return back()->withErrors(['party_size' => 'This update would exceed the program capacity. Move the attendee to waitlist or reduce seats.']);
            }
        }

        $registration->update([
            'registrant_name' => $validated['registrant_name'],
            'registrant_email' => $validated['registrant_email'],
            'registrant_type' => $validated['registrant_type'],
            'party_size' => $validated['party_size'],
            'status' => $validated['status'],
            'attended_at' => $request->boolean('attended') ? ($registration->attended_at ?: now()) : null,
        ]);

        $this->promoteCampusEventWaitlist($event);

        return back()->with('status', 'Attendee updated.');
    }

    public function destroyUniversityAttendee(Request $request, EventRegistration $registration): RedirectResponse
    {
        $this->authorizeUniversityRegistration($request, $registration);

        $event = $registration->event;
        $registration->delete();
        $this->promoteCampusEventWaitlist($event);

        return back()->with('status', 'Attendee removed.');
    }

    public function messageUniversityAttendees(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'registration_ids' => ['required', 'array', 'min:1'],
            'registration_ids.*' => ['integer', 'exists:event_registrations,id'],
            'channel' => ['required', 'in:email,sms'],
            'content' => ['required', 'string', 'max:1200'],
        ]);

        $registrations = EventRegistration::query()
            ->with('event:id,title,university_user_id')
            ->whereIn('id', array_unique($validated['registration_ids']))
            ->whereHas('event', fn ($query) => $query->where('university_user_id', $request->user()->id))
            ->get();

        foreach ($registrations as $registration) {
            PlatformNotification::create([
                'user_id' => $registration->user_id,
                'campus_event_id' => $registration->campus_event_id,
                'channel' => $validated['channel'],
                'subject' => 'Campus visit attendee update',
                'body' => $validated['content'],
                'status' => 'queued',
            ]);
        }

        return back()->with('status', 'Message queued for '.$registrations->count().' attendee record(s).');
    }

    public function storeAdminUser(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $this->validateAdminUser($request);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password'] ?: Str::password(18)),
            'role' => $validated['role'],
            'access_status' => $validated['access_status'],
            'email_verified_at' => $request->boolean('verified') ? now() : null,
            'two_factor_enabled' => $request->boolean('two_factor_enabled'),
            'security_alerts' => $request->boolean('security_alerts'),
            'recovery_email' => $validated['recovery_email'] ?: null,
        ]);

        return back()->with('status', 'User account created.');
    }

    public function updateAdminUser(Request $request, User $managedUser): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $this->validateAdminUser($request, $managedUser->id);

        if ($managedUser->is($request->user()) && ($validated['role'] !== 'admin' || $validated['access_status'] === 'suspended')) {
            return back()->withErrors(['access_status' => 'You cannot remove or suspend your own administrator access.']);
        }

        $managedUser->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'access_status' => $validated['access_status'],
            'email_verified_at' => $request->boolean('verified') ? ($managedUser->email_verified_at ?: now()) : null,
            'two_factor_enabled' => $request->boolean('two_factor_enabled'),
            'security_alerts' => $request->boolean('security_alerts'),
            'recovery_email' => $validated['recovery_email'] ?: null,
        ]);

        if (! empty($validated['password'])) {
            $managedUser->password = Hash::make($validated['password']);
        }

        $managedUser->save();

        return back()->with('status', 'User access updated.');
    }

    public function updateAdminUserAccess(Request $request, User $managedUser): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'access_status' => ['required', Rule::in(['active', 'pending', 'suspended'])],
        ]);

        if ($managedUser->is($request->user()) && $validated['access_status'] === 'suspended') {
            return back()->withErrors(['access_status' => 'You cannot suspend your own administrator account.']);
        }

        $managedUser->update(['access_status' => $validated['access_status']]);

        PlatformNotification::create([
            'user_id' => $managedUser->id,
            'channel' => 'email',
            'subject' => 'Account access updated',
            'body' => 'Your ScaleCampusLab account status is now '.$validated['access_status'].'.',
            'status' => 'queued',
        ]);

        return back()->with('status', 'User access status updated.');
    }

    public function destroyAdminUser(Request $request, User $managedUser): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        if ($managedUser->is($request->user())) {
            return back()->withErrors(['user' => 'You cannot delete your own administrator account.']);
        }

        if ($managedUser->campusEvents()->exists() || $managedUser->eventRegistrations()->exists()) {
            return back()->withErrors(['user' => 'Users with visit programs or registrations must be suspended instead of deleted.']);
        }

        $managedUser->delete();

        return back()->with('status', 'User account deleted.');
    }

    public function updateAdminPlatformSettings(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validate([
            'platform_name' => ['required', 'string', 'max:120'],
            'support_email' => ['required', 'email:rfc', 'max:160'],
            'primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'default_language' => ['required', 'string', 'max:40'],
            'supported_languages' => ['nullable', 'string', 'max:255'],
            'ai_matchmaking' => ['nullable', 'boolean'],
            'beta_messaging' => ['nullable', 'boolean'],
            'advanced_analytics' => ['nullable', 'boolean'],
            'maintenance_mode' => ['nullable', 'boolean'],
            'admin_mfa_required' => ['nullable', 'boolean'],
            'session_timeout_minutes' => ['required', 'integer', 'min:15', 'max:240'],
            'password_rotation_days' => ['required', 'integer', 'min:30', 'max:365'],
            'data_retention_days' => ['required', 'integer', 'min:30', 'max:3650'],
            'api_key_label' => ['nullable', 'string', 'max:100'],
            'webhook_url' => ['nullable', 'url', 'max:500'],
            'lms_provider' => ['nullable', 'string', 'max:100'],
        ]);

        $settings = [
            'branding' => [
                'platformName' => $validated['platform_name'],
                'supportEmail' => $validated['support_email'],
                'primaryColor' => $validated['primary_color'],
                'logoUrl' => $validated['logo_url'] ?? null,
            ],
            'localization' => [
                'defaultLanguage' => $validated['default_language'],
                'supportedLanguages' => collect(explode(',', $validated['supported_languages'] ?? 'English'))
                    ->map(fn (string $language) => trim($language))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
            ],
            'features' => [
                'aiMatchmaking' => $request->boolean('ai_matchmaking'),
                'betaMessaging' => $request->boolean('beta_messaging'),
                'advancedAnalytics' => $request->boolean('advanced_analytics'),
                'maintenanceMode' => $request->boolean('maintenance_mode'),
            ],
            'security' => [
                'adminMfaRequired' => $request->boolean('admin_mfa_required'),
                'sessionTimeoutMinutes' => (int) $validated['session_timeout_minutes'],
                'passwordRotationDays' => (int) $validated['password_rotation_days'],
                'dataRetentionDays' => (int) $validated['data_retention_days'],
            ],
            'integrations' => [
                'apiKeyLabel' => $validated['api_key_label'] ?: 'Master API Key',
                'webhookUrl' => $validated['webhook_url'] ?? null,
                'lmsProvider' => $validated['lms_provider'] ?: 'Canvas',
            ],
            'updatedBy' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'updatedAt' => now()->toIso8601String(),
            ],
        ];

        PlatformSetting::updateOrCreate(['key' => 'admin.global'], ['value' => $settings]);

        return back()->with('status', 'Global platform settings saved.');
    }

    public function updateSecurityPassword(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);

        $user->update(['password' => $validated['password']]);

        PlatformNotification::create([
            'user_id' => $user->id,
            'channel' => 'email',
            'subject' => 'Password changed',
            'body' => 'Your ScaleCampusLab account password was updated.',
            'status' => 'queued',
        ]);

        return back()->with('status', 'Password updated securely.');
    }

    public function updateSecurityPreferences(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $validated = $request->validate([
            'two_factor_enabled' => ['nullable', 'boolean'],
            'security_alerts' => ['nullable', 'boolean'],
            'recovery_email' => ['nullable', 'email:rfc', 'max:160'],
        ]);

        $user->update([
            'two_factor_enabled' => $request->boolean('two_factor_enabled'),
            'security_alerts' => $request->boolean('security_alerts'),
            'recovery_email' => $validated['recovery_email'] ?: null,
        ]);

        return back()->with('status', 'Security preferences saved.');
    }

    public function revokeOtherSessions(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $deleted = DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        return back()->with('status', $deleted.' other active session(s) revoked.');
    }

    public function updateSchoolSettings(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isSchool(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'location' => ['required', 'string', 'max:255'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'coordinator_name' => ['required', 'string', 'max:160'],
            'coordinator_email' => ['required', 'email:rfc', 'max:160'],
            'coordinator_phone' => ['nullable', 'string', 'max:50'],
            'email_notifications' => ['nullable', 'boolean'],
            'sms_alerts' => ['nullable', 'boolean'],
        ]);

        $school = $request->user()->school;

        if (! $school) {
            return back()->withErrors(['name' => 'No school account is linked to this user.']);
        }

        $school->update(array_merge($validated, [
            'email_notifications' => $request->boolean('email_notifications'),
            'sms_alerts' => $request->boolean('sms_alerts'),
        ]));

        return back()->with('status', 'School settings saved.');
    }

    public function storeSchoolStudent(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isSchool(), 403);
        abort_unless($request->user()->school_id, 422, 'Your school account is not linked to a school.');

        $validated = $this->validateSchoolStudent($request);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make(Str::password(16)),
            'role' => 'student',
            'school_id' => $request->user()->school_id,
            'student_identifier' => $validated['student_identifier'] ?: $this->nextStudentIdentifier(),
            'grade_level' => $validated['grade_level'],
            'interest_major' => $validated['interest_major'],
            'assigned_events' => [],
            'email_verified_at' => now(),
        ]);

        return back()->with('status', 'Student added.');
    }

    public function updateSchoolStudent(Request $request, User $student): RedirectResponse
    {
        $this->authorizeSchoolStudent($request, $student);

        $validated = $this->validateSchoolStudent($request, $student->id);
        $student->update($validated);

        return back()->with('status', 'Student updated.');
    }

    public function destroySchoolStudent(Request $request, User $student): RedirectResponse
    {
        $this->authorizeSchoolStudent($request, $student);
        $student->delete();

        return back()->with('status', 'Student deleted.');
    }

    public function assignSchoolStudents(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isSchool(), 403);

        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', 'exists:users,id'],
            'event_title' => ['required', 'string', 'max:160'],
        ]);

        $students = User::query()
            ->where('role', 'student')
            ->where('school_id', $request->user()->school_id)
            ->whereIn('id', $validated['student_ids'])
            ->get();

        foreach ($students as $student) {
            $assigned = collect($student->assigned_events ?: [])
                ->push($validated['event_title'])
                ->unique()
                ->values()
                ->all();

            $student->update(['assigned_events' => $assigned]);
        }

        return back()->with('status', 'Assigned '.$students->count().' student(s) to '.$validated['event_title'].'.');
    }

    public function bulkStoreSchoolStudents(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isSchool(), 403);
        abort_unless($request->user()->school_id, 422, 'Your school account is not linked to a school.');

        $validated = $request->validate([
            'csv' => ['required', 'string', 'max:20000'],
        ]);

        $rows = collect(preg_split('/\r\n|\r|\n/', trim($validated['csv'])))
            ->filter()
            ->map(function (string $line): array {
                [$name, $email, $grade, $interest] = array_pad(array_map('trim', str_getcsv($line)), 4, null);

                return compact('name', 'email', 'grade', 'interest');
            })
            ->filter(fn (array $row) => $row['name'] && $row['email'])
            ->values();

        if ($rows->isEmpty()) {
            return back()->withErrors(['csv' => 'Add at least one valid CSV row: Name, Email, Grade, Interest.']);
        }

        $created = 0;
        foreach ($rows as $row) {
            if (User::where('email', $row['email'])->exists()) {
                continue;
            }

            User::create([
                'name' => $row['name'],
                'email' => $row['email'],
                'password' => Hash::make(Str::password(16)),
                'role' => 'student',
                'school_id' => $request->user()->school_id,
                'student_identifier' => $this->nextStudentIdentifier(),
                'grade_level' => $row['grade'] ?: '12th',
                'interest_major' => $row['interest'] ?: 'Undecided',
                'assigned_events' => [],
                'email_verified_at' => now(),
            ]);
            $created++;
        }

        return back()->with('status', 'Bulk upload complete. Added '.$created.' student(s).');
    }

    private function dashboard(string $role, string $title, string $subtitle, array $metrics, array $actions, array $extra = []): View
    {
        $extra['securityProfile'] = $extra['securityProfile'] ?? $this->securityProfile(auth()->user());

        return view('app', [
            'page' => 'dashboard',
            'props' => compact('role', 'title', 'subtitle', 'metrics', 'actions') + $extra,
        ]);
    }

    private function securityProfile(?User $user): array
    {
        if (! $user) {
            return [];
        }

        $sessionTable = config('session.table', 'sessions');
        $currentSessionId = request()?->session()?->getId();
        $sessions = DB::table($sessionTable)
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->limit(8)
            ->get()
            ->map(fn ($session) => [
                'id' => $session->id,
                'device' => $this->deviceLabel((string) $session->user_agent),
                'ip' => $session->ip_address ?: 'Unknown IP',
                'lastActivity' => date('M j, Y g:i A', (int) $session->last_activity),
                'isCurrent' => hash_equals((string) $session->id, (string) $currentSessionId),
            ])
            ->toArray();

        $score = 45
            + ($user->email_verified_at ? 15 : 0)
            + ($user->two_factor_enabled ? 20 : 0)
            + ($user->security_alerts ? 10 : 0)
            + ($user->recovery_email ? 5 : 0)
            + (count($sessions) <= 2 ? 5 : 0);

        $recentNotifications = PlatformNotification::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (PlatformNotification $notification) => [
                'subject' => $notification->subject,
                'status' => $notification->status,
                'createdAt' => $notification->created_at?->format('M j, Y g:i A'),
            ])
            ->toArray();

        return [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'emailVerified' => $user->email_verified_at !== null,
            ],
            'twoFactorEnabled' => (bool) $user->two_factor_enabled,
            'securityAlerts' => (bool) $user->security_alerts,
            'recoveryEmail' => $user->recovery_email,
            'sessions' => $sessions,
            'sessionCount' => count($sessions),
            'securityScore' => min(100, $score),
            'recentNotifications' => $recentNotifications,
            'passwordUpdatedAt' => $user->updated_at?->format('M j, Y'),
        ];
    }

    private function validateAdminUser(Request $request, ?int $ignoreUserId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($ignoreUserId)],
            'password' => ['nullable', 'string', Password::min(10)->mixedCase()->numbers()],
            'role' => ['required', Rule::in(['admin', 'university', 'school', 'student'])],
            'access_status' => ['required', Rule::in(['active', 'pending', 'suspended'])],
            'verified' => ['nullable', 'boolean'],
            'two_factor_enabled' => ['nullable', 'boolean'],
            'security_alerts' => ['nullable', 'boolean'],
            'recovery_email' => ['nullable', 'email:rfc', 'max:160'],
        ]);
    }

    private function systemHealth(): array
    {
        $startedAt = microtime(true);
        $databaseCheck = $this->healthCheck('Database', function (): array {
            $queryStartedAt = microtime(true);
            DB::select('select 1');

            return [
                'detail' => 'Connected to '.config('database.default').' database.',
                'latencyMs' => round((microtime(true) - $queryStartedAt) * 1000, 2),
            ];
        });

        $storageCheck = $this->healthCheck('Storage', function (): array {
            $path = storage_path('framework');

            return [
                'detail' => is_writable($path) ? 'Storage framework path is writable.' : 'Storage framework path is not writable.',
                'status' => is_writable($path) ? 'operational' : 'critical',
            ];
        });

        $logCheck = $this->healthCheck('Application Logs', function (): array {
            $logPath = storage_path('logs/laravel.log');
            $exists = file_exists($logPath);
            $size = $exists ? filesize($logPath) : 0;

            return [
                'detail' => $exists ? 'Latest log size: '.$this->bytesToHuman((int) $size).'.' : 'No Laravel log file exists yet.',
                'status' => $size > 10 * 1024 * 1024 ? 'warning' : 'operational',
            ];
        });

        $diskFree = @disk_free_space(base_path()) ?: 0;
        $diskTotal = @disk_total_space(base_path()) ?: 0;
        $diskUsedPercent = $diskTotal > 0 ? round((($diskTotal - $diskFree) / $diskTotal) * 100, 1) : 0;
        $memoryLimit = ini_get('memory_limit') ?: 'unknown';
        $memoryUsed = memory_get_usage(true);
        $queueConnection = config('queue.default');
        $sessionDriver = config('session.driver');
        $mailMailer = config('mail.default');
        $cacheDriver = config('cache.default');
        $recentNotifications = PlatformNotification::query()->latest()->limit(8)->get();
        $recentUsers = User::query()->latest()->limit(5)->get();
        $recentEvents = CampusEvent::query()->latest()->limit(5)->get();
        $recentRequests = VisitRequest::query()->latest()->limit(5)->get();
        $checks = [
            $databaseCheck,
            $storageCheck,
            $logCheck,
            [
                'name' => 'Queue Worker',
                'status' => in_array($queueConnection, ['database', 'redis', 'sync'], true) ? 'operational' : 'warning',
                'detail' => 'Queue connection: '.$queueConnection.'.',
                'latencyMs' => null,
            ],
            [
                'name' => 'Mail Transport',
                'status' => $mailMailer === 'log' ? 'warning' : 'operational',
                'detail' => $mailMailer === 'log' ? 'Mail is currently logging messages. Configure SMTP for production.' : 'Mail transport: '.$mailMailer.'.',
                'latencyMs' => null,
            ],
            [
                'name' => 'Session Store',
                'status' => in_array($sessionDriver, ['database', 'redis', 'file'], true) ? 'operational' : 'warning',
                'detail' => 'Session driver: '.$sessionDriver.'.',
                'latencyMs' => null,
            ],
            [
                'name' => 'Cache Store',
                'status' => in_array($cacheDriver, ['database', 'redis', 'file', 'array'], true) ? 'operational' : 'warning',
                'detail' => 'Cache driver: '.$cacheDriver.'.',
                'latencyMs' => null,
            ],
        ];
        $critical = collect($checks)->where('status', 'critical')->count();
        $warnings = collect($checks)->where('status', 'warning')->count();
        $healthScore = max(0, 100 - ($critical * 30) - ($warnings * 10) - ($diskUsedPercent >= 90 ? 15 : 0));

        return [
            'generatedAt' => now()->toIso8601String(),
            'server' => [
                'environment' => app()->environment(),
                'debug' => config('app.debug'),
                'appUrl' => config('app.url'),
                'phpVersion' => PHP_VERSION,
                'laravelVersion' => app()->version(),
                'timezone' => config('app.timezone'),
                'serverSoftware' => request()->server('SERVER_SOFTWARE') ?: PHP_SAPI,
                'responseMs' => round((microtime(true) - $startedAt) * 1000, 2),
                'memoryUsed' => $this->bytesToHuman($memoryUsed),
                'memoryLimit' => $memoryLimit,
                'diskUsedPercent' => $diskUsedPercent,
                'diskFree' => $this->bytesToHuman((int) $diskFree),
                'diskTotal' => $this->bytesToHuman((int) $diskTotal),
            ],
            'score' => $healthScore,
            'status' => $critical > 0 ? 'critical' : ($warnings > 0 ? 'warning' : 'operational'),
            'checks' => $checks,
            'services' => [
                ['label' => 'Database', 'value' => config('database.default'), 'status' => $databaseCheck['status']],
                ['label' => 'Queue', 'value' => $queueConnection, 'status' => in_array($queueConnection, ['database', 'redis', 'sync'], true) ? 'operational' : 'warning'],
                ['label' => 'Mail', 'value' => $mailMailer, 'status' => $mailMailer === 'log' ? 'warning' : 'operational'],
                ['label' => 'Cache', 'value' => $cacheDriver, 'status' => 'operational'],
                ['label' => 'Sessions', 'value' => $sessionDriver, 'status' => 'operational'],
            ],
            'auditEvents' => collect()
                ->merge($recentUsers->map(fn (User $user) => [
                    'type' => 'User',
                    'title' => 'User account updated',
                    'body' => $user->name.' ('.$user->role.')',
                    'status' => $user->access_status ?: 'active',
                    'createdAt' => $user->updated_at?->toIso8601String(),
                ]))
                ->merge($recentEvents->map(fn (CampusEvent $event) => [
                    'type' => 'Visit Program',
                    'title' => $event->title,
                    'body' => ($event->status ?: 'draft').' • '.$event->location,
                    'status' => $event->status ?: 'draft',
                    'createdAt' => $event->updated_at?->toIso8601String(),
                ]))
                ->merge($recentRequests->map(fn (VisitRequest $request) => [
                    'type' => 'Visit Request',
                    'title' => 'Request #'.$request->id,
                    'body' => ($request->status ?: 'requested').' • '.$request->group_size.' seats',
                    'status' => $request->status ?: 'requested',
                    'createdAt' => $request->updated_at?->toIso8601String(),
                ]))
                ->merge($recentNotifications->map(fn (PlatformNotification $notification) => [
                    'type' => 'Notification',
                    'title' => $notification->subject,
                    'body' => ($notification->channel ?: 'email').' • '.$notification->status,
                    'status' => $notification->status,
                    'createdAt' => $notification->created_at?->toIso8601String(),
                ]))
                ->sortByDesc('createdAt')
                ->take(12)
                ->values()
                ->toArray(),
        ];
    }

    private function healthCheck(string $name, callable $callback): array
    {
        try {
            $result = $callback();

            return [
                'name' => $name,
                'status' => $result['status'] ?? 'operational',
                'detail' => $result['detail'] ?? 'Operational.',
                'latencyMs' => $result['latencyMs'] ?? null,
            ];
        } catch (\Throwable $exception) {
            return [
                'name' => $name,
                'status' => 'critical',
                'detail' => $exception->getMessage(),
                'latencyMs' => null,
            ];
        }
    }

    private function bytesToHuman(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $power = min((int) floor(log($bytes, 1024)), count($units) - 1);

        return round($bytes / (1024 ** $power), 2).' '.$units[$power];
    }

    private function platformSettings(): array
    {
        $defaults = [
            'branding' => [
                'platformName' => config('app.name', 'ScaleCampusLab'),
                'supportEmail' => config('mail.from.address', 'support@scalecampuslab.com'),
                'primaryColor' => '#005EB2',
                'logoUrl' => null,
            ],
            'localization' => [
                'defaultLanguage' => 'English',
                'supportedLanguages' => ['English', 'Spanish', 'French'],
            ],
            'features' => [
                'aiMatchmaking' => true,
                'betaMessaging' => false,
                'advancedAnalytics' => true,
                'maintenanceMode' => false,
            ],
            'security' => [
                'adminMfaRequired' => true,
                'sessionTimeoutMinutes' => 30,
                'passwordRotationDays' => 90,
                'dataRetentionDays' => 365,
            ],
            'integrations' => [
                'apiKeyLabel' => 'Master API Key',
                'apiKeyMasked' => 'sc_live_'.substr(hash('sha256', config('app.key', 'local')), 0, 4).'_••••',
                'webhookUrl' => null,
                'lmsProvider' => 'Canvas',
                'activeWebhooks' => PlatformNotification::query()->where('status', 'queued')->count(),
            ],
            'updatedBy' => [
                'id' => null,
                'name' => 'System defaults',
                'updatedAt' => null,
            ],
        ];

        $saved = PlatformSetting::query()->find('admin.global')?->value ?? [];
        $settings = array_replace_recursive($defaults, $saved);
        $settings['integrations']['activeWebhooks'] = PlatformNotification::query()->where('status', 'queued')->count();
        $settings['system'] = [
            'healthScore' => $this->systemHealth()['score'] ?? 0,
            'environment' => app()->environment(),
            'debug' => config('app.debug'),
        ];

        return $settings;
    }

    private function deviceLabel(string $userAgent): string
    {
        $browser = match (true) {
            str_contains($userAgent, 'Edg') => 'Edge',
            str_contains($userAgent, 'Chrome') => 'Chrome',
            str_contains($userAgent, 'Firefox') => 'Firefox',
            str_contains($userAgent, 'Safari') => 'Safari',
            default => 'Browser',
        };

        $platform = match (true) {
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'Mac') => 'MacOS',
            str_contains($userAgent, 'iPhone') => 'iPhone',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => 'Unknown device',
        };

        return $browser.' on '.$platform;
    }

    private function roadmap(): array
    {
        return ProjectMilestone::query()
            ->orderBy('sort_order')
            ->get(['id', 'category', 'title', 'description', 'status'])
            ->groupBy('category')
            ->map(fn ($items) => $items->values())
            ->toArray();
    }

    private function events(?int $universityUserId = null, ?array $statuses = null): array
    {
        return CampusEvent::query()
            ->withSum(['registrations as confirmed_seats' => fn ($query) => $query->where('status', 'confirmed')], 'party_size')
            ->with('university:id,name')
            ->when($universityUserId, fn ($query) => $query->where('university_user_id', $universityUserId))
            ->when($statuses, fn ($query) => $query->whereIn('status', $statuses))
            ->orderBy('starts_at')
            ->limit(20)
            ->get()
            ->map(fn (CampusEvent $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'universityId' => $event->university_user_id,
                'university' => $event->university?->name,
                'startsAt' => $event->starts_at?->toIso8601String(),
                'endsAt' => $event->ends_at?->toIso8601String(),
                'registrationOpensAt' => $event->registration_opens_at?->toIso8601String(),
                'registrationClosesAt' => $event->registration_closes_at?->toIso8601String(),
                'venue' => $event->venue,
                'location' => $event->location,
                'latitude' => $event->latitude !== null ? (float) $event->latitude : null,
                'longitude' => $event->longitude !== null ? (float) $event->longitude : null,
                'description' => $event->description,
                'capacity' => $event->capacity,
                'perSchoolCapacity' => $event->per_school_capacity,
                'perGroupCapacity' => $event->per_group_capacity,
                'confirmedSeats' => (int) ($event->confirmed_seats ?? 0),
                'status' => $event->status,
                'visibility' => $event->visibility ?? 'public',
                'lifecycleStage' => $event->lifecycle_stage ?? 'planning',
                'invitedSchoolIds' => $event->invited_school_ids ?: [],
                'lifecycleLog' => $event->lifecycle_log ?: [],
            ])
            ->toArray();
    }

    private function registrations(?int $universityUserId = null): array
    {
        return EventRegistration::query()
            ->with([
                'event:id,title,university_user_id,starts_at,ends_at,venue,location,latitude,longitude,capacity,status',
                'event.university:id,name',
                'user:id,name,email,role,school_id,student_identifier,grade_level,interest_major',
                'user.school:id,name,location',
            ])
            ->when($universityUserId, fn ($query) => $query->whereHas('event', fn ($eventQuery) => $eventQuery->where('university_user_id', $universityUserId)))
            ->latest()
            ->limit(250)
            ->get()
            ->map(fn (EventRegistration $registration) => [
                'id' => $registration->id,
                'name' => $registration->registrant_name,
                'email' => $registration->registrant_email,
                'type' => $registration->registrant_type,
                'partySize' => $registration->party_size,
                'status' => $registration->status,
                'attended' => $registration->attended_at !== null,
                'attendedAt' => $registration->attended_at?->toIso8601String(),
                'event' => $registration->event?->title,
                'eventId' => $registration->campus_event_id,
                'universityId' => $registration->event?->university_user_id,
                'university' => $registration->event?->university?->name,
                'eventDate' => $registration->event?->starts_at?->toIso8601String(),
                'eventStatus' => $registration->event?->status,
                'venue' => $registration->event?->venue,
                'eventLocation' => $registration->event?->location,
                'latitude' => $registration->event?->latitude !== null ? (float) $registration->event->latitude : null,
                'longitude' => $registration->event?->longitude !== null ? (float) $registration->event->longitude : null,
                'eventCapacity' => $registration->event?->capacity,
                'school' => $registration->user?->school?->name ?: ($registration->registrant_type === 'school_group' ? $registration->registrant_name : 'Direct student'),
                'schoolLocation' => $registration->user?->school?->location ?: ($registration->event?->location ?: 'Location TBA'),
                'studentId' => $registration->user?->student_identifier,
                'grade' => $registration->user?->grade_level,
                'interest' => $registration->user?->interest_major ?: $this->interestFromRegistration($registration),
                'isDemo' => $registration->is_demo,
                'createdAt' => $registration->created_at?->toIso8601String(),
            ])
            ->toArray();
    }

    private function registrationsForUser(int $userId): array
    {
        return $this->registrationsQueryForUser($userId)->get()->map(fn (EventRegistration $registration) => [
            'id' => $registration->id,
            'name' => $registration->registrant_name,
            'email' => $registration->registrant_email,
            'type' => $registration->registrant_type,
            'partySize' => $registration->party_size,
            'status' => $registration->status,
            'event' => $registration->event?->title,
            'eventId' => $registration->campus_event_id,
            'universityId' => $registration->event?->university_user_id,
            'university' => $registration->event?->university?->name,
            'eventDate' => $registration->event?->starts_at?->toIso8601String(),
            'eventStatus' => $registration->event?->status,
            'venue' => $registration->event?->venue,
            'eventLocation' => $registration->event?->location,
            'latitude' => $registration->event?->latitude !== null ? (float) $registration->event->latitude : null,
            'longitude' => $registration->event?->longitude !== null ? (float) $registration->event->longitude : null,
            'eventCapacity' => $registration->event?->capacity,
            'createdAt' => $registration->created_at?->toIso8601String(),
        ])->toArray();
    }

    private function registrationsQueryForUser(int $userId)
    {
        return EventRegistration::query()
            ->with(['event:id,title,university_user_id,starts_at,ends_at,venue,location,latitude,longitude,capacity,status', 'event.university:id,name'])
            ->where('user_id', $userId)
            ->latest()
            ->limit(20);
    }

    private function authorizeUniversityRegistration(Request $request, EventRegistration $registration): void
    {
        abort_unless($request->user()?->role === 'university', 403);
        abort_unless($registration->event?->university_user_id === $request->user()->id, 403);
    }

    private function promoteCampusEventWaitlist(CampusEvent $event): void
    {
        $confirmedSeats = (int) $event->registrations()->where('status', 'confirmed')->sum('party_size');
        $availableSeats = max(0, $event->capacity - $confirmedSeats);

        while ($availableSeats > 0) {
            $next = $event->registrations()
                ->where('status', 'waitlisted')
                ->oldest()
                ->first();

            if (! $next || $next->party_size > $availableSeats) {
                return;
            }

            $next->update(['status' => 'confirmed']);
            $availableSeats -= $next->party_size;
        }
    }

    private function interestFromRegistration(EventRegistration $registration): string
    {
        $haystack = strtolower(($registration->event?->title ?? '').' '.$registration->registrant_name);

        return match (true) {
            str_contains($haystack, 'engineer'), str_contains($haystack, 'robot'), str_contains($haystack, 'tech'), str_contains($haystack, 'comput') => 'Computer Science',
            str_contains($haystack, 'health'), str_contains($haystack, 'bio'), str_contains($haystack, 'med') => 'Pre-Med / Biology',
            str_contains($haystack, 'business'), str_contains($haystack, 'leadership') => 'Business Admin',
            str_contains($haystack, 'creative'), str_contains($haystack, 'arts') => 'Design / Creative Arts',
            default => $registration->registrant_type === 'school_group' ? 'Mixed academic interests' : 'Undeclared',
        };
    }

    private function openSeatsForUniversity(int $userId): int
    {
        return CampusEvent::query()
            ->where('university_user_id', $userId)
            ->where('status', 'published')
            ->get()
            ->sum(fn (CampusEvent $event) => $event->remainingSeats());
    }

    private function universityOverview(int $userId): array
    {
        $events = CampusEvent::query()
            ->where('university_user_id', $userId)
            ->where('status', '!=', 'cancelled');
        $eventIds = (clone $events)->pluck('id');
        $registrations = EventRegistration::query()->whereIn('campus_event_id', $eventIds);
        $confirmed = (clone $registrations)->where('status', 'confirmed');
        $bookedStudents = (int) $confirmed->sum('party_size');
        $totalCapacity = (int) (clone $events)->where('status', 'published')->sum('capacity');
        $attendedStudents = (int) (clone $registrations)->whereNotNull('attended_at')->sum('party_size');

        $trend = collect(range(7, 0))->map(function (int $weeksAgo) use ($registrations): array {
            $start = now()->startOfWeek()->subWeeks($weeksAgo);
            $end = $start->copy()->endOfWeek();

            return [
                'label' => $start->format('M j'),
                'value' => (int) (clone $registrations)
                    ->where('status', 'confirmed')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('party_size'),
            ];
        })->values()->all();

        return [
            'totalVisits' => (clone $events)->count(),
            'bookedStudents' => $bookedStudents,
            'capacityUsage' => $totalCapacity > 0 ? (int) round(($bookedStudents / $totalCapacity) * 100) : 0,
            'attendanceRate' => $bookedStudents > 0 ? (int) round(($attendedStudents / $bookedStudents) * 100) : 0,
            'trend' => $trend,
            'demoEvents' => (clone $events)->where('is_demo', true)->count(),
            'demoRegistrations' => (clone $registrations)->where('is_demo', true)->count(),
        ];
    }

    private function schools(): array
    {
        return TargetSchool::query()
            ->with(['partnerTasks' => fn ($query) => $query->latest()->limit(8)])
            ->withCount(['visitRequests', 'archives', 'partnerTasks'])
            ->orderByDesc('match_score')
            ->limit(250)
            ->get()
            ->map(fn (TargetSchool $school) => [
                'id' => $school->id,
                'code' => $school->school_code ?: $this->schoolCodeFromName($school->name, $school->id),
                'name' => $school->name,
                'city' => $school->city,
                'region' => $school->region,
                'country' => $school->country,
                'latitude' => $school->latitude !== null ? (float) $school->latitude : null,
                'longitude' => $school->longitude !== null ? (float) $school->longitude : null,
                'district' => $school->district ?: $school->region,
                'coordinatorName' => $school->coordinator_name ?: 'Coordinator pending',
                'coordinatorEmail' => $school->coordinator_email,
                'status' => $school->status ?: 'verified',
                'type' => $school->school_type,
                'tier' => $school->performance_tier,
                'sat' => $school->average_sat,
                'yieldRate' => (float) $school->yield_rate,
                'matchScore' => $school->match_score,
                'activeApplicants' => $school->active_applicants,
                'visitRequests' => $school->visit_requests_count,
                'archiveVisits' => $school->archives_count,
                'taskCount' => $school->partner_tasks_count,
                'tasks' => $school->partnerTasks->map(fn (PartnerSchoolTask $task) => [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'aiSuggested' => $task->ai_suggested,
                    'createdAt' => $task->created_at?->toIso8601String(),
                ])->toArray(),
                'notes' => $school->notes,
                'isDemo' => $school->is_demo,
                'createdAt' => $school->created_at?->toIso8601String(),
            ])
            ->toArray();
    }

    private function validateAdminSchool(Request $request, ?TargetSchool $school = null): array
    {
        return $request->validate([
            'school_code' => ['nullable', 'string', 'max:40', Rule::unique('target_schools', 'school_code')->ignore($school?->id)],
            'name' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'region' => ['required', 'string', 'max:120'],
            'country' => ['required', 'string', 'max:120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'district' => ['nullable', 'string', 'max:160'],
            'coordinator_name' => ['nullable', 'string', 'max:160'],
            'coordinator_email' => ['nullable', 'email', 'max:255'],
            'status' => ['required', Rule::in(['verified', 'pending', 'suspended'])],
            'school_type' => ['required', Rule::in(['public', 'private', 'ib_school', 'charter'])],
            'performance_tier' => ['required', Rule::in(['elite', 'high', 'emerging', 'stable'])],
            'average_sat' => ['nullable', 'integer', 'min:400', 'max:1600'],
            'yield_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'match_score' => ['required', 'integer', 'min:0', 'max:100'],
            'active_applicants' => ['required', 'integer', 'min:0', 'max:100000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function schoolCodeFromName(string $name, ?int $id = null): string
    {
        $prefix = Str::of($name)
            ->upper()
            ->replaceMatches('/[^A-Z0-9 ]/', '')
            ->explode(' ')
            ->filter()
            ->map(fn (string $word) => Str::substr($word, 0, 1))
            ->take(3)
            ->implode('');

        $prefix = $prefix ?: 'SCH';
        $suffix = str_pad((string) ($id ?: (TargetSchool::max('id') + 1)), 4, '0', STR_PAD_LEFT);

        return $prefix.'-'.$suffix;
    }

    private function visitRequests(?int $universityUserId = null, ?int $requestedByUserId = null): array
    {
        return VisitRequest::query()
            ->with([
                'school:id,name,city,region,country',
                'event:id,university_user_id,title,starts_at,ends_at,venue,location,latitude,longitude,capacity,status',
                'event.university:id,name',
            ])
            ->when($universityUserId, fn ($query) => $query->where(function ($scope) use ($universityUserId): void {
                $scope->whereHas('event', fn ($event) => $event->where('university_user_id', $universityUserId))
                    ->orWhere('requested_by_user_id', $universityUserId);
            }))
            ->when($requestedByUserId, fn ($query) => $query->where('requested_by_user_id', $requestedByUserId))
            ->orderByDesc('priority')
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (VisitRequest $request) => [
                'id' => $request->id,
                'schoolId' => $request->target_school_id,
                'school' => $request->school?->name,
                'university' => $request->event?->university?->name,
                'eventId' => $request->campus_event_id,
                'event' => $request->event?->title,
                'eventDate' => $request->event?->starts_at?->toIso8601String(),
                'eventLocation' => $request->event?->location,
                'venue' => $request->event?->venue,
                'latitude' => $request->event?->latitude !== null ? (float) $request->event->latitude : null,
                'longitude' => $request->event?->longitude !== null ? (float) $request->event->longitude : null,
                'eventCapacity' => $request->event?->capacity,
                'eventStatus' => $request->event?->status,
                'location' => trim(($request->school?->city ?? '').', '.($request->school?->country ?? ''), ', '),
                'window' => $request->requested_window,
                'groupSize' => $request->group_size > 1 ? $request->group_size : max(15, $request->priority * 15),
                'region' => $request->school?->region,
                'status' => $request->status,
                'priority' => $request->priority,
                'notes' => $request->notes,
                'createdAt' => $request->created_at?->toIso8601String(),
                'updatedAt' => $request->updated_at?->toIso8601String(),
            ])
            ->toArray();
    }

    private function itineraryItems(int $userId): array
    {
        return SchoolItineraryItem::query()
            ->with([
                'event:id,university_user_id,title,starts_at,ends_at,venue,location,latitude,longitude,capacity,status',
                'event.university:id,name',
                'visitRequest:id,status,group_size',
            ])
            ->where('user_id', $userId)
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->map(fn (SchoolItineraryItem $item) => [
                'id' => $item->id,
                'eventId' => $item->campus_event_id,
                'requestId' => $item->visit_request_id,
                'position' => $item->position,
                'plannedStartAt' => $item->planned_start_at?->toIso8601String(),
                'notes' => $item->notes,
                'requestStatus' => $item->visitRequest?->status,
                'students' => $item->visitRequest?->group_size,
                'event' => $item->event?->title,
                'university' => $item->event?->university?->name,
                'startsAt' => $item->event?->starts_at?->toIso8601String(),
                'endsAt' => $item->event?->ends_at?->toIso8601String(),
                'venue' => $item->event?->venue,
                'location' => $item->event?->location,
                'latitude' => $item->event?->latitude !== null ? (float) $item->event->latitude : null,
                'longitude' => $item->event?->longitude !== null ? (float) $item->event->longitude : null,
                'capacity' => $item->event?->capacity,
                'eventStatus' => $item->event?->status,
            ])
            ->toArray();
    }

    private function ensureSchoolItineraryItems(int $userId): void
    {
        $position = (int) SchoolItineraryItem::where('user_id', $userId)->max('position');

        VisitRequest::query()
            ->where('requested_by_user_id', $userId)
            ->whereNotNull('campus_event_id')
            ->where('status', '!=', 'declined')
            ->orderBy('id')
            ->get()
            ->each(function (VisitRequest $request) use ($userId, &$position): void {
                $item = SchoolItineraryItem::firstOrCreate(
                    ['user_id' => $userId, 'campus_event_id' => $request->campus_event_id],
                    ['position' => ++$position, 'planned_start_at' => $request->event?->starts_at, 'visit_request_id' => $request->id]
                );
                if (! $item->visit_request_id) {
                    $item->update(['visit_request_id' => $request->id]);
                }
            });

        EventRegistration::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['confirmed', 'waitlisted'])
            ->orderBy('id')
            ->get()
            ->each(function (EventRegistration $registration) use ($userId, &$position): void {
                SchoolItineraryItem::firstOrCreate(
                    ['user_id' => $userId, 'campus_event_id' => $registration->campus_event_id],
                    ['position' => ++$position, 'planned_start_at' => $registration->event?->starts_at]
                );
            });
    }

    private function users(): array
    {
        return User::query()
            ->with('school:id,name,location')
            ->latest()
            ->limit(250)
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'accessStatus' => $user->access_status ?: ($user->email_verified_at ? 'active' : 'pending'),
                'school' => $user->school?->name,
                'schoolLocation' => $user->school?->location,
                'verified' => $user->email_verified_at !== null,
                'isDemo' => $user->is_demo,
                'twoFactorEnabled' => (bool) $user->two_factor_enabled,
                'securityAlerts' => (bool) $user->security_alerts,
                'recoveryEmail' => $user->recovery_email,
                'lastActive' => $user->updated_at?->toIso8601String(),
                'createdAt' => $user->created_at?->toIso8601String(),
            ])
            ->toArray();
    }

    private function messages(?User $user): array
    {
        if (! $user) {
            return [];
        }

        return PlatformNotification::query()
            ->with('user:id,name,role')
            ->when(! $user->isAdmin(), fn ($query) => $query->where('user_id', $user->id))
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn (PlatformNotification $message) => [
                'id' => $message->id,
                'recipient' => $message->user?->name,
                'role' => $message->user?->role,
                'subject' => $message->subject,
                'body' => $message->body,
                'channel' => $message->channel,
                'status' => $message->status,
                'createdAt' => $message->created_at?->toIso8601String(),
            ])
            ->toArray();
    }

    private function schoolProfile(User $user): array
    {
        $school = $user->school;

        if (! $school) {
            return [];
        }

        return [
            'name' => $school->name,
            'location' => $school->location,
            'logoUrl' => $school->logo_url,
            'coordinatorName' => $school->coordinator_name ?: $user->name,
            'coordinatorEmail' => $school->coordinator_email ?: $user->email,
            'coordinatorPhone' => $school->coordinator_phone ?: '(555) 123-4567',
            'emailNotifications' => (bool) $school->email_notifications,
            'smsAlerts' => (bool) $school->sms_alerts,
        ];
    }

    private function students(User $user): array
    {
        if (! $user->isSchool() || ! $user->school_id) {
            return [];
        }

        return User::query()
            ->where('role', 'student')
            ->where('school_id', $user->school_id)
            ->orderBy('name')
            ->limit(200)
            ->get()
            ->map(fn (User $student) => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'studentIdentifier' => $student->student_identifier ?: 'ST-'.$student->id,
                'grade' => $student->grade_level ?: '12th',
                'interest' => $student->interest_major ?: 'Undecided',
                'assignedEvents' => $student->assigned_events ?: [],
            ])
            ->toArray();
    }

    private function ensureDemoStudentsForSchool(User $user): void
    {
        if (! $user->isSchool() || ! $user->school_id) {
            return;
        }

        if (User::where('role', 'student')->where('school_id', $user->school_id)->exists()) {
            return;
        }

        $rows = [
            ['Sarah Jenkins', 'sarah.jenkins@student.scalecampuslab.test', 'ST-8492', '12th', 'Computer Science', ['MIT Tech Tour', 'Stanford Virtual']],
            ['Marcus Chen', 'marcus.chen@student.scalecampuslab.test', 'ST-8821', '11th', 'Business Admin', []],
            ['Elena Rodriguez', 'elena.rodriguez@student.scalecampuslab.test', 'ST-8752', '12th', 'Pre-Med', ['Johns Hopkins Q&A']],
            ['Ava Thompson', 'ava.thompson@student.scalecampuslab.test', 'ST-8840', '12th', 'Engineering', ['Berkeley Info Session']],
        ];

        foreach ($rows as [$name, $email, $identifier, $grade, $interest, $assignedEvents]) {
            User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make('password'),
                'role' => 'student',
                'school_id' => $user->school_id,
                'student_identifier' => $identifier,
                'grade_level' => $grade,
                'interest_major' => $interest,
                'assigned_events' => $assignedEvents,
                'email_verified_at' => now(),
                'is_demo' => true,
            ]);
        }
    }

    private function validateSchoolStudent(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:160', 'unique:users,email'.($ignoreId ? ','.$ignoreId : '')],
            'student_identifier' => ['nullable', 'string', 'max:40'],
            'grade_level' => ['required', 'string', 'max:40'],
            'interest_major' => ['required', 'string', 'max:120'],
        ]);
    }

    private function authorizeSchoolStudent(Request $request, User $student): void
    {
        abort_unless($request->user()?->isSchool(), 403);
        abort_unless($student->role === 'student', 404);
        abort_unless($student->school_id === $request->user()->school_id, 403);
    }

    private function nextStudentIdentifier(): string
    {
        return 'ST-'.str_pad((string) random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
    }

    private function archives(): array
    {
        return VisitArchive::query()
            ->with('school:id,name,city,country,region')
            ->orderByDesc('visited_on')
            ->limit(20)
            ->get()
            ->map(fn (VisitArchive $archive) => [
                'id' => $archive->id,
                'schoolId' => $archive->target_school_id,
                'school' => $archive->school?->name,
                'location' => trim(($archive->school?->city ?? '').', '.($archive->school?->country ?? ''), ', '),
                'visitedOn' => $archive->visited_on?->toDateString(),
                'type' => $archive->visit_type,
                'leads' => $archive->leads_captured,
                'engagement' => (float) $archive->engagement_rate,
                'quality' => (float) $archive->quality_score,
                'status' => $archive->status,
                'summary' => $archive->summary,
            ])
            ->toArray();
    }

    private function tasks(): array
    {
        return VisitTask::query()
            ->with('archive.school:id,name,city,country')
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (VisitTask $task) => [
                'id' => $task->id,
                'archiveId' => $task->visit_archive_id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'aiSuggested' => $task->ai_suggested,
                'school' => $task->archive?->school?->name,
            ])
            ->toArray();
    }

    private function analytics(string $role = 'admin', ?User $user = null): array
    {
        if ($role === 'university' && $user) {
            return $this->universityAnalytics($user);
        }

        if (in_array($role, ['school', 'high_school'], true) && $user) {
            return $this->schoolAnalytics($user);
        }

        if ($role === 'student' && $user) {
            return $this->studentAnalytics($user);
        }

        return $this->adminAnalytics();
    }

    private function universityAnalytics(User $user): array
    {
        $events = CampusEvent::query()->where('university_user_id', $user->id);
        $eventIds = (clone $events)->pluck('id');
        $registrations = EventRegistration::query()->whereIn('campus_event_id', $eventIds);
        $confirmedSeats = (int) (clone $registrations)->where('status', 'confirmed')->sum('party_size');
        $attendedSeats = (int) (clone $registrations)->whereNotNull('attended_at')->sum('party_size');
        $waitlistedSeats = (int) (clone $registrations)->where('status', 'waitlisted')->sum('party_size');
        $capacity = max(1, (int) (clone $events)->where('status', 'published')->sum('capacity'));
        $applications = Application::query()->where('university_id', $user->id)->count();
        $conversionRate = $confirmedSeats > 0 ? round(($applications / $confirmedSeats) * 100, 1) : 0;
        $attendanceRate = $confirmedSeats > 0 ? round(($attendedSeats / $confirmedSeats) * 100, 1) : 0;
        $avgQuality = round((float) VisitArchive::avg('quality_score'), 1);
        $topProgram = (clone $events)
            ->withSum(['registrations as confirmed_seats' => fn ($query) => $query->where('status', 'confirmed')], 'party_size')
            ->orderByDesc('confirmed_seats')
            ->first();

        return [
            'role' => 'university',
            'title' => 'Recruitment Intelligence',
            'subtitle' => 'Live recruitment analytics built from your visit programs, attendee records, applications, and school engagement.',
            'cycle' => now()->format('M Y').' cycle',
            'totalVisits' => (clone $events)->count(),
            'leadsCaptured' => VisitArchive::sum('leads_captured'),
            'averageQuality' => $avgQuality,
            'engagementAverage' => $attendanceRate,
            'modelConfidence' => $this->confidenceScore((clone $events)->count(), (clone $registrations)->count(), Application::query()->where('university_id', $user->id)->count()),
            'activeVariables' => 9 + (clone $events)->count() + min(40, (clone $registrations)->count()),
            'kpis' => [
                ['label' => 'Total visits', 'value' => number_format((clone $events)->count()), 'trend' => $this->trendLabel((clone $events)->where('created_at', '>=', now()->subDays(30))->count(), (clone $events)->whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])->count())],
                ['label' => 'Booked students', 'value' => number_format($confirmedSeats), 'trend' => $confirmedSeats.' confirmed seats'],
                ['label' => 'Application conv.', 'value' => $conversionRate.'%', 'trend' => $applications.' applications'],
                ['label' => 'Capacity usage', 'value' => round(($confirmedSeats / $capacity) * 100, 1).'%', 'trend' => $waitlistedSeats.' waitlisted seats'],
            ],
            'funnel' => [
                ['label' => 'Registered', 'value' => $confirmedSeats + $waitlistedSeats, 'rate' => 100],
                ['label' => 'Confirmed', 'value' => $confirmedSeats, 'rate' => $this->percentage($confirmedSeats, $confirmedSeats + $waitlistedSeats)],
                ['label' => 'Attended', 'value' => $attendedSeats, 'rate' => $this->percentage($attendedSeats, $confirmedSeats)],
                ['label' => 'Applications', 'value' => $applications, 'rate' => $this->percentage($applications, $confirmedSeats)],
            ],
            'trend' => $this->registrationTrend($registrations, 'party_size'),
            'hotspots' => $this->universityHotspots(),
            'opportunities' => TargetSchool::query()
                ->orderByDesc('match_score')
                ->limit(5)
                ->get()
                ->map(fn (TargetSchool $school) => [
                    'name' => $school->name,
                    'meta' => trim($school->city.', '.$school->country, ', '),
                    'score' => $school->match_score,
                    'detail' => $school->active_applicants.' active applicants',
                ])->toArray(),
            'insights' => [
                ['title' => 'High conversion program', 'body' => $topProgram ? "{$topProgram->title} is your strongest demand signal with ".(int) ($topProgram->confirmed_seats ?? 0).' confirmed seats.' : 'Create a published visit program to begin conversion ranking.', 'tone' => 'success'],
                ['title' => 'Capacity pressure', 'body' => $waitlistedSeats > 0 ? "{$waitlistedSeats} seats are waitlisted. Add capacity or open another session before demand cools." : 'No waitlist pressure is currently detected across your published programs.', 'tone' => $waitlistedSeats > 0 ? 'warning' : 'neutral'],
                ['title' => 'Attendance quality', 'body' => "Attendance is {$attendanceRate}% and archived visit quality averages {$avgQuality}/5.", 'tone' => 'info'],
            ],
        ];
    }

    private function schoolAnalytics(User $user): array
    {
        $registrations = EventRegistration::query()->where('user_id', $user->id);
        $confirmedSeats = (int) (clone $registrations)->where('status', 'confirmed')->sum('party_size');
        $attendedSeats = (int) (clone $registrations)->whereNotNull('attended_at')->sum('party_size');
        $waitlistedSeats = (int) (clone $registrations)->where('status', 'waitlisted')->sum('party_size');
        $requests = VisitRequest::query()->where('requested_by_user_id', $user->id);
        $studentCount = User::query()->where('role', 'student')->where('school_id', $user->school_id)->count();
        $attendanceRate = $confirmedSeats > 0 ? round(($attendedSeats / $confirmedSeats) * 100, 1) : 0;

        return [
            'role' => 'school',
            'title' => 'Activity Intelligence',
            'subtitle' => 'Participation analytics for your student cohorts, visit requests, attendance, and university demand.',
            'cycle' => now()->format('M Y').' school cycle',
            'totalVisits' => (clone $registrations)->distinct('campus_event_id')->count('campus_event_id'),
            'leadsCaptured' => $studentCount,
            'averageQuality' => $attendanceRate,
            'engagementAverage' => $attendanceRate,
            'modelConfidence' => $this->confidenceScore($studentCount, (clone $registrations)->count(), (clone $requests)->count()),
            'activeVariables' => 6 + min(40, $studentCount + (clone $registrations)->count()),
            'kpis' => [
                ['label' => 'Visit requests', 'value' => number_format((clone $requests)->count()), 'trend' => (clone $requests)->where('status', 'approved')->count().' approved'],
                ['label' => 'Students booked', 'value' => number_format($confirmedSeats), 'trend' => $waitlistedSeats.' waitlisted seats'],
                ['label' => 'Attendance rate', 'value' => $attendanceRate.'%', 'trend' => $attendedSeats.' attended seats'],
                ['label' => 'Student roster', 'value' => number_format($studentCount), 'trend' => 'Managed students'],
            ],
            'funnel' => [
                ['label' => 'Roster', 'value' => $studentCount, 'rate' => 100],
                ['label' => 'Booked', 'value' => $confirmedSeats + $waitlistedSeats, 'rate' => $this->percentage($confirmedSeats + $waitlistedSeats, max(1, $studentCount))],
                ['label' => 'Confirmed', 'value' => $confirmedSeats, 'rate' => $this->percentage($confirmedSeats, $confirmedSeats + $waitlistedSeats)],
                ['label' => 'Attended', 'value' => $attendedSeats, 'rate' => $this->percentage($attendedSeats, $confirmedSeats)],
            ],
            'trend' => $this->registrationTrend($registrations, 'party_size'),
            'hotspots' => $this->schoolProgramHotspots($user),
            'opportunities' => CampusEvent::query()
                ->where('status', 'published')
                ->where('starts_at', '>=', now())
                ->orderBy('starts_at')
                ->limit(5)
                ->get()
                ->map(fn (CampusEvent $event) => [
                    'name' => $event->title,
                    'meta' => $event->location ?: $event->venue,
                    'score' => min(98, max(55, 100 - $event->remainingSeats())),
                    'detail' => $event->remainingSeats().' seats open',
                ])->toArray(),
            'insights' => [
                ['title' => 'Booking coverage', 'body' => $studentCount > 0 ? $this->percentage($confirmedSeats + $waitlistedSeats, $studentCount).'% of managed students have visit seats in the system.' : 'Add students to your roster to activate participation analytics.', 'tone' => 'info'],
                ['title' => 'Waitlist exposure', 'body' => $waitlistedSeats > 0 ? "{$waitlistedSeats} seats are waitlisted. Prioritize events with open capacity." : 'No waitlisted school seats are currently detected.', 'tone' => $waitlistedSeats > 0 ? 'warning' : 'success'],
                ['title' => 'Attendance signal', 'body' => "Current attendance rate is {$attendanceRate}% across confirmed school bookings.", 'tone' => 'neutral'],
            ],
        ];
    }

    private function studentAnalytics(User $user): array
    {
        $registrations = EventRegistration::query()->where('user_id', $user->id);
        $confirmed = (clone $registrations)->where('status', 'confirmed')->count();
        $waitlisted = (clone $registrations)->where('status', 'waitlisted')->count();
        $attended = (clone $registrations)->whereNotNull('attended_at')->count();
        $messages = PlatformNotification::query()->where('user_id', $user->id)->count();

        return [
            'role' => 'student',
            'title' => 'Visit Readiness',
            'subtitle' => 'Personal analytics for your visit registrations, waitlist status, attendance, and campus updates.',
            'cycle' => now()->format('M Y').' student cycle',
            'totalVisits' => (clone $registrations)->count(),
            'leadsCaptured' => $messages,
            'averageQuality' => $confirmed > 0 ? round(($attended / max(1, $confirmed)) * 100, 1) : 0,
            'engagementAverage' => $confirmed > 0 ? round(($attended / max(1, $confirmed)) * 100, 1) : 0,
            'modelConfidence' => $this->confidenceScore($confirmed, $waitlisted, $messages),
            'activeVariables' => 5 + min(20, (clone $registrations)->count() + $messages),
            'kpis' => [
                ['label' => 'Registered visits', 'value' => number_format((clone $registrations)->count()), 'trend' => $confirmed.' confirmed'],
                ['label' => 'Waitlisted', 'value' => number_format($waitlisted), 'trend' => 'Capacity dependent'],
                ['label' => 'Attended', 'value' => number_format($attended), 'trend' => 'Completed visits'],
                ['label' => 'Messages', 'value' => number_format($messages), 'trend' => 'Updates received'],
            ],
            'funnel' => [
                ['label' => 'Registered', 'value' => (clone $registrations)->count(), 'rate' => 100],
                ['label' => 'Confirmed', 'value' => $confirmed, 'rate' => $this->percentage($confirmed, (clone $registrations)->count())],
                ['label' => 'Attended', 'value' => $attended, 'rate' => $this->percentage($attended, $confirmed)],
                ['label' => 'Updates', 'value' => $messages, 'rate' => min(100, $messages * 20)],
            ],
            'trend' => $this->registrationTrend($registrations, null),
            'hotspots' => [],
            'opportunities' => CampusEvent::query()
                ->where('status', 'published')
                ->where('starts_at', '>=', now())
                ->orderBy('starts_at')
                ->limit(5)
                ->get()
                ->map(fn (CampusEvent $event) => [
                    'name' => $event->title,
                    'meta' => ($event->starts_at?->format('M d, Y') ?: 'Date TBA').' - '.($event->location ?: $event->venue),
                    'score' => min(95, max(50, $event->remainingSeats())),
                    'detail' => $event->remainingSeats().' seats open',
                ])->toArray(),
            'insights' => [
                ['title' => 'Visit status', 'body' => $confirmed > 0 ? "You have {$confirmed} confirmed visit registration(s)." : 'Register for a published visit to activate your readiness timeline.', 'tone' => $confirmed > 0 ? 'success' : 'neutral'],
                ['title' => 'Waitlist watch', 'body' => $waitlisted > 0 ? "{$waitlisted} visit registration(s) are still waitlisted." : 'No current waitlist risk is detected.', 'tone' => $waitlisted > 0 ? 'warning' : 'success'],
                ['title' => 'Communication flow', 'body' => "You have {$messages} campus visit update(s) in the system.", 'tone' => 'info'],
            ],
        ];
    }

    private function adminAnalytics(): array
    {
        $events = CampusEvent::query();
        $registrations = EventRegistration::query();
        $confirmedSeats = (int) (clone $registrations)->where('status', 'confirmed')->sum('party_size');
        $attendedSeats = (int) (clone $registrations)->whereNotNull('attended_at')->sum('party_size');
        $applications = Application::count();
        $archiveCount = max(1, VisitArchive::count());
        $totalCapacity = (int) (clone $events)->sum('capacity');
        $totalRegisteredSeats = (int) (clone $registrations)->sum('party_size');
        $publishedEvents = (clone $events)->where('status', 'published')->count();
        $cancelledEvents = (clone $events)->where('status', 'cancelled')->count();

        return [
            'role' => 'admin',
            'title' => 'Platform Intelligence',
            'subtitle' => 'Global analytics across institutions, schools, visit activity, registrations, and system engagement.',
            'cycle' => now()->format('M Y').' platform cycle',
            'totalVisits' => (clone $events)->count() + VisitArchive::count(),
            'leadsCaptured' => VisitArchive::sum('leads_captured'),
            'averageQuality' => round((float) VisitArchive::avg('quality_score'), 1),
            'engagementAverage' => round((float) VisitArchive::sum('engagement_rate') / $archiveCount, 1),
            'modelConfidence' => $this->confidenceScore((clone $events)->count(), (clone $registrations)->count(), User::count()),
            'activeVariables' => 12 + min(80, User::count() + (clone $events)->count()),
            'kpis' => [
                ['label' => 'Total visits', 'value' => number_format((clone $events)->count() + VisitArchive::count()), 'trend' => (clone $events)->where('status', 'published')->count().' published'],
                ['label' => 'Booked students', 'value' => number_format($confirmedSeats), 'trend' => (clone $registrations)->where('status', 'waitlisted')->sum('party_size').' waitlisted'],
                ['label' => 'Application conv.', 'value' => $this->percentage($applications, $confirmedSeats).'%', 'trend' => $applications.' applications'],
                ['label' => 'Attendance rate', 'value' => $this->percentage($attendedSeats, $confirmedSeats).'%', 'trend' => $attendedSeats.' attended seats'],
            ],
            'adminKpis' => [
                ['label' => 'Conversion Funnel', 'value' => $this->percentage($applications, $totalRegisteredSeats).'%', 'detail' => $applications.' applications from '.number_format($totalRegisteredSeats).' registered seats'],
                ['label' => 'Capacity Usage', 'value' => $this->percentage($totalRegisteredSeats, $totalCapacity).'%', 'detail' => number_format($totalRegisteredSeats).' / '.number_format($totalCapacity).' seats'],
                ['label' => 'Published Programs', 'value' => number_format($publishedEvents), 'detail' => $cancelledEvents.' cancelled programs'],
                ['label' => 'Platform Users', 'value' => number_format(User::count()), 'detail' => User::where('access_status', 'suspended')->count().' suspended'],
            ],
            'funnel' => [
                ['label' => 'Registered', 'value' => (int) (clone $registrations)->sum('party_size'), 'rate' => 100],
                ['label' => 'Confirmed', 'value' => $confirmedSeats, 'rate' => $this->percentage($confirmedSeats, (int) (clone $registrations)->sum('party_size'))],
                ['label' => 'Attended', 'value' => $attendedSeats, 'rate' => $this->percentage($attendedSeats, $confirmedSeats)],
                ['label' => 'Applications', 'value' => $applications, 'rate' => $this->percentage($applications, $confirmedSeats)],
            ],
            'trend' => $this->registrationTrend($registrations, 'party_size'),
            'roleBreakdown' => User::query()
                ->select('role', DB::raw('count(*) as total'))
                ->groupBy('role')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row) => ['label' => ucfirst(str_replace('_', ' ', $row->role)), 'value' => (int) $row->total])
                ->toArray(),
            'statusBreakdown' => CampusEvent::query()
                ->select('status', DB::raw('count(*) as total'), DB::raw('sum(capacity) as capacity'))
                ->groupBy('status')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row) => ['label' => ucfirst($row->status), 'value' => (int) $row->total, 'detail' => number_format((int) $row->capacity).' seats'])
                ->toArray(),
            'requestPipeline' => VisitRequest::query()
                ->select('status', DB::raw('count(*) as total'), DB::raw('sum(group_size) as seats'))
                ->groupBy('status')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row) => ['label' => ucfirst(str_replace('_', ' ', $row->status)), 'value' => (int) $row->total, 'detail' => number_format((int) $row->seats).' requested seats'])
                ->toArray(),
            'topInstitutions' => User::query()
                ->where('role', 'university')
                ->withCount('campusEvents')
                ->orderByDesc('campus_events_count')
                ->limit(6)
                ->get()
                ->map(function (User $university) {
                    $registrations = EventRegistration::query()
                        ->whereHas('event', fn ($query) => $query->where('university_user_id', $university->id));

                    return [
                        'name' => $university->name,
                        'email' => $university->email,
                        'programs' => $university->campus_events_count,
                        'registrations' => (int) (clone $registrations)->count(),
                        'seats' => (int) (clone $registrations)->sum('party_size'),
                    ];
                })
                ->toArray(),
            'notificationStats' => PlatformNotification::query()
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row) => ['label' => ucfirst($row->status), 'value' => (int) $row->total])
                ->toArray(),
            'hotspots' => $this->universityHotspots(),
            'opportunities' => TargetSchool::query()
                ->orderByDesc('match_score')
                ->limit(5)
                ->get()
                ->map(fn (TargetSchool $school) => [
                    'name' => $school->name,
                    'meta' => trim($school->city.', '.$school->country, ', '),
                    'score' => $school->match_score,
                    'detail' => $school->active_applicants.' active applicants',
                ])->toArray(),
            'insights' => [
                ['title' => 'Platform demand', 'body' => number_format($confirmedSeats).' confirmed seats are currently active across the platform.', 'tone' => 'success'],
                ['title' => 'School pipeline', 'body' => VisitRequest::count().' visit request(s) are tracked in the current request pipeline.', 'tone' => 'info'],
                ['title' => 'Quality baseline', 'body' => 'Archived visit quality averages '.round((float) VisitArchive::avg('quality_score'), 1).'/5.', 'tone' => 'neutral'],
            ],
        ];
    }

    private function registrationTrend($registrations, ?string $sumColumn): array
    {
        return collect(range(5, 0))->map(function (int $monthsAgo) use ($registrations, $sumColumn): array {
            $start = now()->startOfMonth()->subMonths($monthsAgo);
            $end = $start->copy()->endOfMonth();
            $query = (clone $registrations)->whereBetween('created_at', [$start, $end]);

            return [
                'label' => $start->format('M'),
                'value' => $sumColumn ? (int) $query->sum($sumColumn) : (int) $query->count(),
            ];
        })->values()->all();
    }

    private function universityHotspots(): array
    {
        return TargetSchool::query()
            ->select('region', DB::raw('count(*) as total'), DB::raw('avg(match_score) as score'))
            ->whereNotNull('region')
            ->groupBy('region')
            ->orderByDesc('score')
            ->limit(4)
            ->get()
            ->map(fn ($row) => [
                'region' => $row->region,
                'growth' => round((float) $row->score / 4, 1),
                'total' => (int) $row->total,
            ])
            ->toArray();
    }

    private function schoolProgramHotspots(User $user): array
    {
        return EventRegistration::query()
            ->select('status', DB::raw('count(*) as total'), DB::raw('sum(party_size) as seats'))
            ->where('user_id', $user->id)
            ->groupBy('status')
            ->orderByDesc('seats')
            ->get()
            ->map(fn ($row) => [
                'region' => ucfirst($row->status),
                'growth' => (int) $row->seats,
                'total' => (int) $row->total,
            ])
            ->toArray();
    }

    private function confidenceScore(int ...$signals): float
    {
        $score = 62 + min(35, array_sum($signals));

        return round(min(97, max(62, $score)), 1);
    }

    private function percentage(int|float $value, int|float $total): float
    {
        return $total > 0 ? round(($value / $total) * 100, 1) : 0;
    }

    private function trendLabel(int $current, int $previous): string
    {
        if ($previous <= 0) {
            return $current > 0 ? '+'.$current.' this cycle' : 'No prior cycle';
        }

        $change = round((($current - $previous) / $previous) * 100, 1);

        return ($change >= 0 ? '+' : '').$change.'% vs previous';
    }
}
