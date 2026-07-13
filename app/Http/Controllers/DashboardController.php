<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Api\V1\ParticipationController;
use App\Models\AdmissionApplication;
use App\Models\Announcement;
use App\Models\Application;
use App\Models\ApplicationPayment;
use App\Models\CampusEvent;
use App\Models\ComplianceRequest;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\EmailTemplate;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\Faq;
use App\Models\InstitutionProgram;
use App\Models\Message;
use App\Models\PartnerSchoolTask;
use App\Models\PlatformNotification;
use App\Models\PlatformSetting;
use App\Models\ProjectMilestone;
use App\Models\RecruitmentInsight;
use App\Models\School;
use App\Models\SchoolItineraryItem;
use App\Models\StudentAcademicRecord;
use App\Models\StudentDocument;
use App\Models\SystemLog;
use App\Models\TargetSchool;
use App\Models\UniversitySetting;
use App\Models\UniversityTeamMember;
use App\Models\User;
use App\Models\VisitArchive;
use App\Models\VisitRequest;
use App\Models\VisitTask;
use App\Services\AccountSessionRevoker;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    public function __construct(private readonly AccountSessionRevoker $sessionRevoker) {}

    public function admin(): View
    {
        $user = auth()->user();

        return view('app', [
            'page' => 'dashboard',
            'props' => [
                'role' => 'admin',
                'title' => 'Admin Control Center',
                'subtitle' => 'Manage users, monitor platform activity, and prepare reports.',
                'metrics' => [
                    ['label' => 'Total users', 'value' => User::count()],
                    ['label' => 'Universities', 'value' => User::where('role', 'university')->count()],
                    ['label' => 'Applications', 'value' => AdmissionApplication::whereNotNull('submitted_at')->count()],
                    ['label' => 'Revenue', 'value' => 'NGN '.number_format((float) ApplicationPayment::where('status', 'paid')->sum('amount'), 2)],
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
                'schoolAccounts' => $this->schoolAccounts(false),
                'visitRequests' => $this->visitRequests(),
                'archives' => $this->archives(),
                'tasks' => $this->tasks(),
                'analytics' => $this->analytics('admin', auth()->user()),
                'messages' => $this->messages(auth()->user()),
                'securityProfile' => $this->securityProfile(auth()->user()),
                'systemHealth' => $this->systemHealth(),
                'platformSettings' => $this->platformSettings(),
                'programs' => $this->admissionPrograms($user),
                'admissionApplications' => $this->admissionApplications($user),
                'studentPortfolio' => [],
                'notifications' => $this->notificationFeed($user),
                'contentManagement' => $this->contentManagement($user),
            ],
        ]);
    }

    public function university(): View
    {
        $user = auth()->user();

        return $this->dashboard('university', 'University Dashboard', 'Create campus visit events, manage capacity, and track registrations.', [
            ['label' => 'Published events', 'value' => CampusEvent::where('university_user_id', $user->id)->where('status', 'published')->count()],
            ['label' => 'Applications', 'value' => AdmissionApplication::whereNotNull('submitted_at')->whereHas('program', fn ($query) => $query->where('university_user_id', $user->id))->count()],
            ['label' => 'Attendance rate', 'value' => $this->attendanceRateForUniversity($user->id).'%'],
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
            'universitySettings' => $this->universitySettings($user),
            'universityCompliance' => $this->universityCompliance($user),
            'programs' => $this->admissionPrograms($user),
            'admissionApplications' => $this->admissionApplications($user),
            'studentPortfolio' => [],
            'notifications' => $this->notificationFeed($user),
            'contentManagement' => $this->contentManagement($user),
            'schoolAccounts' => $this->schoolAccounts(),
        ]);
    }

    public function populateUniversityDemoData(Request $request): RedirectResponse
    {
        abort_unless(app()->environment(['local', 'testing']), 404);
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
                    $schoolName = ['Lincoln High School', 'Westview Preparatory', 'St. Jude Academy', 'Greenfield College', 'Oakridge School'][$groupIndex];
                    $registration = EventRegistration::create([
                        'campus_event_id' => $event->id,
                        'registrant_name' => $schoolName,
                        'registrant_email' => 'demo-'.$event->id.'-'.$groupIndex.'@school.scalecampuslab.test',
                        'registrant_type' => 'school_group',
                        'party_size' => $partySize + ($programIndex * 2),
                        'status' => $groupIndex === 4 && $programIndex % 2 ? 'waitlisted' : 'confirmed',
                        'consent_status' => $groupIndex === 1 ? 'pending' : 'received',
                        'is_minor' => true,
                        'guardian_name' => ['Amina Roberts', 'David Chen', 'Maria Okafor', 'Grace Miller', 'Thomas Blake'][$groupIndex],
                        'guardian_email' => 'guardian-'.$event->id.'-'.$groupIndex.'@school.scalecampuslab.test',
                        'guardian_phone' => '+1 555 010 '.str_pad((string) ($groupIndex + 1), 2, '0', STR_PAD_LEFT),
                        'emergency_contact_name' => ['Amina Roberts', 'David Chen', 'Maria Okafor', 'Grace Miller', 'Thomas Blake'][$groupIndex],
                        'emergency_contact_phone' => '+1 555 019 '.str_pad((string) ($groupIndex + 1), 2, '0', STR_PAD_LEFT),
                        'medical_notes' => $groupIndex === 2 ? 'One attendee requires nut-free meal handling.' : null,
                        'attended_at' => $programIndex === 0 && $groupIndex < 3 ? now()->subDays(2) : null,
                        'checked_in_at' => $programIndex === 0 && $groupIndex < 3 ? now()->subDays(2)->setTime(9, 45) : null,
                        'checked_out_at' => $programIndex === 0 && $groupIndex < 2 ? now()->subDays(2)->setTime(13, 10) : null,
                        'is_demo' => true,
                    ]);
                    $registration->forceFill([
                        'created_at' => now()->subWeeks(7 - $programIndex)->addDays($groupIndex),
                        'updated_at' => now(),
                    ])->saveQuietly();

                    foreach (range(1, min(8, (int) $registration->party_size)) as $studentIndex) {
                        $studentName = ['Sarah Jenkins', 'Marcus Chen', 'Elena Rodriguez', 'Aisha Johnson', 'Noah Williams', 'Priya Patel', 'Daniel Brooks', 'Fatima Bello'][$studentIndex - 1];
                        $registration->students()->create([
                            'name' => $studentName,
                            'email' => Str::slug($studentName).'.'.$event->id.'.'.$groupIndex.'@student.scalecampuslab.test',
                            'student_identifier' => 'SC-'.$event->id.$groupIndex.str_pad((string) $studentIndex, 2, '0', STR_PAD_LEFT),
                            'grade_level' => $studentIndex % 3 === 0 ? '11th' : '12th',
                            'interest_major' => ['Computer Science', 'Business Admin', 'Pre-Med / Biology', 'Engineering', 'Design / Creative Arts'][$studentIndex % 5],
                            'status' => $registration->status,
                            'consent_status' => $studentIndex === 2 ? 'pending' : 'received',
                            'is_minor' => true,
                            'guardian_name' => ['Amina Roberts', 'David Chen', 'Maria Okafor', 'Grace Miller', 'Thomas Blake'][$groupIndex],
                            'guardian_email' => 'guardian-'.$event->id.'-'.$groupIndex.'-'.$studentIndex.'@school.scalecampuslab.test',
                            'guardian_phone' => '+1 555 020 '.str_pad((string) $studentIndex, 2, '0', STR_PAD_LEFT),
                            'emergency_contact_name' => ['Amina Roberts', 'David Chen', 'Maria Okafor', 'Grace Miller', 'Thomas Blake'][$groupIndex],
                            'emergency_contact_phone' => '+1 555 029 '.str_pad((string) $studentIndex, 2, '0', STR_PAD_LEFT),
                            'medical_notes' => $studentIndex === 3 ? 'Nut-free meal required.' : null,
                            'checked_in_at' => $registration->checked_in_at,
                            'checked_out_at' => $studentIndex < 3 ? $registration->checked_out_at : null,
                        ]);
                    }
                }
            }
        });

        return back()->with('status', 'University demo data populated from database records.');
    }

    public function clearUniversityDemoData(Request $request): RedirectResponse
    {
        abort_unless(app()->environment(['local', 'testing']), 404);
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

        $university = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password'] ?? Str::password(16)),
            'role' => 'university',
            'access_status' => 'active',
            'email_verified_at' => $request->boolean('verified') ? now() : null,
        ]);

        if (! $university->hasVerifiedEmail()) {
            $university->sendEmailVerificationNotification();
        }
        if (empty($validated['password'])) {
            PasswordBroker::sendResetLink(['email' => $university->email]);
        }

        return back()->with('status', empty($validated['password']) ? 'Institution invited. A secure password setup link was sent.' : 'Institution account created.');
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

        $emailChanged = strcasecmp($university->email, $validated['email']) !== 0;
        $university->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'email_verified_at' => ! $emailChanged && $request->boolean('verified') ? ($university->email_verified_at ?: now()) : null,
        ]);

        if (! empty($validated['password'])) {
            $university->password = Hash::make($validated['password']);
            $university->remember_token = Str::random(60);
        }

        $university->save();

        if (! empty($validated['password'])) {
            $this->sessionRevoker->revokeAll($university);
        }
        if (! $university->hasVerifiedEmail()) {
            $university->sendEmailVerificationNotification();
        }

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

        if (! $validated['verified']) {
            $this->sessionRevoker->revokeAll($university);
        }

        return back()->with('status', $validated['verified'] ? 'Institution verified.' : 'Institution moved to pending verification.');
    }

    public function destroyAdminUniversity(Request $request, User $university): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);
        abort_unless($university->role === 'university', 404);

        if (
            $university->campusEvents()->exists()
            || $university->targetSchools()->withoutGlobalScope('universityTenant')->exists()
            || InstitutionProgram::where('university_user_id', $university->id)->exists()
            || AdmissionApplication::where('reviewed_by_user_id', $university->id)->exists()
            || Application::where('university_id', $university->id)->exists()
            || Conversation::where('created_by_user_id', $university->id)->exists()
            || ConversationMessage::where('sender_user_id', $university->id)->exists()
        ) {
            return back()->withErrors(['university' => 'This institution has platform history. Suspend it to preserve programs, applications, conversations, and partner-school records.']);
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

    public function storeAdminSchoolAccount(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        $school = DB::transaction(function () use ($request): School {
            $school = School::create($this->validateAdminSchoolAccount($request));
            SystemLog::create([
                'user_id' => $request->user()->id,
                'action' => 'school_account.created',
                'subject_type' => School::class,
                'subject_id' => $school->id,
                'metadata' => ['name' => $school->name],
            ]);

            return $school;
        });

        return back()->with('status', $school->name.' was added to registered school accounts.');
    }

    public function updateAdminSchoolAccount(Request $request, School $schoolAccount): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        DB::transaction(function () use ($request, $schoolAccount): void {
            $schoolAccount->update($this->validateAdminSchoolAccount($request, $schoolAccount));
            SystemLog::create([
                'user_id' => $request->user()->id,
                'action' => 'school_account.updated',
                'subject_type' => School::class,
                'subject_id' => $schoolAccount->id,
                'metadata' => ['name' => $schoolAccount->name],
            ]);
        });

        return back()->with('status', 'Registered school account updated.');
    }

    public function destroyAdminSchoolAccount(Request $request, School $schoolAccount): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        if (
            $schoolAccount->users()->exists()
            || $schoolAccount->institutionPrograms()->exists()
            || $schoolAccount->visitRequests()->exists()
            || $schoolAccount->registrations()->exists()
        ) {
            return back()->withErrors([
                'schoolAccount' => 'This school has users or platform history. Suspend its coordinator accounts instead of deleting it.',
            ]);
        }

        DB::transaction(function () use ($request, $schoolAccount): void {
            SystemLog::create([
                'user_id' => $request->user()->id,
                'action' => 'school_account.deleted',
                'subject_type' => School::class,
                'subject_id' => $schoolAccount->id,
                'metadata' => ['name' => $schoolAccount->name],
            ]);
            $schoolAccount->delete();
        });

        return back()->with('status', 'Registered school account deleted.');
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

        if (! filter_var($school->coordinator_email, FILTER_VALIDATE_EMAIL)) {
            return back()->withErrors([
                'school' => 'Add a valid coordinator email before sending outreach to this school.',
            ]);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        PlatformNotification::create([
            'notification_type' => 'partner_school.outreach',
            'target_type' => 'outbound_contact',
            'target_id' => $request->user()->id,
            'channel' => 'email',
            'subject' => $validated['subject'],
            'body' => $validated['message'],
            'status' => 'queued',
            'scheduled_for' => now(),
            'metadata' => [
                'registrant_email' => $school->coordinator_email,
                'registrant_name' => $school->coordinator_name ?: $school->name,
                'sender_user_id' => $request->user()->id,
                'target_school_id' => $school->id,
            ],
        ]);

        PartnerSchoolTask::create([
            'target_school_id' => $school->id,
            'user_id' => $request->user()->id,
            'title' => 'Follow up with '.$school->name,
            'description' => 'Contact action queued: '.$validated['subject'],
            'status' => 'open',
            'ai_suggested' => false,
        ]);

        return back()->with('status', 'Email outreach queued for delivery.');
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

        return $this->dashboard('school', 'School Dashboard', 'Register groups of students and track participation across campus visits.', [
            ['label' => 'Discover Visits', 'value' => CampusEvent::where('status', 'published')->count()],
            ['label' => 'Applications', 'value' => AdmissionApplication::whereNotNull('submitted_at')->whereHas('program', fn ($query) => $query->where('school_id', $user->school_id))->count()],
            ['label' => 'Confirmed Visits', 'value' => VisitRequest::where('school_id', $user->school_id)->whereIn('status', ['approved', 'scheduled'])->count()],
            ['label' => 'My Students', 'value' => User::where('role', 'student')->where('school_id', $user->school_id)->count()],
        ], [
            'Register multiple students',
            'Manage student lists',
            'Assign students to events',
            'Track attendance per student',
        ], [
            'roadmap' => [],
            'events' => $this->events(statuses: ['published']),
            'scheduleEvents' => $this->events(eventIds: VisitRequest::query()
                ->where('school_id', $user->school_id)
                ->whereIn('status', ['approved', 'scheduled'])
                ->whereNotNull('campus_event_id')
                ->pluck('campus_event_id')
                ->all()),
            'registrations' => $this->registrationsForUser($user->id),
            'schools' => $this->schools(),
            'visitRequests' => $this->visitRequests(requestedByUserId: $user->id, schoolId: $user->school_id),
            'archives' => [],
            'tasks' => [],
            'analytics' => $this->analytics('school', $user),
            'messages' => $this->messages($user),
            'schoolProfile' => $this->schoolProfile($user),
            'students' => $this->students($user),
            'itineraryItems' => $this->itineraryItems($user->id),
            'programs' => $this->admissionPrograms($user),
            'admissionApplications' => $this->admissionApplications($user),
            'studentPortfolio' => [],
            'notifications' => $this->notificationFeed($user),
            'contentManagement' => $this->contentManagement($user),
        ]);
    }

    public function student(): View
    {
        $user = auth()->user();

        return $this->dashboard('student', 'Student Dashboard', 'Browse visit opportunities, register, and receive updates from institutions.', [
            ['label' => 'Available programs', 'value' => InstitutionProgram::where('status', 'published')->count()],
            ['label' => 'Applications', 'value' => AdmissionApplication::where('student_user_id', $user->id)->count()],
            ['label' => 'Accepted', 'value' => AdmissionApplication::where('student_user_id', $user->id)->where('status', 'accepted')->count()],
            ['label' => 'Notifications', 'value' => PlatformNotification::where('user_id', $user->id)->whereNull('read_at')->count()],
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
            'programs' => $this->admissionPrograms($user),
            'admissionApplications' => $this->admissionApplications($user),
            'studentPortfolio' => $this->studentPortfolio($user),
            'notifications' => $this->notificationFeed($user),
            'contentManagement' => $this->contentManagement($user),
        ]);
    }

    public function sendMessage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'recipient_scope' => ['required', 'in:all,universities,schools,students,admins'],
            'content' => ['required', 'string', 'max:2000'],
            'channel' => ['required', Rule::in(['email'])],
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

        if ($request->user()?->role === 'university') {
            $this->logUniversityActivity($request, 'message.queued', null, [
                'recipient_scope' => $validated['recipient_scope'],
                'channel' => $validated['channel'],
                'recipient_count' => $recipients->count(),
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
            'checked_in' => ['nullable', 'boolean'],
            'checked_out' => ['nullable', 'boolean'],
            'consent_status' => ['required', Rule::in(['not_required', 'pending', 'received', 'expired'])],
            'is_minor' => ['nullable', 'boolean'],
            'guardian_name' => ['nullable', 'string', 'max:160'],
            'guardian_email' => ['nullable', 'email:rfc', 'max:160'],
            'guardian_phone' => ['nullable', 'string', 'max:60'],
            'emergency_contact_name' => ['nullable', 'string', 'max:160'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:60'],
            'medical_notes' => ['nullable', 'string', 'max:2000'],
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
            'consent_status' => $validated['consent_status'],
            'is_minor' => $request->boolean('is_minor'),
            'guardian_name' => $validated['guardian_name'] ?: null,
            'guardian_email' => $validated['guardian_email'] ?: null,
            'guardian_phone' => $validated['guardian_phone'] ?: null,
            'emergency_contact_name' => $validated['emergency_contact_name'] ?: null,
            'emergency_contact_phone' => $validated['emergency_contact_phone'] ?: null,
            'medical_notes' => $validated['medical_notes'] ?: null,
            'attended_at' => $request->boolean('attended') ? ($registration->attended_at ?: now()) : null,
            'checked_in_at' => $request->boolean('checked_in') ? ($registration->checked_in_at ?: now()) : null,
            'checked_out_at' => $request->boolean('checked_out') ? ($registration->checked_out_at ?: now()) : null,
        ]);

        $this->logUniversityActivity($request, 'attendee.updated', $registration, [
            'program' => $event?->title,
            'status' => $validated['status'],
            'consent_status' => $validated['consent_status'],
        ]);

        $this->promoteCampusEventWaitlist($event);

        return back()->with('status', 'Attendee updated.');
    }

    public function checkInUniversityAttendee(Request $request, EventRegistration $registration): RedirectResponse
    {
        $this->authorizeUniversityRegistration($request, $registration);

        if ($registration->status !== 'confirmed') {
            return back()->withErrors(['attendee' => 'Only confirmed attendees can be checked in.']);
        }

        $registration->update([
            'checked_in_at' => $registration->checked_in_at ?: now(),
            'attended_at' => $registration->attended_at ?: now(),
        ]);
        $registration->students()->whereNull('checked_in_at')->update(['checked_in_at' => now()]);
        $this->logUniversityActivity($request, 'attendee.checked_in', $registration, ['program' => $registration->event?->title]);

        return back()->with('status', 'Attendee checked in.');
    }

    public function checkOutUniversityAttendee(Request $request, EventRegistration $registration): RedirectResponse
    {
        $this->authorizeUniversityRegistration($request, $registration);

        if (! $registration->checked_in_at) {
            return back()->withErrors(['attendee' => 'Check the attendee in before checking them out.']);
        }

        $registration->update([
            'checked_out_at' => $registration->checked_out_at ?: now(),
        ]);
        $registration->students()->whereNull('checked_out_at')->update(['checked_out_at' => now()]);
        $this->logUniversityActivity($request, 'attendee.checked_out', $registration, ['program' => $registration->event?->title]);

        return back()->with('status', 'Attendee checked out.');
    }

    public function bulkUpdateUniversityAttendees(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'registration_ids' => ['required', 'array', 'min:1'],
            'registration_ids.*' => ['integer', 'exists:event_registrations,id'],
            'action' => ['required', Rule::in(['confirm', 'waitlist', 'cancel', 'check_in', 'check_out', 'consent_received'])],
        ]);

        $registrations = EventRegistration::query()
            ->with('event:id,university_user_id,capacity')
            ->whereIn('id', array_unique($validated['registration_ids']))
            ->whereHas('event', fn ($query) => $query->where('university_user_id', $request->user()->id))
            ->get();

        if ($validated['action'] === 'confirm') {
            foreach ($registrations->groupBy('campus_event_id') as $eventRegistrations) {
                $event = $eventRegistrations->first()?->event;
                if (! $event) {
                    continue;
                }

                $confirmedSeats = (int) $event->registrations()
                    ->whereNotIn('id', $eventRegistrations->pluck('id'))
                    ->where('status', 'confirmed')
                    ->sum('party_size');
                $selectedSeats = (int) $eventRegistrations->sum('party_size');

                if (($confirmedSeats + $selectedSeats) > $event->capacity) {
                    return back()->withErrors(['attendees' => "Bulk confirmation would exceed capacity for {$event->title}."]);
                }
            }
        }

        $changed = 0;
        DB::transaction(function () use ($registrations, $validated, &$changed): void {
            foreach ($registrations as $registration) {
                $payload = match ($validated['action']) {
                    'confirm' => ['status' => 'confirmed'],
                    'waitlist' => ['status' => 'waitlisted'],
                    'cancel' => ['status' => 'cancelled'],
                    'check_in' => ['checked_in_at' => $registration->checked_in_at ?: now(), 'attended_at' => $registration->attended_at ?: now()],
                    'check_out' => $registration->checked_in_at ? ['checked_out_at' => $registration->checked_out_at ?: now()] : [],
                    'consent_received' => ['consent_status' => 'received'],
                };

                if ($payload === []) {
                    continue;
                }

                $registration->update($payload);
                if ($validated['action'] === 'check_in') {
                    $registration->students()->whereNull('checked_in_at')->update(['checked_in_at' => now()]);
                }
                if ($validated['action'] === 'check_out') {
                    $registration->students()->whereNull('checked_out_at')->update(['checked_out_at' => now()]);
                }
                if ($validated['action'] === 'consent_received') {
                    $registration->students()->update(['consent_status' => 'received']);
                }
                if (in_array($validated['action'], ['confirm', 'waitlist', 'cancel'], true)) {
                    $status = ['confirm' => 'confirmed', 'waitlist' => 'waitlisted', 'cancel' => 'cancelled'][$validated['action']];
                    $registration->students()->update(['status' => $status]);
                }
                $changed++;
            }
        });

        $registrations->pluck('event')->filter()->unique('id')->each(fn (CampusEvent $event) => $this->promoteCampusEventWaitlist($event));
        $this->logUniversityActivity($request, 'attendees.bulk_'.$validated['action'], null, [
            'changed' => $changed,
            'registration_ids' => $registrations->pluck('id')->values()->all(),
        ]);

        return back()->with('status', $changed.' attendee record(s) updated.');
    }

    public function importUniversityAttendees(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'campus_event_id' => ['required', 'integer', 'exists:campus_events,id'],
            'attendee_file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $event = CampusEvent::query()
            ->where('university_user_id', $request->user()->id)
            ->findOrFail($validated['campus_event_id']);

        $path = $request->file('attendee_file')->getRealPath();
        $handle = fopen($path, 'rb');
        if (! $handle) {
            return back()->withErrors(['attendee_file' => 'Unable to read attendee import file.']);
        }

        $header = fgetcsv($handle);
        $columns = collect($header ?: [])->map(fn ($value) => (string) Str::of((string) $value)->lower()->replace([' ', '-'], '_'))->toArray();
        $batch = 'import-'.now()->format('Ymd-His').'-'.Str::random(6);
        $created = 0;
        $updated = 0;

        DB::transaction(function () use ($handle, $columns, $event, $batch, &$created, &$updated): void {
            $confirmedSeats = (int) $event->registrations()->where('status', 'confirmed')->sum('party_size');

            while (($row = fgetcsv($handle)) !== false) {
                $data = [];
                foreach ($columns as $index => $column) {
                    $data[$column] = trim((string) ($row[$index] ?? ''));
                }

                $email = $data['email'] ?? $data['registrant_email'] ?? null;
                $name = $data['name'] ?? $data['registrant_name'] ?? null;
                if (! $email || ! $name || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    continue;
                }

                $partySize = max(1, min(5000, (int) ($data['party_size'] ?? $data['seats'] ?? 1)));
                $requestedStatus = in_array(($data['status'] ?? 'confirmed'), ['confirmed', 'waitlisted', 'cancelled'], true) ? $data['status'] : 'confirmed';
                $existing = EventRegistration::query()
                    ->where('campus_event_id', $event->id)
                    ->where('registrant_email', $email)
                    ->first();
                $existingConfirmedSeats = $existing && $existing->status === 'confirmed' ? (int) $existing->party_size : 0;
                $availableSeats = $event->capacity - ($confirmedSeats - $existingConfirmedSeats);
                $status = $requestedStatus === 'confirmed' && $partySize > $availableSeats ? 'waitlisted' : $requestedStatus;

                $registration = EventRegistration::updateOrCreate(
                    ['campus_event_id' => $event->id, 'registrant_email' => $email],
                    [
                        'registrant_name' => $name,
                        'registrant_type' => ($data['type'] ?? $data['registrant_type'] ?? 'student') === 'school_group' ? 'school_group' : 'student',
                        'party_size' => $partySize,
                        'status' => $status,
                        'consent_status' => in_array(($data['consent_status'] ?? 'not_required'), ['not_required', 'pending', 'received', 'expired'], true) ? $data['consent_status'] : 'not_required',
                        'is_minor' => filter_var($data['is_minor'] ?? false, FILTER_VALIDATE_BOOLEAN),
                        'guardian_name' => $data['guardian_name'] ?? null,
                        'guardian_email' => $data['guardian_email'] ?? null,
                        'guardian_phone' => $data['guardian_phone'] ?? null,
                        'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                        'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                        'medical_notes' => $data['medical_notes'] ?? null,
                        'imported_at' => now(),
                        'import_batch' => $batch,
                    ]
                );

                $studentName = $data['student_name'] ?? $data['attendee_name'] ?? null;
                $studentEmail = $data['student_email'] ?? $data['attendee_email'] ?? null;
                if ($studentName) {
                    $registration->students()->updateOrCreate(
                        ['email' => $studentEmail ?: $email.'.student.'.md5($studentName)],
                        [
                            'name' => $studentName,
                            'student_identifier' => $data['student_identifier'] ?? $data['student_id'] ?? null,
                            'grade_level' => $data['grade_level'] ?? $data['grade'] ?? null,
                            'interest_major' => $data['interest_major'] ?? $data['interest'] ?? null,
                            'status' => $status,
                            'consent_status' => in_array(($data['student_consent_status'] ?? $data['consent_status'] ?? 'not_required'), ['not_required', 'pending', 'received', 'expired'], true) ? ($data['student_consent_status'] ?? $data['consent_status'] ?? 'not_required') : 'not_required',
                            'is_minor' => filter_var($data['student_is_minor'] ?? $data['is_minor'] ?? true, FILTER_VALIDATE_BOOLEAN),
                            'guardian_name' => $data['guardian_name'] ?? null,
                            'guardian_email' => $data['guardian_email'] ?? null,
                            'guardian_phone' => $data['guardian_phone'] ?? null,
                            'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                            'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                            'medical_notes' => $data['student_medical_notes'] ?? $data['medical_notes'] ?? null,
                        ]
                    );
                }

                if ($status === 'confirmed') {
                    $confirmedSeats = ($confirmedSeats - $existingConfirmedSeats) + $partySize;
                } elseif ($existingConfirmedSeats > 0) {
                    $confirmedSeats -= $existingConfirmedSeats;
                }

                $registration->wasRecentlyCreated ? $created++ : $updated++;
            }
        });

        fclose($handle);
        $this->promoteCampusEventWaitlist($event);
        $this->logUniversityActivity($request, 'attendees.imported', $event, [
            'created' => $created,
            'updated' => $updated,
            'batch' => $batch,
        ]);

        return back()->with('status', "{$created} attendee(s) imported, {$updated} updated.");
    }

    public function exportUniversityAttendees(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $eventId = $request->integer('campus_event_id') ?: null;
        $this->logUniversityActivity($request, 'attendees.exported', null, ['campus_event_id' => $eventId]);
        $registrations = EventRegistration::query()
            ->with(['event:id,title,university_user_id,starts_at,venue,location', 'students'])
            ->whereHas('event', fn ($query) => $query->where('university_user_id', $request->user()->id))
            ->when($eventId, fn ($query) => $query->where('campus_event_id', $eventId))
            ->orderBy('campus_event_id')
            ->orderBy('registrant_name');

        return response()->streamDownload(function () use ($registrations): void {
            $handle = fopen('php://output', 'wb');
            fputcsv($handle, ['Program', 'Date', 'School / Group', 'Group Email', 'Record Type', 'Student Name', 'Student Email', 'Student ID', 'Grade', 'Interest', 'Seats', 'Status', 'Consent', 'Minor', 'Guardian', 'Guardian Email', 'Guardian Phone', 'Emergency Contact', 'Emergency Phone', 'Checked In', 'Checked Out', 'Promoted From Waitlist', 'Medical Notes']);
            $registrations->chunk(200, function ($chunk) use ($handle): void {
                foreach ($chunk as $registration) {
                    if ($registration->students->isNotEmpty()) {
                        foreach ($registration->students as $student) {
                            fputcsv($handle, [
                                $registration->event?->title,
                                $registration->event?->starts_at?->toDateTimeString(),
                                $registration->registrant_name,
                                $registration->registrant_email,
                                'student',
                                $student->name,
                                $student->email,
                                $student->student_identifier,
                                $student->grade_level,
                                $student->interest_major,
                                1,
                                $student->status,
                                $student->consent_status,
                                $student->is_minor ? 'yes' : 'no',
                                $student->guardian_name,
                                $student->guardian_email,
                                $student->guardian_phone,
                                $student->emergency_contact_name,
                                $student->emergency_contact_phone,
                                $student->checked_in_at?->toDateTimeString(),
                                $student->checked_out_at?->toDateTimeString(),
                                $registration->waitlist_promoted_at?->toDateTimeString(),
                                $student->medical_notes,
                            ]);
                        }

                        continue;
                    }

                    fputcsv($handle, [
                        $registration->event?->title,
                        $registration->event?->starts_at?->toDateTimeString(),
                        $registration->registrant_name,
                        $registration->registrant_email,
                        'group',
                        '',
                        '',
                        '',
                        '',
                        '',
                        $registration->party_size,
                        $registration->status,
                        $registration->consent_status,
                        $registration->is_minor ? 'yes' : 'no',
                        $registration->guardian_name,
                        $registration->guardian_email,
                        $registration->guardian_phone,
                        $registration->emergency_contact_name,
                        $registration->emergency_contact_phone,
                        $registration->checked_in_at?->toDateTimeString(),
                        $registration->checked_out_at?->toDateTimeString(),
                        $registration->waitlist_promoted_at?->toDateTimeString(),
                        $registration->medical_notes,
                    ]);
                }
            });
            fclose($handle);
        }, 'university-attendees.csv', ['Content-Type' => 'text/csv']);
    }

    public function destroyUniversityAttendee(Request $request, EventRegistration $registration): RedirectResponse
    {
        $this->authorizeUniversityRegistration($request, $registration);

        $event = $registration->event;
        $registration->delete();
        $this->logUniversityActivity($request, 'attendee.deleted', $event, [
            'registration_id' => $registration->id,
            'registrant' => $registration->registrant_name,
        ]);
        $this->promoteCampusEventWaitlist($event);

        return back()->with('status', 'Attendee removed.');
    }

    public function messageUniversityAttendees(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'registration_ids' => ['required', 'array', 'min:1'],
            'registration_ids.*' => ['integer', 'exists:event_registrations,id'],
            'channel' => ['required', Rule::in(['email'])],
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
        $this->logUniversityActivity($request, 'attendees.message_queued', null, [
            'count' => $registrations->count(),
            'channel' => $validated['channel'],
        ]);

        return back()->with('status', 'Message queued for '.$registrations->count().' attendee record(s).');
    }

    public function storeUniversityComplianceRequest(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'type' => ['required', Rule::in(['data_export', 'data_deletion', 'consent_review', 'privacy_review'])],
            'subject_type' => ['nullable', 'required_with:subject_id', Rule::in(['attendee', 'student_group', 'program', 'school', 'message'])],
            'subject_id' => ['nullable', 'required_with:subject_type', 'integer', 'min:1'],
            'subject_label' => ['nullable', 'string', 'max:180'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        if (($validated['subject_type'] ?? null) && ! $this->ownsComplianceSubject(
            $request->user(),
            $validated['subject_type'],
            (int) $validated['subject_id'],
        )) {
            return back()->withInput()->withErrors([
                'subject_id' => 'The selected subject does not belong to this university workspace.',
            ]);
        }

        $record = ComplianceRequest::create([
            'university_user_id' => $request->user()->id,
            'requested_by_user_id' => $request->user()->id,
            'type' => $validated['type'],
            'subject_type' => $validated['subject_type'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'subject_label' => $validated['subject_label'] ?? null,
            'reason' => $validated['reason'] ?? null,
            'status' => 'open',
            'metadata' => ['source' => 'university_settings_compliance'],
        ]);

        $this->logUniversityActivity($request, 'compliance.request_created', $record, [
            'type' => $record->type,
            'subject' => $record->subject_label,
        ]);

        return back()->with('status', 'Compliance request created.');
    }

    public function updateUniversityComplianceRequest(Request $request, ComplianceRequest $complianceRequest): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university' && $complianceRequest->university_user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['cancelled'])],
        ]);
        abort_unless($complianceRequest->status === 'open', 422, 'Only an open compliance request can be cancelled.');

        $complianceRequest->update([
            'status' => $validated['status'],
            'completed_at' => null,
            'metadata' => array_merge($complianceRequest->metadata ?? [], [
                'cancelled_by_user_id' => $request->user()->id,
                'cancelled_at' => now()->toIso8601String(),
            ]),
        ]);

        $this->logUniversityActivity($request, 'compliance.request_'.$validated['status'], $complianceRequest);

        return back()->with('status', 'Compliance request updated.');
    }

    public function updateAdminComplianceRequest(Request $request, ComplianceRequest $complianceRequest): RedirectResponse
    {
        abort_unless($request->user()?->role === 'admin', 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['reviewing', 'completed', 'rejected'])],
            'resolution_note' => ['nullable', 'required_if:status,completed,rejected', 'string', 'max:4000'],
        ]);
        abort_if($complianceRequest->status === 'cancelled', 422, 'A cancelled request cannot be processed.');

        $complianceRequest->update([
            'status' => $validated['status'],
            'completed_at' => $validated['status'] === 'completed' ? now() : null,
            'metadata' => array_merge($complianceRequest->metadata ?? [], [
                'processed_by_user_id' => $request->user()->id,
                'resolution_note' => $validated['resolution_note'] ?? null,
                'processed_at' => now()->toIso8601String(),
            ]),
        ]);

        return back()->with('status', 'Compliance request processor status updated.');
    }

    public function updateUniversityProgramReminder(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university' && $event->university_user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'reminders_enabled' => ['nullable', 'boolean'],
            'reminder_days_before' => ['required', 'integer', 'min:0', 'max:60'],
            'reminder_time' => ['required', 'date_format:H:i'],
        ]);

        $event->update([
            'reminders_enabled' => $request->boolean('reminders_enabled'),
            'reminder_days_before' => (int) $validated['reminder_days_before'],
            'reminder_time' => $validated['reminder_time'],
        ]);

        $this->logUniversityActivity($request, 'program.reminder_settings_updated', $event, [
            'reminders_enabled' => $request->boolean('reminders_enabled'),
            'reminder_days_before' => (int) $validated['reminder_days_before'],
            'reminder_time' => $validated['reminder_time'],
        ]);

        return back()->with('status', 'Reminder schedule updated for '.$event->title.'.');
    }

    public function queueUniversityProgramReminder(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university' && $event->university_user_id === $request->user()->id, 403);

        $event->loadMissing('registrations.user.school');
        $queued = 0;
        $scheduledFor = $this->scheduledReminderTime($event);

        foreach ($event->registrations as $registration) {
            if (! $registration->user_id && ! $registration->registrant_email) {
                continue;
            }

            PlatformNotification::create([
                'user_id' => $registration->user_id,
                'campus_event_id' => $event->id,
                'notification_type' => 'reminder',
                'target_type' => $registration->registrant_type === 'school_group' ? 'school' : 'student',
                'target_id' => $registration->user_id ?: $registration->id,
                'channel' => 'email',
                'subject' => 'Visit reminder: '.$event->title,
                'body' => $this->noticeBody('reminder', $event, $registration->registrant_name),
                'status' => 'queued',
                'scheduled_for' => $scheduledFor,
                'metadata' => [
                    'registration_id' => $registration->id,
                    'registrant_email' => $registration->registrant_email,
                    'queued_by' => $request->user()->id,
                ],
            ]);
            $queued++;
        }

        $event->update(['last_reminder_queued_at' => now()]);
        $this->logUniversityActivity($request, 'notifications.reminders_queued', $event, [
            'queued_count' => $queued,
            'scheduled_for' => $scheduledFor->toIso8601String(),
        ]);

        return back()->with('status', 'Queued '.$queued.' reminder(s) for '.$event->title.'.');
    }

    public function sendUniversityTargetedNotice(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'campus_event_id' => ['required', 'integer', 'exists:campus_events,id'],
            'notice_type' => ['required', Rule::in(['update', 'cancellation', 'reminder'])],
            'channel' => ['required', Rule::in(['email'])],
            'target_scope' => ['required', Rule::in(['all', 'confirmed', 'waitlisted', 'schools', 'students'])],
            'subject' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $event = CampusEvent::query()
            ->where('university_user_id', $request->user()->id)
            ->findOrFail($validated['campus_event_id']);

        $registrations = EventRegistration::query()
            ->where('campus_event_id', $event->id)
            ->when($validated['target_scope'] === 'confirmed', fn ($query) => $query->where('status', 'confirmed'))
            ->when($validated['target_scope'] === 'waitlisted', fn ($query) => $query->where('status', 'waitlisted'))
            ->when($validated['target_scope'] === 'schools', fn ($query) => $query->where('registrant_type', 'school_group'))
            ->when($validated['target_scope'] === 'students', fn ($query) => $query->where('registrant_type', 'student'))
            ->get();

        foreach ($registrations as $registration) {
            PlatformNotification::create([
                'user_id' => $registration->user_id,
                'campus_event_id' => $event->id,
                'notification_type' => $validated['notice_type'],
                'target_type' => $registration->registrant_type === 'school_group' ? 'school' : 'student',
                'target_id' => $registration->user_id ?: $registration->id,
                'channel' => $validated['channel'],
                'subject' => $validated['subject'],
                'body' => $validated['body'],
                'status' => 'queued',
                'scheduled_for' => now(),
                'metadata' => [
                    'registration_id' => $registration->id,
                    'target_scope' => $validated['target_scope'],
                    'queued_by' => $request->user()->id,
                ],
            ]);
        }

        $this->logUniversityActivity($request, 'notifications.notice_queued', $event, [
            'notice_type' => $validated['notice_type'],
            'target_scope' => $validated['target_scope'],
            'channel' => $validated['channel'],
            'queued_count' => $registrations->count(),
        ]);

        return back()->with('status', 'Queued '.$registrations->count().' '.$validated['notice_type'].' notice(s).');
    }

    public function retryUniversityNotification(Request $request, PlatformNotification $notification): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);
        abort_unless($notification->event?->university_user_id === $request->user()->id || $notification->user_id === $request->user()->id, 403);

        $notification->update([
            'status' => 'queued',
            'retry_count' => (int) $notification->retry_count + 1,
            'scheduled_for' => now(),
            'last_attempt_at' => now(),
            'failure_reason' => null,
        ]);

        $this->logUniversityActivity($request, 'notifications.retry_queued', $notification, [
            'campus_event_id' => $notification->campus_event_id,
            'retry_count' => $notification->retry_count,
        ]);

        return back()->with('status', 'Notification queued for retry.');
    }

    public function storeUniversityInsight(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:2000'],
            'type' => ['required', Rule::in(['recommendation', 'risk', 'opportunity', 'prediction'])],
            'score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'subject_type' => ['nullable', 'string', 'max:120'],
            'subject_id' => ['nullable', 'integer'],
        ]);

        RecruitmentInsight::create([
            'user_id' => $request->user()->id,
            'subject_type' => ($validated['subject_type'] ?? null) ?: null,
            'subject_id' => ($validated['subject_id'] ?? null) ?: null,
            'title' => $validated['title'],
            'body' => $validated['body'],
            'type' => $validated['type'],
            'status' => 'saved',
            'score' => (int) ($validated['score'] ?? 0),
            'metadata' => ['source' => 'university_insights', 'saved_at' => now()->toIso8601String()],
        ]);

        return back()->with('status', 'Insight saved as an actionable recommendation.');
    }

    public function updateUniversityInsightStatus(Request $request, RecruitmentInsight $insight): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);
        abort_unless($insight->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'saved', 'done', 'dismissed'])],
        ]);

        $insight->update(['status' => $validated['status']]);

        return back()->with('status', 'Insight status updated.');
    }

    public function exportUniversityInsights(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $analytics = $this->universityAnalytics($request->user());

        return response()->streamDownload(function () use ($analytics): void {
            $handle = fopen('php://output', 'wb');
            fputcsv($handle, ['ScaleCampusLab University Insights Report']);
            fputcsv($handle, ['Generated At', now()->toDateTimeString()]);
            fputcsv($handle, ['Date Range', ($analytics['dateRange']['start'] ?? '').' to '.($analytics['dateRange']['end'] ?? '')]);
            fputcsv($handle, []);
            fputcsv($handle, ['Metric', 'Value', 'Detail']);
            foreach ($analytics['kpis'] ?? [] as $item) {
                fputcsv($handle, [$item['label'] ?? '', $item['value'] ?? '', $item['trend'] ?? '']);
            }
            fputcsv($handle, []);
            fputcsv($handle, ['Funnel Step', 'Count', 'Rate', 'School', 'Program']);
            foreach ($analytics['schoolProgramFunnel'] ?? [] as $row) {
                fputcsv($handle, [$row['stage'], $row['value'], $row['rate'].'%', $row['school'], $row['program']]);
            }
            fputcsv($handle, []);
            fputcsv($handle, ['Cycle', 'Registered Seats', 'Attended Seats', 'Applications', 'Conversion']);
            foreach ($analytics['cycleComparisons'] ?? [] as $row) {
                fputcsv($handle, [$row['label'], $row['registered'], $row['attended'], $row['applications'], $row['conversion'].'%']);
            }
            fputcsv($handle, []);
            fputcsv($handle, ['Insight', 'Type', 'Score', 'Body']);
            foreach ($analytics['insights'] ?? [] as $item) {
                fputcsv($handle, [$item['title'] ?? '', $item['type'] ?? '', $item['score'] ?? '', $item['body'] ?? '']);
            }
            fclose($handle);
        }, 'university-insights-report.csv', ['Content-Type' => 'text/csv']);
    }

    public function storeAdminUser(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $this->validateAdminUser($request);

        $managedUser = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password'] ?: Str::password(18)),
            'role' => $validated['role'],
            'school_id' => in_array($validated['role'], ['school', 'student'], true) ? $validated['school_id'] : null,
            'access_status' => $validated['access_status'],
            'email_verified_at' => $request->boolean('verified') ? now() : null,
            'two_factor_enabled' => $request->boolean('two_factor_enabled'),
            'security_alerts' => $request->boolean('security_alerts'),
            'recovery_email' => $validated['recovery_email'] ?: null,
        ]);

        if (! $managedUser->hasVerifiedEmail()) {
            $managedUser->sendEmailVerificationNotification();
        }
        if (empty($validated['password'])) {
            PasswordBroker::sendResetLink(['email' => $managedUser->email]);
        }

        return back()->with('status', empty($validated['password']) ? 'User invited. A secure password setup link was sent.' : 'User account created.');
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
            'school_id' => in_array($validated['role'], ['school', 'student'], true) ? $validated['school_id'] : null,
            'access_status' => $validated['access_status'],
            'email_verified_at' => $request->boolean('verified') ? ($managedUser->email_verified_at ?: now()) : null,
            'two_factor_enabled' => $request->boolean('two_factor_enabled'),
            'security_alerts' => $request->boolean('security_alerts'),
            'recovery_email' => $validated['recovery_email'] ?: null,
        ]);

        if (! empty($validated['password'])) {
            $managedUser->password = Hash::make($validated['password']);
            $managedUser->remember_token = Str::random(60);
        }

        $managedUser->save();

        if (! empty($validated['password']) || $validated['access_status'] === 'suspended') {
            $this->sessionRevoker->revokeAll($managedUser);
        }
        if (! $managedUser->hasVerifiedEmail()) {
            $managedUser->sendEmailVerificationNotification();
        }

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

        if ($validated['access_status'] !== 'active') {
            $this->sessionRevoker->revokeAll($managedUser);
        }

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

        if (
            $managedUser->campusEvents()->exists()
            || $managedUser->eventRegistrations()->exists()
            || EventRegistrationStudent::query()->where('user_id', $managedUser->id)->exists()
            || InstitutionProgram::query()->where('university_user_id', $managedUser->id)->exists()
            || AdmissionApplication::query()->where('student_user_id', $managedUser->id)->exists()
            || ApplicationPayment::query()->where('student_user_id', $managedUser->id)->exists()
            || StudentDocument::query()->where('student_user_id', $managedUser->id)->exists()
            || Application::query()->where('student_id', $managedUser->id)->orWhere('university_id', $managedUser->id)->exists()
            || TargetSchool::query()->withoutGlobalScope('universityTenant')->where('university_user_id', $managedUser->id)->exists()
            || Conversation::query()->where('created_by_user_id', $managedUser->id)->exists()
            || ConversationMessage::query()->where('sender_user_id', $managedUser->id)->exists()
        ) {
            return back()->withErrors(['user' => 'Users with platform history must be suspended instead of deleted.']);
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

        $user->forceFill([
            'password' => $validated['password'],
            'remember_token' => Str::random(60),
        ])->save();
        $this->sessionRevoker->revokeOther($user, $request->session()->getId());
        $request->session()->regenerate();

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

    public function updateStudentProfile(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->role === 'student', 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:60'],
            'student_identifier' => ['nullable', 'string', 'max:40'],
            'grade_level' => ['nullable', 'string', 'max:40'],
            'interest_major' => ['nullable', 'string', 'max:120'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:120'],
            'guardian_name' => ['nullable', 'string', 'max:160'],
            'guardian_relationship' => ['nullable', 'string', 'max:80'],
            'guardian_email' => ['nullable', 'email:rfc', 'max:160'],
            'guardian_phone' => ['nullable', 'string', 'max:60'],
            'emergency_contact_name' => ['nullable', 'string', 'max:160'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:80'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:60'],
            'medical_notes' => ['nullable', 'string', 'max:2000'],
            'accessibility_needs' => ['nullable', 'string', 'max:2000'],
            'dietary_restrictions' => ['nullable', 'string', 'max:255'],
            'consent_to_share' => ['nullable', 'boolean'],
        ]);

        $user->update([
            ...$validated,
            'consent_to_share' => $request->boolean('consent_to_share'),
        ]);

        return back()->with('status', 'Student profile saved.');
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

    public function updateUniversitySettings(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $request->validate([
            'institution_name' => ['required', 'string', 'max:180'],
            'website' => ['nullable', 'url', 'max:255'],
            'primary_contact_name' => ['required', 'string', 'max:160'],
            'primary_contact_email' => ['required', 'email:rfc', 'max:180'],
            'primary_contact_phone' => ['nullable', 'string', 'max:60'],
            'address' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:120'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'brand_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'default_capacity' => ['required', 'integer', 'min:1', 'max:5000'],
            'default_per_school_capacity' => ['nullable', 'integer', 'min:1', 'lte:default_capacity'],
            'default_per_group_capacity' => ['nullable', 'integer', 'min:1', 'lte:default_capacity'],
            'default_visibility' => ['required', Rule::in(['public', 'invite_only', 'private'])],
            'default_lifecycle_stage' => ['required', Rule::in(['planning', 'inviting', 'open'])],
            'default_visit_duration_minutes' => ['required', 'integer', 'min:30', 'max:1440'],
            'reminder_days_before' => ['required', 'integer', 'min:0', 'max:60'],
            'timezone' => ['required', 'timezone'],
            'calendar_week_start' => ['required', Rule::in(['sunday', 'monday'])],
            'calendar_provider' => ['required', Rule::in(['none', 'google', 'microsoft', 'ical'])],
            'crm_provider' => ['required', Rule::in(['none', 'salesforce', 'hubspot', 'zoho', 'custom'])],
            'webhook_url' => ['nullable', 'url', 'max:500'],
        ]);

        UniversitySetting::updateOrCreate(
            ['university_user_id' => $request->user()->id],
            [
                'institution_name' => $validated['institution_name'],
                'website' => $validated['website'] ?? null,
                'primary_contact_name' => $validated['primary_contact_name'],
                'primary_contact_email' => $validated['primary_contact_email'],
                'primary_contact_phone' => $validated['primary_contact_phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'region' => $validated['region'] ?? null,
                'logo_url' => $validated['logo_url'] ?? null,
                'brand_color' => $validated['brand_color'],
                'default_visit_config' => [
                    'capacity' => (int) $validated['default_capacity'],
                    'per_school_capacity' => $validated['default_per_school_capacity'] ? (int) $validated['default_per_school_capacity'] : null,
                    'per_group_capacity' => $validated['default_per_group_capacity'] ? (int) $validated['default_per_group_capacity'] : null,
                    'visibility' => $validated['default_visibility'],
                    'lifecycle_stage' => $validated['default_lifecycle_stage'],
                    'duration_minutes' => (int) $validated['default_visit_duration_minutes'],
                ],
                'notification_preferences' => [
                    'request_created' => $request->boolean('notify_request_created'),
                    'request_updated' => $request->boolean('notify_request_updated'),
                    'registration_confirmed' => $request->boolean('notify_registration_confirmed'),
                    'waitlist_promoted' => $request->boolean('notify_waitlist_promoted'),
                    'schedule_changed' => $request->boolean('notify_schedule_changed'),
                    'reminder_days_before' => (int) $validated['reminder_days_before'],
                    'email_enabled' => $request->boolean('email_enabled'),
                    'sms_enabled' => $request->boolean('sms_enabled'),
                ],
                'integration_settings' => [
                    'calendar_provider' => $validated['calendar_provider'],
                    'crm_provider' => $validated['crm_provider'],
                    'webhook_url' => $validated['webhook_url'] ?? null,
                    'api_sync_enabled' => $request->boolean('api_sync_enabled'),
                ],
                'timezone' => $validated['timezone'],
                'calendar_week_start' => $validated['calendar_week_start'],
            ]
        );
        $this->logUniversityActivity($request, 'settings.updated', null, [
            'sections' => ['profile', 'branding', 'defaults', 'notifications', 'integrations', 'calendar'],
        ]);

        return back()->with('status', 'University operation settings saved.');
    }

    public function storeUniversityTeamMember(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $this->validateUniversityTeamMember($request);

        $member = UniversityTeamMember::create([
            'university_user_id' => $request->user()->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'title' => $validated['title'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'status' => $validated['status'],
            'permissions' => $this->teamPermissionsFromRequest($request),
        ]);
        $this->logUniversityActivity($request, 'team.member_created', $member, [
            'email' => $member->email,
            'permissions' => $member->permissions,
        ]);

        return back()->with('status', 'Team contact added.');
    }

    public function updateUniversityTeamMember(Request $request, UniversityTeamMember $teamMember): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university' && $teamMember->university_user_id === $request->user()->id, 403);

        $validated = $this->validateUniversityTeamMember($request, $teamMember->id);

        $teamMember->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'title' => $validated['title'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'status' => $validated['status'],
            'permissions' => $this->teamPermissionsFromRequest($request),
        ]);
        $this->logUniversityActivity($request, 'team.member_updated', $teamMember, [
            'email' => $teamMember->email,
            'status' => $teamMember->status,
            'permissions' => $teamMember->permissions,
        ]);

        return back()->with('status', 'Team contact updated.');
    }

    public function destroyUniversityTeamMember(Request $request, UniversityTeamMember $teamMember): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university' && $teamMember->university_user_id === $request->user()->id, 403);

        $metadata = ['email' => $teamMember->email, 'name' => $teamMember->name];
        $teamMember->delete();
        $this->logUniversityActivity($request, 'team.member_deleted', null, $metadata);

        return back()->with('status', 'Team contact removed.');
    }

    public function storeSchoolStudent(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isSchool(), 403);
        abort_unless($request->user()->school_id, 422, 'Your school account is not linked to a school.');

        $validated = $this->validateSchoolStudent($request);

        $student = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make(Str::password(16)),
            'role' => 'student',
            'school_id' => $request->user()->school_id,
            'student_identifier' => $validated['student_identifier'] ?: $this->nextStudentIdentifier(),
            'grade_level' => $validated['grade_level'],
            'interest_major' => $validated['interest_major'],
            'assigned_events' => [],
            'access_status' => 'pending',
            'email_verified_at' => null,
        ]);

        PasswordBroker::sendResetLink(['email' => $student->email]);
        $student->sendEmailVerificationNotification();

        return back()->with('status', 'Student invited. They must set a password, verify their email, and be approved before access.');
    }

    public function updateSchoolStudent(Request $request, User $student): RedirectResponse
    {
        $this->authorizeSchoolStudent($request, $student);

        $validated = $this->validateSchoolStudent($request, $student->id);
        $emailChanged = strcasecmp($student->email, $validated['email']) !== 0;
        $student->update($validated + ($emailChanged ? ['email_verified_at' => null] : []));

        if ($emailChanged) {
            $student->sendEmailVerificationNotification();
        }

        return back()->with('status', 'Student updated.');
    }

    public function destroySchoolStudent(Request $request, User $student): RedirectResponse
    {
        $this->authorizeSchoolStudent($request, $student);
        if (
            EventRegistration::query()->where('user_id', $student->id)->exists()
            || EventRegistrationStudent::query()->where('user_id', $student->id)->exists()
        ) {
            return back()->withErrors(['student' => 'Students with visit participation must be retained to preserve attendance history.']);
        }
        $student->delete();

        return back()->with('status', 'Student deleted.');
    }

    public function assignSchoolStudents(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isSchool(), 403);

        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', 'exists:users,id'],
            'visit_request_id' => ['required', 'integer', 'exists:visit_requests,id'],
        ]);
        $visit = VisitRequest::findOrFail($validated['visit_request_id']);
        $response = app(ParticipationController::class)->assign($request, $visit);
        $payload = $response->getData(true);
        $assignedCount = count($payload['data']['students'] ?? []);

        return back()->with('status', 'Assigned '.$assignedCount.' student(s) to the approved visit.');
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

            $student = User::create([
                'name' => $row['name'],
                'email' => $row['email'],
                'password' => Hash::make(Str::password(16)),
                'role' => 'student',
                'school_id' => $request->user()->school_id,
                'student_identifier' => $this->nextStudentIdentifier(),
                'grade_level' => $row['grade'] ?: '12th',
                'interest_major' => $row['interest'] ?: 'Undecided',
                'assigned_events' => [],
                'access_status' => 'pending',
                'email_verified_at' => null,
            ]);
            PasswordBroker::sendResetLink(['email' => $student->email]);
            $student->sendEmailVerificationNotification();
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
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'emailVerified' => $user->email_verified_at !== null,
                'studentIdentifier' => $user->student_identifier,
                'gradeLevel' => $user->grade_level,
                'interestMajor' => $user->interest_major,
                'dateOfBirth' => $user->date_of_birth?->format('Y-m-d'),
                'address' => $user->address,
                'city' => $user->city,
                'state' => $user->state,
                'country' => $user->country,
                'guardianName' => $user->guardian_name,
                'guardianRelationship' => $user->guardian_relationship,
                'guardianEmail' => $user->guardian_email,
                'guardianPhone' => $user->guardian_phone,
                'emergencyContactName' => $user->emergency_contact_name,
                'emergencyContactRelationship' => $user->emergency_contact_relationship,
                'emergencyContactPhone' => $user->emergency_contact_phone,
                'medicalNotes' => $user->medical_notes,
                'accessibilityNeeds' => $user->accessibility_needs,
                'dietaryRestrictions' => $user->dietary_restrictions,
                'consentToShare' => (bool) $user->consent_to_share,
                'profilePhotoUrl' => $user->profile_photo_path && $user->profile_photo_disk
                    ? Storage::disk($user->profile_photo_disk)->url($user->profile_photo_path)
                    : null,
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

    private function universitySettings(User $user): array
    {
        $settings = UniversitySetting::query()->firstOrCreate(
            ['university_user_id' => $user->id],
            [
                'institution_name' => $user->name,
                'primary_contact_name' => $user->name,
                'primary_contact_email' => $user->email,
                'brand_color' => '#006a61',
                'default_visit_config' => [
                    'capacity' => 80,
                    'per_school_capacity' => 50,
                    'per_group_capacity' => 50,
                    'visibility' => 'public',
                    'lifecycle_stage' => 'planning',
                    'duration_minutes' => 180,
                ],
                'notification_preferences' => [
                    'request_created' => true,
                    'request_updated' => true,
                    'registration_confirmed' => true,
                    'waitlist_promoted' => true,
                    'schedule_changed' => true,
                    'reminder_days_before' => 7,
                    'email_enabled' => true,
                    'sms_enabled' => false,
                ],
                'integration_settings' => [
                    'calendar_provider' => 'ical',
                    'crm_provider' => 'none',
                    'webhook_url' => null,
                    'api_sync_enabled' => false,
                ],
                'timezone' => config('app.timezone', 'UTC'),
                'calendar_week_start' => 'monday',
            ]
        );

        $team = UniversityTeamMember::query()
            ->where('university_user_id', $user->id)
            ->orderByRaw("case status when 'active' then 1 when 'invited' then 2 else 3 end")
            ->orderBy('name')
            ->get()
            ->map(fn (UniversityTeamMember $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'title' => $member->title,
                'phone' => $member->phone,
                'status' => $member->status,
                'permissions' => $member->permissions ?: [],
                'lastActiveAt' => $member->last_active_at?->toIso8601String(),
            ])
            ->toArray();

        return [
            'profile' => [
                'institutionName' => $settings->institution_name ?: $user->name,
                'website' => $settings->website,
                'primaryContactName' => $settings->primary_contact_name ?: $user->name,
                'primaryContactEmail' => $settings->primary_contact_email ?: $user->email,
                'primaryContactPhone' => $settings->primary_contact_phone,
                'address' => $settings->address,
                'region' => $settings->region,
            ],
            'branding' => [
                'logoUrl' => $settings->logo_url,
                'brandColor' => $settings->brand_color ?: '#006a61',
            ],
            'defaults' => $settings->default_visit_config ?: [],
            'notifications' => $settings->notification_preferences ?: [],
            'integrations' => $settings->integration_settings ?: [],
            'calendar' => [
                'timezone' => $settings->timezone ?: config('app.timezone', 'UTC'),
                'weekStart' => $settings->calendar_week_start ?: 'monday',
            ],
            'team' => $team,
        ];
    }

    private function universityCompliance(User $user): array
    {
        $eventIds = CampusEvent::query()->where('university_user_id', $user->id)->pluck('id');
        $registrations = EventRegistration::query()->whereIn('campus_event_id', $eventIds);
        $minorCount = (clone $registrations)->where('is_minor', true)->count();
        $pendingConsent = (clone $registrations)->where('is_minor', true)->whereNotIn('consent_status', ['received', 'not_required'])->count();
        $groupStudents = EventRegistrationStudent::query()
            ->whereHas('registration', fn ($query) => $query->whereIn('campus_event_id', $eventIds));
        $pendingStudentConsent = (clone $groupStudents)->where('is_minor', true)->whereNotIn('consent_status', ['received', 'not_required'])->count();

        $logs = SystemLog::query()
            ->with('user:id,name,email,role')
            ->where(function ($query) use ($user, $eventIds): void {
                $query->where('user_id', $user->id)
                    ->orWhere(function ($nested) use ($eventIds): void {
                        $nested->where('subject_type', CampusEvent::class)->whereIn('subject_id', $eventIds);
                    })
                    ->orWhere('metadata->university_user_id', $user->id);
            })
            ->latest()
            ->limit(80)
            ->get()
            ->map(fn (SystemLog $log) => [
                'id' => $log->id,
                'actor' => $log->user?->name ?: 'System',
                'actorRole' => $log->user?->role,
                'action' => $log->action,
                'subjectType' => class_basename((string) $log->subject_type),
                'subjectId' => $log->subject_id,
                'metadata' => $log->metadata ?: [],
                'createdAt' => $log->created_at?->toIso8601String(),
            ])
            ->toArray();

        $requests = ComplianceRequest::query()
            ->where('university_user_id', $user->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (ComplianceRequest $request) => [
                'id' => $request->id,
                'type' => $request->type,
                'subjectType' => $request->subject_type,
                'subjectId' => $request->subject_id,
                'subjectLabel' => $request->subject_label,
                'reason' => $request->reason,
                'status' => $request->status,
                'completedAt' => $request->completed_at?->toIso8601String(),
                'createdAt' => $request->created_at?->toIso8601String(),
            ])
            ->toArray();

        return [
            'metrics' => [
                'auditLogs' => count($logs),
                'openRequests' => collect($requests)->whereIn('status', ['open', 'reviewing'])->count(),
                'minorRecords' => $minorCount + (clone $groupStudents)->where('is_minor', true)->count(),
                'pendingConsent' => $pendingConsent + $pendingStudentConsent,
            ],
            'privacyNotice' => 'Attendee data may include student names, contact details, group affiliation, consent status, emergency contacts, attendance, and operational notes. Use only for visit coordination, safety, compliance, and recruitment operations with authorized staff.',
            'requests' => $requests,
            'logs' => $logs,
        ];
    }

    private function logUniversityActivity(Request $request, string $action, ?Model $subject = null, array $metadata = []): void
    {
        $user = $request->user();
        if (! $user) {
            return;
        }

        SystemLog::create([
            'user_id' => $user->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'metadata' => array_merge([
                'university_user_id' => $user->role === 'university' ? $user->id : null,
                'ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 180, ''),
            ], $metadata),
        ]);
    }

    private function validateUniversityTeamMember(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => [
                'required',
                'email:rfc',
                'max:180',
                Rule::unique('university_team_members', 'email')
                    ->where(fn ($query) => $query->where('university_user_id', $request->user()->id))
                    ->ignore($ignoreId),
            ],
            'title' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:60'],
            'status' => ['required', Rule::in(['active', 'invited', 'suspended'])],
        ]);
    }

    private function teamPermissionsFromRequest(Request $request): array
    {
        return [
            'manage_programs' => $request->boolean('permission_manage_programs'),
            'manage_requests' => $request->boolean('permission_manage_requests'),
            'manage_attendees' => $request->boolean('permission_manage_attendees'),
            'send_messages' => $request->boolean('permission_send_messages'),
            'view_insights' => $request->boolean('permission_view_insights'),
        ];
    }

    private function validateAdminUser(Request $request, ?int $ignoreUserId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($ignoreUserId)],
            'password' => ['nullable', 'string', Password::min(10)->mixedCase()->numbers()],
            'role' => ['required', Rule::in(['admin', 'university', 'school', 'student'])],
            'school_id' => ['required_if:role,school,student', 'nullable', 'integer', 'exists:schools,id'],
            'access_status' => ['required', Rule::in(['active', 'pending', 'suspended'])],
            'verified' => ['nullable', 'boolean'],
            'two_factor_enabled' => ['nullable', 'boolean'],
            'security_alerts' => ['nullable', 'boolean'],
            'recovery_email' => ['nullable', 'email:rfc', 'max:160'],
        ]);
    }

    private function ownsComplianceSubject(User $university, string $subjectType, int $subjectId): bool
    {
        return match ($subjectType) {
            'attendee', 'student_group' => EventRegistration::query()
                ->whereKey($subjectId)
                ->whereHas('event', fn ($event) => $event->where('university_user_id', $university->id))
                ->exists(),
            'program' => CampusEvent::query()
                ->whereKey($subjectId)
                ->where('university_user_id', $university->id)
                ->exists()
                || InstitutionProgram::query()
                    ->whereKey($subjectId)
                    ->where('university_user_id', $university->id)
                    ->exists(),
            'school' => TargetSchool::query()->whereKey($subjectId)->exists(),
            'message' => PlatformNotification::query()
                ->whereKey($subjectId)
                ->where(function ($message) use ($university): void {
                    $message->where('user_id', $university->id)
                        ->orWhereHas('event', fn ($event) => $event->where('university_user_id', $university->id))
                        ->orWhere(fn ($outbound) => $outbound
                            ->where('target_type', 'outbound_contact')
                            ->where('target_id', $university->id));
                })
                ->exists(),
            default => false,
        };
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
            $frameworkWritable = is_writable(storage_path('framework'));
            $privateWritable = is_writable(storage_path('app/private'));
            $publicLinkReady = is_dir(public_path('storage'));

            return [
                'detail' => 'Framework storage '.($frameworkWritable ? 'writable' : 'not writable').'; private uploads '.($privateWritable ? 'writable' : 'not writable').'; public storage link '.($publicLinkReady ? 'ready' : 'missing').'.',
                'status' => $frameworkWritable && $privateWritable && $publicLinkReady ? 'operational' : 'critical',
            ];
        });

        $logCheck = $this->healthCheck('Application Logs', function (): array {
            $logPaths = glob(storage_path('logs/laravel*.log')) ?: [];
            usort($logPaths, fn (string $left, string $right): int => filemtime($right) <=> filemtime($left));
            $logPath = $logPaths[0] ?? null;
            $size = $logPath ? filesize($logPath) : 0;

            return [
                'detail' => $logPath ? 'Latest log: '.basename($logPath).' ('.$this->bytesToHuman((int) $size).').' : 'No Laravel log file exists yet.',
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
        $queueCheck = $this->healthCheck('Queue Backlog', function () use ($queueConnection): array {
            if ($queueConnection === 'sync') {
                return ['detail' => 'Queue jobs run synchronously; no worker is required.'];
            }

            if ($queueConnection !== 'database') {
                return [
                    'detail' => 'Queue connection: '.$queueConnection.'. Worker heartbeat is not instrumented.',
                    'status' => 'warning',
                ];
            }

            if (! Schema::hasTable('jobs') || ! Schema::hasTable('failed_jobs')) {
                return ['detail' => 'Database queue tables are missing.', 'status' => 'critical'];
            }

            $pending = DB::table('jobs')->count();
            $failed = DB::table('failed_jobs')->count();
            $oldest = DB::table('jobs')->min('created_at');
            $oldestAge = $oldest ? max(0, now()->timestamp - (int) $oldest) : 0;
            $status = $failed > 0 || $oldestAge > 300 ? 'warning' : 'operational';

            return [
                'detail' => $pending.' pending; '.$failed.' failed; oldest pending age '.$oldestAge.'s. Configuration is visible, but worker heartbeat is not asserted.',
                'status' => $status,
            ];
        });
        $mailCheck = $this->healthCheck('Mail Configuration', function () use ($mailMailer): array {
            if ($mailMailer === 'log') {
                return [
                    'detail' => 'Mail is written to the application log. Configure an external transport before launch.',
                    'status' => 'warning',
                ];
            }

            if ($mailMailer === 'smtp' && blank(config('mail.mailers.smtp.host'))) {
                return [
                    'detail' => 'SMTP is selected but MAIL_HOST is not configured.',
                    'status' => 'critical',
                ];
            }

            return [
                'detail' => 'Mail transport is configured as '.$mailMailer.'; successful delivery still requires an external inbox test.',
            ];
        });
        $sessionCheck = $this->healthCheck('Session Store', function () use ($sessionDriver): array {
            if ($sessionDriver === 'database' && ! Schema::hasTable(config('session.table', 'sessions'))) {
                return ['detail' => 'The configured database session table is missing.', 'status' => 'critical'];
            }

            if ($sessionDriver === 'file' && ! is_writable(storage_path('framework/sessions'))) {
                return ['detail' => 'The file session directory is not writable.', 'status' => 'critical'];
            }

            $supported = in_array($sessionDriver, ['database', 'redis', 'file'], true);

            return [
                'detail' => 'Session driver: '.$sessionDriver.'.'.($sessionDriver === 'redis' ? ' External Redis availability is not probed by this page.' : ''),
                'status' => $supported ? 'operational' : 'warning',
            ];
        });
        $cacheCheck = $this->healthCheck('Cache Store', function () use ($cacheDriver): array {
            if ($cacheDriver === 'database' && ! Schema::hasTable(config('cache.stores.database.table', 'cache'))) {
                return ['detail' => 'The configured database cache table is missing.', 'status' => 'critical'];
            }

            if ($cacheDriver === 'file' && ! is_writable(storage_path('framework/cache'))) {
                return ['detail' => 'The file cache directory is not writable.', 'status' => 'critical'];
            }

            $supported = in_array($cacheDriver, ['database', 'redis', 'file', 'array'], true);

            return [
                'detail' => 'Cache driver: '.$cacheDriver.'.'.($cacheDriver === 'redis' ? ' External Redis availability is not probed by this page.' : ''),
                'status' => $supported ? 'operational' : 'warning',
            ];
        });
        $recentNotifications = PlatformNotification::query()->latest()->limit(8)->get();
        $recentUsers = User::query()->latest()->limit(5)->get();
        $recentEvents = CampusEvent::query()->latest()->limit(5)->get();
        $recentRequests = VisitRequest::query()->latest()->limit(5)->get();
        $checks = [
            $databaseCheck,
            $storageCheck,
            $logCheck,
            $queueCheck,
            $mailCheck,
            $sessionCheck,
            $cacheCheck,
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
                ['label' => 'Queue', 'value' => $queueConnection, 'status' => $queueCheck['status']],
                ['label' => 'Mail', 'value' => $mailMailer, 'status' => $mailCheck['status']],
                ['label' => 'Cache', 'value' => $cacheDriver, 'status' => $cacheCheck['status']],
                ['label' => 'Sessions', 'value' => $sessionDriver, 'status' => $sessionCheck['status']],
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

    private function events(?int $universityUserId = null, ?array $statuses = null, ?array $eventIds = null): array
    {
        return CampusEvent::query()
            ->withSum(['registrations as confirmed_seats' => fn ($query) => $query->where('status', 'confirmed')], 'party_size')
            ->with('university:id,name')
            ->when($universityUserId, fn ($query) => $query->where('university_user_id', $universityUserId))
            ->when($statuses, fn ($query) => $query->whereIn('status', $statuses))
            ->when($eventIds !== null, fn ($query) => $query->whereIn('id', $eventIds))
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
                'recurrenceParentId' => $event->recurrence_parent_id,
                'recurrenceRule' => $event->recurrence_rule ?? 'none',
                'recurrenceCount' => $event->recurrence_count ?? 1,
                'externalCalendarUid' => $event->external_calendar_uid,
                'lastScheduleChangeAt' => $event->last_schedule_change_at?->toIso8601String(),
                'remindersEnabled' => (bool) $event->reminders_enabled,
                'reminderDaysBefore' => $event->reminder_days_before ?? 7,
                'reminderTime' => $event->reminder_time ? substr((string) $event->reminder_time, 0, 5) : '09:00',
                'lastReminderQueuedAt' => $event->last_reminder_queued_at?->toIso8601String(),
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
                'students',
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
                'consentStatus' => $registration->consent_status,
                'isMinor' => $registration->is_minor,
                'guardianName' => $registration->guardian_name,
                'guardianEmail' => $registration->guardian_email,
                'guardianPhone' => $registration->guardian_phone,
                'emergencyContactName' => $registration->emergency_contact_name,
                'emergencyContactPhone' => $registration->emergency_contact_phone,
                'medicalNotes' => $registration->medical_notes,
                'attended' => $registration->attended_at !== null,
                'attendedAt' => $registration->attended_at?->toIso8601String(),
                'checkedIn' => $registration->checked_in_at !== null,
                'checkedInAt' => $registration->checked_in_at?->toIso8601String(),
                'checkedOut' => $registration->checked_out_at !== null,
                'checkedOutAt' => $registration->checked_out_at?->toIso8601String(),
                'waitlistPromotedAt' => $registration->waitlist_promoted_at?->toIso8601String(),
                'importedAt' => $registration->imported_at?->toIso8601String(),
                'importBatch' => $registration->import_batch,
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
                'students' => $registration->students->map(fn (EventRegistrationStudent $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'studentIdentifier' => $student->student_identifier,
                    'grade' => $student->grade_level,
                    'interest' => $student->interest_major,
                    'status' => $student->status,
                    'consentStatus' => $student->consent_status,
                    'isMinor' => $student->is_minor,
                    'guardianName' => $student->guardian_name,
                    'guardianEmail' => $student->guardian_email,
                    'guardianPhone' => $student->guardian_phone,
                    'emergencyContactName' => $student->emergency_contact_name,
                    'emergencyContactPhone' => $student->emergency_contact_phone,
                    'medicalNotes' => $student->medical_notes,
                    'checkedIn' => $student->checked_in_at !== null,
                    'checkedInAt' => $student->checked_in_at?->toIso8601String(),
                    'checkedOut' => $student->checked_out_at !== null,
                    'checkedOutAt' => $student->checked_out_at?->toIso8601String(),
                ])->toArray(),
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

            $next->update([
                'status' => 'confirmed',
                'waitlist_promoted_at' => $next->waitlist_promoted_at ?: now(),
            ]);
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
                'canManage' => auth()->user()?->isAdmin() || $school->university_user_id === auth()->id(),
                'isSharedDirectory' => $school->university_user_id === null,
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

    private function schoolAccounts(bool $activeCoordinatorsOnly = true): array
    {
        return School::query()
            ->when($activeCoordinatorsOnly, fn ($query) => $query->whereHas('users', fn ($users) => $users
                ->whereIn('role', ['school', 'high_school'])
                ->where('access_status', 'active')
                ->whereNotNull('email_verified_at')))
            ->with(['users' => fn ($users) => $users
                ->whereIn('role', ['school', 'high_school'])
                ->orderBy('name')])
            ->withCount([
                'users',
                'users as student_count' => fn ($users) => $users->where('role', 'student'),
                'users as coordinator_count' => fn ($users) => $users->whereIn('role', ['school', 'high_school']),
                'institutionPrograms',
                'visitRequests',
                'registrations',
            ])
            ->orderBy('name')
            ->get()
            ->map(function (School $school): array {
                $coordinators = $school->users;
                $hasActiveCoordinator = $coordinators->contains(fn (User $coordinator) => $coordinator->access_status === 'active' && $coordinator->hasVerifiedEmail());
                $allSuspended = $coordinators->isNotEmpty() && $coordinators->every(fn (User $coordinator) => $coordinator->access_status === 'suspended');

                return [
                    'id' => $school->id,
                    'name' => $school->name,
                    'location' => $school->location,
                    'logoUrl' => $school->logo_url,
                    'coordinatorName' => $school->coordinator_name,
                    'coordinatorEmail' => $school->coordinator_email,
                    'coordinatorPhone' => $school->coordinator_phone,
                    'emailNotifications' => (bool) $school->email_notifications,
                    'status' => $hasActiveCoordinator ? 'active' : ($allSuspended ? 'suspended' : 'pending'),
                    'userCount' => $school->users_count,
                    'studentCount' => $school->student_count,
                    'coordinatorCount' => $school->coordinator_count,
                    'programCount' => $school->institution_programs_count,
                    'visitRequestCount' => $school->visit_requests_count,
                    'registrationCount' => $school->registrations_count,
                    'canDelete' => ($school->users_count + $school->institution_programs_count + $school->visit_requests_count + $school->registrations_count) === 0,
                    'coordinators' => $coordinators->map(fn (User $coordinator) => [
                        'id' => $coordinator->id,
                        'name' => $coordinator->name,
                        'email' => $coordinator->email,
                        'accessStatus' => $coordinator->access_status,
                        'verified' => $coordinator->hasVerifiedEmail(),
                    ])->values()->toArray(),
                ];
            })->toArray();
    }

    private function validateAdminSchoolAccount(Request $request, ?School $school = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('schools', 'name')->ignore($school?->id)],
            'location' => ['required', 'string', 'max:255'],
            'coordinator_name' => ['nullable', 'string', 'max:160'],
            'coordinator_email' => ['nullable', 'email:rfc', 'max:255'],
            'coordinator_phone' => ['nullable', 'string', 'max:40'],
            'email_notifications' => ['nullable', 'boolean'],
        ]);

        $validated['email_notifications'] = $request->boolean('email_notifications');
        $validated['sms_alerts'] = false;

        return $validated;
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

    private function visitRequests(?int $universityUserId = null, ?int $requestedByUserId = null, ?int $schoolId = null): array
    {
        return VisitRequest::query()
            ->with([
                'school:id,name,city,region,country',
                'recipientSchool:id,name,location',
                'requester:id,name,role,school_id',
                'event:id,university_user_id,title,starts_at,ends_at,venue,location,latitude,longitude,capacity,status',
                'event.university:id,name',
            ])
            ->when($universityUserId, fn ($query) => $query->where(function ($scope) use ($universityUserId): void {
                $scope->whereHas('event', fn ($event) => $event->where('university_user_id', $universityUserId))
                    ->orWhere('requested_by_user_id', $universityUserId);
            }))
            ->when($requestedByUserId && $schoolId, fn ($query) => $query->where(fn ($scope) => $scope
                ->where('requested_by_user_id', $requestedByUserId)
                ->orWhere('school_id', $schoolId)))
            ->when($requestedByUserId && ! $schoolId, fn ($query) => $query->where('requested_by_user_id', $requestedByUserId))
            ->when($schoolId && ! $requestedByUserId, fn ($query) => $query->where('school_id', $schoolId))
            ->orderByDesc('priority')
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (VisitRequest $request) => [
                'id' => $request->id,
                'requesterId' => $request->requested_by_user_id,
                'requesterName' => $request->requester?->name,
                'requesterRole' => $request->requester?->role,
                'schoolId' => $request->school_id,
                'legacySchoolId' => $request->target_school_id,
                'school' => $request->recipientSchool?->name ?: $request->school?->name,
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
                'location' => $request->recipientSchool?->location ?: trim(($request->school?->city ?? '').', '.($request->school?->country ?? ''), ', '),
                'window' => $request->requested_window,
                'groupSize' => $request->group_size,
                'region' => $request->school?->region ?: $request->recipientSchool?->location,
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
        $user = User::find($userId);
        $position = (int) SchoolItineraryItem::where('user_id', $userId)->max('position');

        VisitRequest::query()
            ->where(function ($query) use ($userId, $user): void {
                $query->where('requested_by_user_id', $userId);
                if ($user?->school_id) {
                    $query->orWhere('school_id', $user->school_id);
                }
            })
            ->whereNotNull('campus_event_id')
            ->whereIn('status', ['approved', 'scheduled'])
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
                'schoolId' => $user->school_id,
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
            ->with(['user:id,name,role', 'event:id,title,university_user_id,starts_at,venue,location'])
            ->when($user->role === 'university', fn ($query) => $query
                ->where(function ($builder) use ($user): void {
                    $builder->where('user_id', $user->id)
                        ->orWhereHas('event', fn ($eventQuery) => $eventQuery->where('university_user_id', $user->id))
                        ->orWhere(function ($outbound) use ($user): void {
                            $outbound->where('target_type', 'outbound_contact')
                                ->where('target_id', $user->id);
                        });
                }))
            ->when(! $user->isAdmin() && $user->role !== 'university', fn ($query) => $query->where('user_id', $user->id))
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (PlatformNotification $message) => [
                'id' => $message->id,
                'recipient' => $message->user?->name,
                'role' => $message->user?->role,
                'eventId' => $message->campus_event_id,
                'event' => $message->event?->title,
                'eventDate' => $message->event?->starts_at?->toIso8601String(),
                'notificationType' => $message->notification_type,
                'targetType' => $message->target_type,
                'targetId' => $message->target_id,
                'subject' => $message->subject,
                'body' => $message->body,
                'channel' => $message->channel,
                'status' => $message->status,
                'retryCount' => (int) $message->retry_count,
                'scheduledFor' => $message->scheduled_for?->toIso8601String(),
                'sentAt' => $message->sent_at?->toIso8601String(),
                'lastAttemptAt' => $message->last_attempt_at?->toIso8601String(),
                'failureReason' => $message->failure_reason,
                'metadata' => $message->metadata ?: [],
                'createdAt' => $message->created_at?->toIso8601String(),
            ])
            ->toArray();
    }

    private function admissionPrograms(User $user): array
    {
        $query = InstitutionProgram::query()
            ->with(['university:id,name', 'school:id,name,location'])
            ->withCount(['applications' => fn ($applications) => $applications->whereNotNull('submitted_at')]);

        if ($user->role === 'university') {
            $query->where('university_user_id', $user->id);
        } elseif ($user->isSchool()) {
            if (! $user->school_id) {
                return [];
            }
            $query->where('school_id', $user->school_id);
        } elseif ($user->role === 'student') {
            $query->where('status', 'published')
                ->where(fn ($deadline) => $deadline->whereNull('application_deadline')->orWhere('application_deadline', '>=', now()));
        } elseif (! $user->isAdmin()) {
            return [];
        }

        return $query->orderBy('name')->limit(250)->get()->map(fn (InstitutionProgram $program) => [
            'id' => $program->id,
            'institutionType' => $program->institution_type,
            'universityUserId' => $program->university_user_id,
            'schoolId' => $program->school_id,
            'institutionName' => $program->institutionName(),
            'name' => $program->name,
            'code' => $program->code,
            'level' => $program->level,
            'description' => $program->description,
            'requirements' => $program->requirements,
            'location' => $program->location ?: $program->school?->location,
            'deadline' => $program->application_deadline?->toIso8601String(),
            'fee' => (float) $program->application_fee,
            'currency' => $program->currency,
            'capacity' => $program->capacity,
            'status' => $program->status,
            'applicationsCount' => (int) $program->applications_count,
        ])->toArray();
    }

    private function admissionApplications(User $user): array
    {
        $query = AdmissionApplication::query()
            ->with([
                'student:id,name,email,school_id',
                'program.university:id,name',
                'program.school:id,name,location',
                'documents:id,student_user_id,admission_application_id,category,original_name,mime_type,size,status,created_at',
                'payments:id,admission_application_id,reference,amount,currency,status,paid_at,created_at',
            ]);

        if ($user->role === 'student') {
            $query->where('student_user_id', $user->id);
        } elseif ($user->role === 'university') {
            $query->whereNotNull('submitted_at')
                ->where('status', '!=', 'draft')
                ->whereHas('program', fn ($program) => $program->where('university_user_id', $user->id));
        } elseif ($user->isSchool()) {
            if (! $user->school_id) {
                return [];
            }
            $query->whereNotNull('submitted_at')
                ->where('status', '!=', 'draft')
                ->whereHas('program', fn ($program) => $program->where('school_id', $user->school_id));
        } elseif (! $user->isAdmin()) {
            return [];
        } else {
            $query->whereNotNull('submitted_at')->where('status', '!=', 'draft');
        }

        return $query->latest()->limit(500)->get()->map(fn (AdmissionApplication $application) => [
            'id' => $application->id,
            'reference' => $application->reference,
            'status' => $application->status,
            'student' => [
                'id' => $application->student?->id,
                'name' => $application->student?->name,
                'email' => $application->student?->email,
            ],
            'program' => [
                'id' => $application->program?->id,
                'name' => $application->program?->name,
                'code' => $application->program?->code,
                'institutionName' => $application->program?->institutionName(),
                'fee' => (float) ($application->program?->application_fee ?? 0),
                'currency' => $application->program?->currency ?: 'NGN',
            ],
            'personalStatement' => $application->personal_statement,
            'academicSummary' => $application->academic_summary,
            'decisionNote' => $application->decision_note,
            'submittedAt' => $application->submitted_at?->toIso8601String(),
            'reviewedAt' => $application->reviewed_at?->toIso8601String(),
            'documents' => $application->documents->map(fn (StudentDocument $document) => [
                'id' => $document->id,
                'category' => $document->category,
                'name' => $document->original_name,
                'mimeType' => $document->mime_type,
                'size' => (int) $document->size,
                'status' => $document->status,
                'previewUrl' => route('student.documents.preview', $document),
                'downloadUrl' => route('student.documents.download', $document),
            ])->toArray(),
            'payments' => $application->payments->map(fn (ApplicationPayment $payment) => [
                'id' => $payment->id,
                'reference' => $payment->reference,
                'amount' => (float) $payment->amount,
                'currency' => $payment->currency,
                'status' => $payment->status,
                'paidAt' => $payment->paid_at?->toIso8601String(),
                'receiptUrl' => $payment->status === 'paid' ? route('application-payments.receipt', $payment) : null,
                'receiptDownloadUrl' => $payment->status === 'paid' ? route('application-payments.receipt.download', $payment) : null,
            ])->toArray(),
            'createdAt' => $application->created_at?->toIso8601String(),
        ])->toArray();
    }

    private function studentPortfolio(User $user): array
    {
        if ($user->role !== 'student') {
            return [];
        }

        return [
            'academicRecords' => StudentAcademicRecord::query()
                ->where('student_user_id', $user->id)
                ->latest()
                ->get()
                ->map(fn (StudentAcademicRecord $record) => [
                    'id' => $record->id,
                    'institutionName' => $record->institution_name,
                    'qualification' => $record->qualification,
                    'graduationYear' => $record->graduation_year,
                    'gpa' => $record->gpa,
                    'resultSummary' => $record->result_summary,
                ])->toArray(),
            'documents' => StudentDocument::query()
                ->where('student_user_id', $user->id)
                ->with('application:id,reference,status')
                ->latest()
                ->get()
                ->map(fn (StudentDocument $document) => [
                    'id' => $document->id,
                    'applicationId' => $document->admission_application_id,
                    'applicationReference' => $document->application?->reference,
                    'category' => $document->category,
                    'name' => $document->original_name,
                    'mimeType' => $document->mime_type,
                    'size' => (int) $document->size,
                    'status' => $document->status,
                    'previewUrl' => route('student.documents.preview', $document),
                    'downloadUrl' => route('student.documents.download', $document),
                    'createdAt' => $document->created_at?->toIso8601String(),
                ])->toArray(),
        ];
    }

    private function notificationFeed(User $user): array
    {
        $items = PlatformNotification::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (PlatformNotification $notification) => [
                'id' => $notification->id,
                'type' => $notification->notification_type,
                'subject' => $notification->subject,
                'body' => $notification->body,
                'status' => $notification->status,
                'readAt' => $notification->read_at?->toIso8601String(),
                'unread' => $notification->read_at === null,
                'createdAt' => $notification->created_at?->toIso8601String(),
            ])->toArray();

        return [
            'items' => $items,
            'unreadCount' => collect($items)->where('unread', true)->count(),
        ];
    }

    private function contentManagement(User $user): array
    {
        $audience = $user->isSchool() ? 'school' : $user->role;
        $announcements = Announcement::query()
            ->when(! $user->isAdmin(), fn ($query) => $query
                ->where('status', 'published')
                ->whereIn('audience', ['all', $audience])
                ->where(fn ($expiry) => $expiry->whereNull('expires_at')->orWhere('expires_at', '>', now())))
            ->latest('published_at')
            ->limit($user->isAdmin() ? 200 : 20)
            ->get()
            ->map(fn (Announcement $announcement) => [
                'id' => $announcement->id,
                'audience' => $announcement->audience,
                'title' => $announcement->title,
                'body' => $announcement->body,
                'status' => $announcement->status,
                'publishedAt' => $announcement->published_at?->toIso8601String(),
                'expiresAt' => $announcement->expires_at?->toIso8601String(),
            ])->toArray();

        $faqs = Faq::query()
            ->when(! $user->isAdmin(), fn ($query) => $query->where('is_published', true)->whereIn('audience', ['all', $audience]))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->limit(250)
            ->get()
            ->map(fn (Faq $faq) => [
                'id' => $faq->id,
                'audience' => $faq->audience,
                'question' => $faq->question,
                'answer' => $faq->answer,
                'sortOrder' => $faq->sort_order,
                'isPublished' => (bool) $faq->is_published,
            ])->toArray();

        return [
            'announcements' => $announcements,
            'faqs' => $faqs,
            'emailTemplates' => $user->isAdmin()
                ? EmailTemplate::query()->orderBy('name')->get()->map(fn (EmailTemplate $template) => [
                    'id' => $template->id,
                    'key' => $template->key,
                    'name' => $template->name,
                    'subject' => $template->subject,
                    'body' => $template->body,
                    'enabled' => (bool) $template->enabled,
                ])->toArray()
                : [],
        ];
    }

    private function attendanceRateForUniversity(int $universityUserId): int
    {
        $registrations = EventRegistration::query()
            ->whereHas('event', fn ($event) => $event->where('university_user_id', $universityUserId))
            ->where('status', 'confirmed');
        $total = (int) (clone $registrations)->sum('party_size');

        if ($total === 0) {
            return 0;
        }

        $attended = (int) (clone $registrations)->whereNotNull('attended_at')->sum('party_size');

        return (int) round(($attended / $total) * 100);
    }

    private function scheduledReminderTime(CampusEvent $event): Carbon
    {
        $startsAt = $event->starts_at ?: now()->addDay();
        $date = $startsAt->copy()->subDays((int) ($event->reminder_days_before ?? 7));
        [$hour, $minute] = array_pad(explode(':', (string) ($event->reminder_time ?: '09:00')), 2, 0);

        return $date->setTime((int) $hour, (int) $minute);
    }

    private function noticeBody(string $type, CampusEvent $event, ?string $recipientName = null): string
    {
        $name = $recipientName ?: 'there';
        $date = $event->starts_at?->format('M j, Y g:i A') ?: 'the scheduled visit time';
        $place = trim(($event->venue ?: '').' '.($event->location ?: '')) ?: 'campus';

        return match ($type) {
            'cancellation' => "Hi {$name}, {$event->title} has been cancelled. We will share the next available visit option once confirmed.",
            'update' => "Hi {$name}, there is an update for {$event->title}. The visit is scheduled for {$date} at {$place}. Please review your visit details.",
            default => "Hi {$name}, this is a reminder for {$event->title} on {$date} at {$place}. Please confirm logistics with your coordinator before arrival.",
        };
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
            'coordinatorPhone' => $school->coordinator_phone,
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

    private function ensureDemoVisitForStudent(User $user): void
    {
        if ($user->role !== 'student' || (! $user->is_demo && $user->email !== 'student@scalecampuslab.test')) {
            return;
        }

        $hasVisit = EventRegistration::query()->where('user_id', $user->id)->exists()
            || EventRegistrationStudent::query()
                ->where(fn ($query) => $query->where('user_id', $user->id)->orWhere('email', $user->email))
                ->exists();

        if ($hasVisit) {
            return;
        }

        $event = CampusEvent::query()
            ->where('status', 'published')
            ->orderBy('starts_at')
            ->first();

        if (! $event) {
            return;
        }

        $schoolUser = User::query()
            ->whereIn('role', ['school', 'high_school'])
            ->first();

        if ($schoolUser && ! $user->school_id && $schoolUser->school_id) {
            $user->update(['school_id' => $schoolUser->school_id]);
        }

        $registration = EventRegistration::updateOrCreate(
            [
                'campus_event_id' => $event->id,
                'registrant_email' => $schoolUser?->email ?: 'school-demo@scalecampuslab.test',
            ],
            [
                'user_id' => $schoolUser?->id,
                'registrant_name' => $schoolUser?->name ?: 'School Demo Group',
                'registrant_type' => 'school_group',
                'party_size' => 1,
                'status' => 'confirmed',
                'consent_status' => 'received',
                'is_minor' => true,
                'is_demo' => true,
            ]
        );

        $registration->students()->updateOrCreate(
            ['email' => $user->email],
            [
                'user_id' => $user->id,
                'name' => $user->name,
                'student_identifier' => $user->student_identifier,
                'grade_level' => $user->grade_level ?: '12th',
                'interest_major' => $user->interest_major ?: 'Campus Visit',
                'status' => 'confirmed',
                'consent_status' => 'received',
                'is_minor' => true,
            ]
        );
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
        $range = request('range', '90');
        $end = request('end_date') ? Carbon::parse(request('end_date'))->endOfDay() : now()->endOfDay();
        $start = request('start_date')
            ? Carbon::parse(request('start_date'))->startOfDay()
            : match ($range) {
                '30' => $end->copy()->subDays(30)->startOfDay(),
                '180' => $end->copy()->subDays(180)->startOfDay(),
                '365' => $end->copy()->subDays(365)->startOfDay(),
                default => $end->copy()->subDays(90)->startOfDay(),
            };
        $rangeDays = max(1, $start->diffInDays($end));
        $previousStart = $start->copy()->subDays($rangeDays + 1);
        $previousEnd = $start->copy()->subSecond();

        $allEvents = CampusEvent::query()->where('university_user_id', $user->id);
        $events = (clone $allEvents)->whereBetween('starts_at', [$start, $end]);
        $allEventIds = (clone $allEvents)->pluck('id');
        $eventIds = (clone $events)->pluck('id');
        $registrations = EventRegistration::query()->whereIn('campus_event_id', $eventIds);
        $allRegistrations = EventRegistration::query()->whereIn('campus_event_id', $allEventIds);
        $confirmedSeats = (int) (clone $registrations)->where('status', 'confirmed')->sum('party_size');
        $attendedSeats = (int) (clone $registrations)->whereNotNull('attended_at')->sum('party_size');
        $waitlistedSeats = (int) (clone $registrations)->where('status', 'waitlisted')->sum('party_size');
        $capacity = max(1, (int) (clone $events)->where('status', 'published')->sum('capacity'));
        $applications = AdmissionApplication::query()
            ->whereNotNull('submitted_at')
            ->whereBetween('submitted_at', [$start, $end])
            ->whereHas('program', fn ($query) => $query->where('university_user_id', $user->id))
            ->count();
        $conversionRate = $confirmedSeats > 0 ? round(($applications / $confirmedSeats) * 100, 1) : 0;
        $attendanceRate = $confirmedSeats > 0 ? round(($attendedSeats / $confirmedSeats) * 100, 1) : 0;
        $avgQuality = round((float) VisitArchive::query()->whereBetween('visited_on', [$start, $end])->avg('quality_score'), 1);
        $topProgram = (clone $events)
            ->withSum(['registrations as confirmed_seats' => fn ($query) => $query->where('status', 'confirmed')], 'party_size')
            ->orderByDesc('confirmed_seats')
            ->first();
        $capacityUsage = round(($confirmedSeats / $capacity) * 100, 1);
        $dataCoverage = $this->confidenceScore((clone $events)->count(), (clone $registrations)->count(), $applications);
        $operationalScore = (int) round((min(100, $attendanceRate) + min(100, $capacityUsage) + min(100, $conversionRate)) / 3);
        $riskLevel = $waitlistedSeats > 0 ? 'high' : ((clone $events)->count() === 0 ? 'medium' : 'low');
        $recommendedAction = $waitlistedSeats > 0
            ? 'Review capacity or add another visit session for waitlisted students.'
            : ((clone $events)->count() === 0
                ? 'Publish a visit program to begin measuring recruitment performance.'
                : 'Continue monitoring attendance and application conversion.');
        $schoolProgramFunnel = $this->universitySchoolProgramFunnel($user, $start, $end);
        $cycleComparisons = $this->universityCycleComparisons($user, $start, $end, $previousStart, $previousEnd);
        $savedInsights = RecruitmentInsight::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(12)
            ->get()
            ->map(fn (RecruitmentInsight $insight) => [
                'id' => $insight->id,
                'title' => $insight->title,
                'body' => $insight->body,
                'type' => $insight->type,
                'status' => $insight->status,
                'score' => $insight->score,
                'createdAt' => $insight->created_at?->toIso8601String(),
            ])
            ->toArray();

        return [
            'role' => 'university',
            'title' => 'Recruitment Intelligence',
            'subtitle' => 'Live recruitment analytics built from your visit programs, attendee records, applications, and school engagement.',
            'cycle' => $start->format('M j').' - '.$end->format('M j, Y'),
            'dateRange' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'range' => $range,
            ],
            'totalVisits' => (clone $events)->count(),
            'leadsCaptured' => VisitArchive::query()->whereBetween('visited_on', [$start, $end])->sum('leads_captured'),
            'averageQuality' => $avgQuality,
            'engagementAverage' => $attendanceRate,
            'modelConfidence' => $dataCoverage,
            'activeVariables' => collect([(clone $events)->count(), (clone $registrations)->count(), $applications])->filter(fn ($value) => $value > 0)->count(),
            'kpis' => [
                ['label' => 'Total visits', 'value' => number_format((clone $events)->count()), 'trend' => $this->trendLabel((clone $events)->count(), (clone $allEvents)->whereBetween('starts_at', [$previousStart, $previousEnd])->count())],
                ['label' => 'Booked students', 'value' => number_format($confirmedSeats), 'trend' => $confirmedSeats.' confirmed seats'],
                ['label' => 'Application conv.', 'value' => $conversionRate.'%', 'trend' => $applications.' applications'],
                ['label' => 'Capacity usage', 'value' => $capacityUsage.'%', 'trend' => $waitlistedSeats.' waitlisted seats'],
            ],
            'funnel' => [
                ['label' => 'Registered', 'value' => $confirmedSeats + $waitlistedSeats, 'rate' => 100],
                ['label' => 'Confirmed', 'value' => $confirmedSeats, 'rate' => $this->percentage($confirmedSeats, $confirmedSeats + $waitlistedSeats)],
                ['label' => 'Attended', 'value' => $attendedSeats, 'rate' => $this->percentage($attendedSeats, $confirmedSeats)],
                ['label' => 'Applications', 'value' => $applications, 'rate' => $this->percentage($applications, $confirmedSeats)],
            ],
            'trend' => $this->registrationTrend($allRegistrations, 'party_size'),
            'schoolProgramFunnel' => $schoolProgramFunnel,
            'cycleComparisons' => $cycleComparisons,
            'savedInsights' => $savedInsights,
            'predictiveScore' => [
                'score' => $operationalScore,
                'confidence' => $dataCoverage / 100,
                'signals' => [
                    'visit_programs' => (clone $events)->count(),
                    'registration_records' => (clone $registrations)->count(),
                    'submitted_applications' => $applications,
                ],
                'engagementProbability' => $attendanceRate,
                'riskLevel' => $riskLevel,
                'recommendedAction' => $recommendedAction,
            ],
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
                ['title' => 'High conversion program', 'body' => $topProgram ? "{$topProgram->title} is your strongest demand signal with ".(int) ($topProgram->confirmed_seats ?? 0).' confirmed seats.' : 'Create a published visit program to begin conversion ranking.', 'tone' => 'success', 'type' => 'opportunity', 'score' => (int) ($topProgram?->confirmed_seats ?? 0)],
                ['title' => 'Capacity pressure', 'body' => $waitlistedSeats > 0 ? "{$waitlistedSeats} seats are waitlisted. Add capacity or open another session before demand cools." : 'No waitlist pressure is currently detected across your published programs.', 'tone' => $waitlistedSeats > 0 ? 'warning' : 'neutral', 'type' => $waitlistedSeats > 0 ? 'risk' : 'recommendation', 'score' => min(100, $waitlistedSeats)],
                ['title' => 'Recruitment signal score', 'body' => "The current data-derived score is {$operationalScore}/100 with {$attendanceRate}% attendance. {$recommendedAction}", 'tone' => 'info', 'type' => 'recommendation', 'score' => $operationalScore],
                ['title' => 'Attendance quality', 'body' => "Attendance is {$attendanceRate}% and archived visit quality averages {$avgQuality}/5.", 'tone' => 'info', 'type' => 'recommendation', 'score' => (int) $attendanceRate],
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
            'activeVariables' => collect([$studentCount, (clone $registrations)->count(), (clone $requests)->count()])->filter(fn ($value) => $value > 0)->count(),
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
            'activeVariables' => collect([$confirmed, $waitlisted, $messages])->filter(fn ($value) => $value > 0)->count(),
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
        $applications = AdmissionApplication::query()->whereNotNull('submitted_at')->count();
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
            'activeVariables' => collect([(clone $events)->count(), (clone $registrations)->count(), User::count()])->filter(fn ($value) => $value > 0)->count(),
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

    private function universitySchoolProgramFunnel(User $user, Carbon $start, Carbon $end): array
    {
        $registrations = EventRegistration::query()
            ->with(['event:id,title,university_user_id,starts_at', 'user.school:id,name'])
            ->whereHas('event', fn ($query) => $query
                ->where('university_user_id', $user->id)
                ->whereBetween('starts_at', [$start, $end]))
            ->get();

        return $registrations
            ->groupBy(function (EventRegistration $registration): string {
                $school = $registration->registrant_type === 'school_group'
                    ? $registration->registrant_name
                    : ($registration->user?->school?->name ?: 'Direct students');

                return ($school ?: 'Unassigned school').'|'.($registration->event?->title ?: 'Program TBA');
            })
            ->flatMap(function ($group, string $key) {
                [$school, $program] = array_pad(explode('|', $key, 2), 2, 'Program TBA');
                $registered = (int) $group->sum('party_size');
                $confirmed = (int) $group->where('status', 'confirmed')->sum('party_size');
                $attended = (int) $group->filter(fn (EventRegistration $registration) => $registration->attended_at !== null)->sum('party_size');

                return [
                    [
                        'school' => $school,
                        'program' => $program,
                        'stage' => 'Registered',
                        'value' => $registered,
                        'rate' => 100,
                    ],
                    [
                        'school' => $school,
                        'program' => $program,
                        'stage' => 'Confirmed',
                        'value' => $confirmed,
                        'rate' => $this->percentage($confirmed, $registered),
                    ],
                    [
                        'school' => $school,
                        'program' => $program,
                        'stage' => 'Attended',
                        'value' => $attended,
                        'rate' => $this->percentage($attended, $confirmed),
                    ],
                ];
            })
            ->values()
            ->take(48)
            ->all();
    }

    private function universityCycleComparisons(User $user, Carbon $start, Carbon $end, Carbon $previousStart, Carbon $previousEnd): array
    {
        $build = function (string $label, Carbon $periodStart, Carbon $periodEnd) use ($user): array {
            $eventIds = CampusEvent::query()
                ->where('university_user_id', $user->id)
                ->whereBetween('starts_at', [$periodStart, $periodEnd])
                ->pluck('id');

            $registrations = EventRegistration::query()->whereIn('campus_event_id', $eventIds);
            $registered = (int) (clone $registrations)->sum('party_size');
            $confirmed = (int) (clone $registrations)->where('status', 'confirmed')->sum('party_size');
            $attended = (int) (clone $registrations)->whereNotNull('attended_at')->sum('party_size');
            $applications = AdmissionApplication::query()
                ->whereNotNull('submitted_at')
                ->whereBetween('submitted_at', [$periodStart, $periodEnd])
                ->whereHas('program', fn ($query) => $query->where('university_user_id', $user->id))
                ->count();

            return [
                'label' => $label,
                'period' => $periodStart->format('M j').' - '.$periodEnd->format('M j'),
                'registered' => $registered,
                'confirmed' => $confirmed,
                'attended' => $attended,
                'applications' => $applications,
                'conversion' => $this->percentage($applications, $confirmed),
                'attendanceRate' => $this->percentage($attended, $confirmed),
            ];
        };

        return [
            $build('Previous cycle', $previousStart, $previousEnd),
            $build('Current cycle', $start, $end),
        ];
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
        return round((float) min(100, max(0, array_sum($signals))), 1);
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
