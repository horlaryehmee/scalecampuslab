<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Models\EventItineraryItem;
use App\Models\EventRegistration;
use App\Models\PlatformNotification;
use App\Models\School;
use App\Models\SystemLog;
use App\Models\TargetSchool;
use App\Models\UniversitySetting;
use App\Models\User;
use App\Models\VisitRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CampusEventController extends Controller
{
    public function showShared(string $slug): View
    {
        $event = CampusEvent::query()
            ->withSum(['registrations as confirmed_seats' => fn ($query) => $query->where('status', 'confirmed')], 'party_size')
            ->with('university:id,name,email')
            ->where('share_slug', $slug)
            ->where('status', 'published')
            ->where('visibility', 'public')
            ->firstOrFail();

        return view('app', [
            'page' => 'public-program',
            'props' => [
                'program' => $this->publicProgramPayload($event),
                'registrationStatus' => session('program_registration_status'),
                'registrationMessage' => session('program_registration_message'),
            ],
        ]);
    }

    public function registerShared(Request $request, string $slug): RedirectResponse
    {
        $event = CampusEvent::query()
            ->with('university:id,name,email')
            ->where('share_slug', $slug)
            ->where('status', 'published')
            ->where('visibility', 'public')
            ->firstOrFail();

        abort_unless((bool) $event->guest_registration_enabled, 403);

        $request->session()->put('pending_public_program', [
            'id' => $event->id,
            'slug' => $event->share_slug,
            'title' => $event->title,
            'university' => $event->university?->name,
        ]);

        if ($request->user()?->isSchool()) {
            return $request->user()->school_id
                ? redirect()->route('dashboard.school')->with('status', "{$event->title} has been saved. Add students, then complete the visit registration from your dashboard.")
                : redirect()->route('school.onboarding');
        }

        return redirect()->route('programs.public.join', $event->share_slug);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $validated = $this->validatedEvent($request, true);

        if ($this->hasVenueConflict($validated)) {
            return back()->withErrors(['venue' => 'This venue already has an event at that start time.'])->withInput();
        }

        $event = CampusEvent::create($validated + [
            'university_user_id' => $request->user()->id,
            'external_calendar_uid' => (string) Str::uuid(),
            'share_slug' => $this->uniqueShareSlug($validated['title']),
            'lifecycle_log' => [$this->lifecycleEntry('created', $request->user()->name)],
        ]);

        $this->createRecurringEvents($request, $event, $validated);
        $this->logProgramActivity($request, 'program.created', $event, [
            'status' => $event->status,
            'visibility' => $event->visibility,
            'starts_at' => $event->starts_at?->toIso8601String(),
        ]);

        return back()->with('status', 'Campus visit event created.');
    }

    public function update(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $this->validatedEvent($request, false);

        if ($this->hasVenueConflict($validated, $event->id)) {
            return back()->withErrors(['venue' => 'This venue already has an overlapping event.'])->withInput();
        }

        $scheduleChanged = $event->starts_at?->ne($validated['starts_at']) || (string) $event->ends_at !== (string) ($validated['ends_at'] ?? null) || $event->venue !== $validated['venue'];

        $event->update($validated + [
            'last_schedule_change_at' => $scheduleChanged ? now() : $event->last_schedule_change_at,
            'external_calendar_uid' => $event->external_calendar_uid ?: (string) Str::uuid(),
            'share_slug' => $event->share_slug ?: $this->uniqueShareSlug($validated['title'], $event->id),
            'lifecycle_log' => $this->appendLifecycle($event, 'updated', $request->user()->name),
        ]);

        if ($scheduleChanged) {
            $this->queueScheduleChangeNotifications($event);
        }

        $this->logProgramActivity($request, 'program.updated', $event, [
            'status' => $event->status,
            'visibility' => $event->visibility,
            'schedule_changed' => $scheduleChanged,
        ]);

        return back()->with('status', 'Event updated successfully.');
    }

    public function updateStatus(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['draft', 'published', 'cancelled'])],
        ]);

        if ($event->status === 'cancelled' && $validated['status'] !== 'cancelled') {
            return back()->withErrors(['status' => 'Cancelled visit programs cannot be reopened. Duplicate the program to create a new schedule.']);
        }

        if ($event->status === $validated['status']) {
            return back()->with('status', 'Visit program status is already up to date.');
        }

        $previousStatus = $event->status;
        $event->update([
            'status' => $validated['status'],
            'lifecycle_stage' => match ($validated['status']) {
                'published' => 'open',
                'cancelled' => 'archived',
                default => 'planning',
            },
            'lifecycle_log' => $this->appendLifecycle($event, 'status changed from '.$previousStatus.' to '.$validated['status'], $request->user()->name),
        ]);

        $this->queueStatusChangeNotifications($event, $previousStatus);
        $this->logProgramActivity($request, 'program.status_updated', $event, [
            'previous_status' => $previousStatus,
            'status' => $event->status,
        ]);

        return back()->with('status', 'Visit program status updated to '.$event->status.'.');
    }

    public function schedule(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $request->validate([
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'venue' => ['required', 'string', 'max:160'],
            'location' => ['nullable', 'string', 'max:180'],
        ]);

        $payload = array_merge($event->only([
            'title',
            'description',
            'capacity',
            'per_school_capacity',
            'per_group_capacity',
            'status',
            'visibility',
            'registration_opens_at',
            'registration_closes_at',
            'lifecycle_stage',
        ]), $validated);

        if ($this->hasVenueConflict($payload, $event->id)) {
            return back()->withErrors(['schedule' => 'This time slot conflicts with another visit at the same venue.']);
        }

        $event->update($validated + [
            'last_schedule_change_at' => now(),
            'external_calendar_uid' => $event->external_calendar_uid ?: (string) Str::uuid(),
            'lifecycle_log' => $this->appendLifecycle($event, 'rescheduled', $request->user()->name),
        ]);

        $this->queueScheduleChangeNotifications($event);
        $this->logProgramActivity($request, 'program.rescheduled', $event, [
            'starts_at' => $event->starts_at?->toIso8601String(),
            'ends_at' => $event->ends_at?->toIso8601String(),
            'venue' => $event->venue,
        ]);

        return back()->with('status', 'Visit schedule updated and reminders queued.');
    }

    public function calendarExport(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->role === 'university', 403);

        $events = CampusEvent::query()
            ->where('university_user_id', $request->user()->id)
            ->where('status', '!=', 'cancelled')
            ->orderBy('starts_at')
            ->get();

        return response()->streamDownload(function () use ($events): void {
            echo "BEGIN:VCALENDAR\r\n";
            echo "VERSION:2.0\r\n";
            echo "PRODID:-//ScaleCampusLab//Campus Visits//EN\r\n";
            foreach ($events as $event) {
                echo "BEGIN:VEVENT\r\n";
                echo 'UID:'.($event->external_calendar_uid ?: 'campus-event-'.$event->id.'@scalecampuslab')."\r\n";
                echo 'DTSTAMP:'.now()->utc()->format('Ymd\THis\Z')."\r\n";
                echo 'DTSTART:'.$event->starts_at?->copy()->utc()->format('Ymd\THis\Z')."\r\n";
                echo 'DTEND:'.($event->ends_at ?: $event->starts_at?->copy()->addHour())->copy()->utc()->format('Ymd\THis\Z')."\r\n";
                echo 'SUMMARY:'.$this->icsEscape($event->title)."\r\n";
                echo 'LOCATION:'.$this->icsEscape(trim(($event->venue ?: '').' '.($event->location ?: '')))."\r\n";
                echo 'DESCRIPTION:'.$this->icsEscape($event->description ?: 'Campus visit program')."\r\n";
                echo "END:VEVENT\r\n";
            }
            echo "END:VCALENDAR\r\n";
        }, 'scalecampuslab-university-calendar.ics', ['Content-Type' => 'text/calendar']);
    }

    public function duplicate(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $copy = $event->replicate([
            'confirmed_seats',
            'created_at',
            'updated_at',
        ]);
        $copy->title = $event->title.' (Copy)';
        $copy->status = 'draft';
        $copy->visibility = 'private';
        $copy->lifecycle_stage = 'planning';
        $copy->starts_at = $event->starts_at?->copy()->addWeek();
        $copy->ends_at = $event->ends_at?->copy()->addWeek();
        $copy->registration_opens_at = $event->registration_opens_at?->copy()->addWeek();
        $copy->registration_closes_at = $event->registration_closes_at?->copy()->addWeek();
        $copy->invited_school_ids = [];
        $copy->recurrence_parent_id = null;
        $copy->recurrence_rule = 'none';
        $copy->recurrence_count = 1;
        $copy->external_calendar_uid = (string) Str::uuid();
        $copy->share_slug = $this->uniqueShareSlug($copy->title);
        $copy->last_schedule_change_at = null;
        $copy->lifecycle_log = [$this->lifecycleEntry('duplicated from #'.$event->id, $request->user()->name)];
        $copy->save();

        $this->logProgramActivity($request, 'program.duplicated', $copy, [
            'source_program_id' => $event->id,
        ]);

        return back()->with('status', 'Visit program duplicated as a draft.');
    }

    public function inviteSchools(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);

        $validated = $request->validate([
            'school_ids' => ['required', 'array', 'min:1'],
            'school_ids.*' => ['integer'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $requestedSchoolIds = collect($validated['school_ids'])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
        $schoolIds = TargetSchool::query()
            ->whereIn('id', $requestedSchoolIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if (count($schoolIds) !== $requestedSchoolIds->count()) {
            throw ValidationException::withMessages([
                'school_ids' => 'One or more selected schools are unavailable.',
            ]);
        }

        DB::transaction(function () use ($request, $event, $schoolIds, $validated): void {
            foreach ($schoolIds as $schoolId) {
                VisitRequest::updateOrCreate(
                    [
                        'target_school_id' => $schoolId,
                        'campus_event_id' => $event->id,
                    ],
                    [
                        'requested_by_user_id' => $request->user()->id,
                        'requested_window' => $event->starts_at?->toDateString() ?: now()->addWeek()->toDateString(),
                        'group_size' => min((int) ($event->per_group_capacity ?: 30), (int) $event->capacity),
                        'status' => 'requested',
                        'priority' => 2,
                        'notes' => $validated['message'] ?: 'Invitation sent by '.$request->user()->name,
                    ]
                );
            }

            $event->update([
                'visibility' => $event->visibility === 'public' ? 'public' : 'invite_only',
                'lifecycle_stage' => 'inviting',
                'invited_school_ids' => array_values(array_unique(array_merge($event->invited_school_ids ?: [], $schoolIds))),
                'lifecycle_log' => $this->appendLifecycle($event, 'invited '.count($schoolIds).' school(s)', $request->user()->name),
            ]);
        });

        $this->logProgramActivity($request, 'program.schools_invited', $event, [
            'school_ids' => $schoolIds,
            'school_count' => count($schoolIds),
        ]);

        return back()->with('status', count($schoolIds).' school invitation(s) queued.');
    }

    public function destroy(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless($event->university_user_id === $request->user()?->id, 403);
        $hasWorkflowData = VisitRequest::query()->where('campus_event_id', $event->id)->exists()
            || EventRegistration::query()->where('campus_event_id', $event->id)->exists()
            || EventItineraryItem::query()->where('campus_event_id', $event->id)->exists();
        abort_if($hasWorkflowData, 409, 'Cancel events with visit activity instead of deleting them.');

        $this->logProgramActivity($request, 'program.deleted', $event, [
            'title' => $event->title,
            'starts_at' => $event->starts_at?->toIso8601String(),
        ]);
        $event->delete();

        return back()->with('status', 'Event deleted successfully.');
    }

    public function register(Request $request, CampusEvent $event): RedirectResponse
    {
        abort_unless(in_array($request->user()?->role, ['student', 'school', 'high_school'], true), 403);
        abort_unless($event->status === 'published', 404);

        $registration = $this->storeProgramRegistration($request, $event, false);

        return back()->with('status', $registration->status === 'confirmed'
            ? 'Registration confirmed.'
            : 'The event is full, so this registration was added to the waitlist.');
    }

    private function validatedEvent(Request $request, bool $isCreating): array
    {
        $request->merge([
            'visibility' => $request->input('visibility', 'public'),
            'guest_registration_enabled' => $request->boolean('guest_registration_enabled', true),
            'lifecycle_stage' => $request->input('lifecycle_stage', $request->input('status') === 'published' ? 'open' : 'planning'),
            'recurrence_rule' => $request->input('recurrence_rule', 'none'),
            'recurrence_count' => $request->input('recurrence_count', 1),
            'reminders_enabled' => $request->boolean('reminders_enabled', true),
            'reminder_days_before' => $request->input('reminder_days_before', 7),
            'reminder_time' => $request->input('reminder_time', '09:00'),
        ]);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'starts_at' => ['required', 'date', $isCreating ? 'after:now' : 'nullable'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'venue' => ['required', 'string', 'max:160'],
            'location' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'about' => ['nullable', 'string', 'max:220'],
            'detailed_description' => ['nullable', 'string', 'max:8000'],
            'audience' => ['nullable', 'string', 'max:2000'],
            'agenda' => ['nullable', 'string', 'max:4000'],
            'requirements' => ['nullable', 'string', 'max:3000'],
            'contact_details' => ['nullable', 'string', 'max:2000'],
            'contact_name' => ['nullable', 'string', 'max:160'],
            'contact_title' => ['nullable', 'string', 'max:160'],
            'contact_email' => ['nullable', 'email:rfc', 'max:160'],
            'contact_phone' => ['nullable', 'string', 'max:80'],
            'contact_office' => ['nullable', 'string', 'max:180'],
            'contact_website' => ['nullable', 'url', 'max:2048'],
            'hero_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'hero_image_alt' => ['nullable', 'string', 'max:180'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'video_title' => ['nullable', 'string', 'max:180'],
            'capacity' => ['required', 'integer', 'min:1', 'max:5000'],
            'per_school_capacity' => ['nullable', 'integer', 'min:1', 'lte:capacity'],
            'per_group_capacity' => ['nullable', 'integer', 'min:1', 'lte:capacity'],
            'status' => ['required', Rule::in(['draft', 'published', 'cancelled'])],
            'visibility' => ['required', Rule::in(['public', 'invite_only', 'private'])],
            'guest_registration_enabled' => ['nullable', 'boolean'],
            'registration_opens_at' => ['nullable', 'date'],
            'registration_closes_at' => ['nullable', 'date', 'after_or_equal:registration_opens_at', 'before_or_equal:starts_at'],
            'lifecycle_stage' => ['required', Rule::in(['planning', 'inviting', 'open', 'full', 'in_progress', 'completed', 'archived'])],
            'recurrence_rule' => ['nullable', Rule::in(['none', 'daily', 'weekly', 'monthly'])],
            'recurrence_count' => ['nullable', 'integer', 'min:1', 'max:24'],
            'reminders_enabled' => ['nullable', 'boolean'],
            'reminder_days_before' => ['required', 'integer', 'min:0', 'max:60'],
            'reminder_time' => ['required', 'date_format:H:i'],
        ]);

        foreach (['description', 'detailed_description', 'audience', 'agenda', 'requirements', 'contact_details'] as $field) {
            $validated[$field] = $this->cleanRichText($validated[$field] ?? null);
        }

        if (! empty($validated['video_url'])) {
            $validated['video_url'] = $this->normalizeExternalUrl($validated['video_url']);
        }

        if ($request->hasFile('hero_image')) {
            $validated['hero_image_url'] = $this->storePublicProgramImage($request->file('hero_image'));
        }

        $validated['gallery_image_urls'] = null;
        unset($validated['hero_image']);

        $validated = $this->withUniversityContactDefaults($request, $validated);

        return $validated;
    }

    private function storePublicProgramImage(\Illuminate\Http\UploadedFile $image): string
    {
        $path = Storage::disk('public')->putFile('programs', $image);

        return '/storage/'.ltrim((string) $path, '/');
    }

    private function normalizeExternalUrl(string $value): string
    {
        $url = trim($value);

        return preg_match('/^https?:\/\//i', $url) ? $url : 'https://'.$url;
    }

    private function withUniversityContactDefaults(Request $request, array $validated): array
    {
        $user = $request->user();
        if (! $user) {
            return $validated;
        }

        $settings = UniversitySetting::query()
            ->where('university_user_id', $user->id)
            ->first();

        $defaults = [
            'contact_name' => $settings?->primary_contact_name ?: $user->name,
            'contact_title' => $settings?->institution_name ? 'Admissions / outreach office' : null,
            'contact_email' => $settings?->primary_contact_email ?: $user->email,
            'contact_phone' => $settings?->primary_contact_phone ?: $user->phone,
            'contact_office' => $settings?->institution_name,
            'contact_website' => $settings?->website,
        ];

        foreach ($defaults as $field => $fallback) {
            if (($validated[$field] ?? null) === null || trim((string) $validated[$field]) === '') {
                $validated[$field] = $fallback;
            }
        }

        return $validated;
    }

    private function cleanRichText(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $allowedTags = '<p><br><strong><b><em><i><u><ul><ol><li><h2><h3><a>';
        $clean = strip_tags($value, $allowedTags);
        $clean = preg_replace('/\s(?:style|class|id|on\w+)=(["\']).*?\1/i', '', $clean) ?? $clean;
        $clean = preg_replace('/href=(["\'])\s*javascript:.*?\1/i', 'href="#"', $clean) ?? $clean;

        return trim($clean) ?: null;
    }

    private function storeProgramRegistration(Request $request, CampusEvent $event, bool $isGuest): EventRegistration
    {
        $user = $request->user();

        $validated = $request->validate($isGuest ? [
            'school_name' => ['required', 'string', 'max:160'],
            'school_location' => ['nullable', 'string', 'max:180'],
            'school_website' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['required', 'string', 'max:160'],
            'contact_email' => ['required', 'email:rfc', 'max:160'],
            'contact_phone' => ['nullable', 'string', 'max:80'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
            'party_size' => ['required', 'integer', 'min:1', 'max:'.max(1, (int) ($event->per_group_capacity ?: 200))],
            'notes' => ['nullable', 'string', 'max:1200'],
        ] : [
            'registrant_name' => [$user?->role === 'student' ? 'nullable' : 'required', 'string', 'max:160'],
            'registrant_email' => [$user?->role === 'student' ? 'nullable' : 'required', 'email:rfc', 'max:160'],
            'party_size' => ['required', 'integer', 'min:1', 'max:'.max(1, (int) ($event->per_group_capacity ?: 200))],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer', 'exists:users,id'],
        ]);

        if ($event->registration_opens_at && now()->lt($event->registration_opens_at)) {
            throw ValidationException::withMessages(['registration' => 'Registration is not open for this visit program yet.']);
        }

        if ($event->registration_closes_at && now()->gt($event->registration_closes_at)) {
            throw ValidationException::withMessages(['registration' => 'Registration has closed for this visit program.']);
        }

        if ($isGuest) {
            if (! empty($validated['school_website'])) {
                $validated['school_website'] = $this->normalizeExternalUrl($validated['school_website']);
            }
            $user = $this->resolvePublicSchoolAccount($validated);
            $validated['registrant_name'] = $validated['school_name'];
            $validated['registrant_email'] = Str::of($validated['contact_email'])->lower()->toString();
            $validated['registrant_type'] = 'school_group';
            $validated['medical_notes'] = collect([
                'External school registration',
                'Contact: '.$validated['contact_name'],
                ! empty($validated['contact_phone']) ? 'Phone: '.$validated['contact_phone'] : null,
                ! empty($validated['notes']) ? 'Notes: '.$validated['notes'] : null,
            ])->filter()->implode("\n");
            unset($validated['school_name'], $validated['school_location'], $validated['school_website'], $validated['contact_name'], $validated['contact_email'], $validated['contact_phone'], $validated['password'], $validated['password_confirmation'], $validated['notes']);
        } elseif ($user?->role === 'student') {
            $validated['registrant_name'] = $validated['registrant_name'] ?: $user->name;
            $validated['registrant_email'] = $validated['registrant_email'] ?: $user->email;
            $validated['party_size'] = 1;
        }

        return DB::transaction(function () use ($request, $event, $validated, $isGuest, $user): EventRegistration {
            $studentIds = collect($validated['student_ids'] ?? [])->map(fn ($id) => (int) $id)->unique()->values();
            if (! $isGuest && $user?->isSchool() && $studentIds->isNotEmpty()) {
                $selectedStudentCount = User::query()
                    ->where('role', 'student')
                    ->where('school_id', $user->school_id)
                    ->whereIn('id', $studentIds)
                    ->count();
                if ($selectedStudentCount > 0) {
                    $validated['party_size'] = $selectedStudentCount;
                }
            }
            unset($validated['student_ids']);

            $event = CampusEvent::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();
            $confirmedSeats = (int) $event->registrations()->where('status', 'confirmed')->sum('party_size');
            $registrantConfirmedSeats = (int) $event->registrations()
                ->where('status', 'confirmed')
                ->where('registrant_email', $validated['registrant_email'])
                ->sum('party_size');
            $status = $event->per_school_capacity && ($registrantConfirmedSeats + (int) $validated['party_size']) > $event->per_school_capacity
                ? 'waitlisted'
                : (($confirmedSeats + (int) $validated['party_size']) <= $event->capacity ? 'confirmed' : 'waitlisted');

            $registration = EventRegistration::updateOrCreate(
                [
                    'campus_event_id' => $event->id,
                    'registrant_email' => $validated['registrant_email'],
                ],
                $validated + [
                    'user_id' => $user?->id,
                    'registrant_type' => $validated['registrant_type'] ?? ($user?->isSchool() ? 'school_group' : 'student'),
                    'status' => $status,
                ]
            );

            if (! $isGuest && $user?->isSchool()) {
                $students = User::query()
                    ->where('role', 'student')
                    ->where('school_id', $user->school_id)
                    ->when($studentIds->isNotEmpty(), fn ($query) => $query->whereIn('id', $studentIds))
                    ->when($studentIds->isEmpty(), fn ($query) => $query->whereJsonContains('assigned_events', $event->title))
                    ->limit((int) $registration->party_size)
                    ->get();

                foreach ($students as $student) {
                    $registration->students()->updateOrCreate(
                        ['email' => $student->email],
                        [
                            'user_id' => $student->id,
                            'name' => $student->name,
                            'student_identifier' => $student->student_identifier,
                            'grade_level' => $student->grade_level,
                            'interest_major' => $student->interest_major,
                            'status' => $status,
                            'consent_status' => 'pending',
                            'is_minor' => true,
                        ]
                    );
                }
            }

            PlatformNotification::create([
                'user_id' => $user?->id,
                'campus_event_id' => $event->id,
                'channel' => 'email',
                'subject' => $status === 'confirmed' ? 'Registration confirmed' : 'Added to waitlist',
                'body' => ($isGuest ? 'External school registration' : 'Your registration')." for {$event->title} is {$status}.",
                'status' => 'queued',
            ]);

            return $registration;
        });
    }

    private function resolvePublicSchoolAccount(array $validated): User
    {
        $email = Str::of($validated['contact_email'])->lower()->trim()->toString();
        $existingUser = User::query()->where('email', $email)->first();

        if ($existingUser) {
            if (! $existingUser->isSchool() || ! Hash::check($validated['password'], $existingUser->password)) {
                throw ValidationException::withMessages([
                    'contact_email' => 'This email is already attached to an account. Use the correct school account password or sign in first.',
                ]);
            }

            Auth::guard('web')->login($existingUser, true);
            request()->session()->regenerate();

            return $existingUser;
        }

        $school = School::query()->updateOrCreate(
            ['coordinator_email' => $email],
            [
                'name' => $validated['school_name'],
                'location' => $validated['school_location'] ?? null,
                'website' => $validated['school_website'] ?? null,
                'coordinator_name' => $validated['contact_name'],
                'coordinator_phone' => $validated['contact_phone'] ?? null,
                'email_notifications' => true,
                'visit_notes' => 'Created from public programme registration.',
            ],
        );

        $user = User::query()->create([
            'name' => $validated['contact_name'],
            'email' => $email,
            'phone' => $validated['contact_phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => 'school',
            'access_status' => 'active',
            'school_id' => $school->id,
            'email_verified_at' => now(),
            'is_demo' => false,
            'two_factor_enabled' => false,
        ]);

        Auth::guard('web')->login($user, true);
        request()->session()->regenerate();

        return $user;
    }

    private function hasVenueConflict(array $event, ?int $ignoreId = null): bool
    {
        $query = CampusEvent::query()
            ->where('venue', $event['venue'])
            ->where('status', '!=', 'cancelled')
            ->when($ignoreId, fn ($builder) => $builder->whereKeyNot($ignoreId));

        if (empty($event['ends_at'])) {
            return $query->where('starts_at', $event['starts_at'])->exists();
        }

        return $query->where(function ($builder) use ($event): void {
            $builder->where('starts_at', $event['starts_at'])
                ->orWhere(function ($overlap) use ($event): void {
                    $overlap->whereNotNull('ends_at')
                        ->where('starts_at', '<', $event['ends_at'])
                        ->where('ends_at', '>', $event['starts_at']);
                });
        })->exists();
    }

    private function lifecycleEntry(string $action, ?string $actor): array
    {
        return [
            'action' => $action,
            'actor' => $actor ?: 'System',
            'at' => now()->toIso8601String(),
        ];
    }

    private function appendLifecycle(CampusEvent $event, string $action, ?string $actor): array
    {
        $log = $event->lifecycle_log ?: [];
        $log[] = $this->lifecycleEntry($action, $actor);

        return array_slice($log, -25);
    }

    private function createRecurringEvents(Request $request, CampusEvent $event, array $validated): void
    {
        $rule = $validated['recurrence_rule'] ?? 'none';
        $count = (int) ($validated['recurrence_count'] ?? 1);

        if ($rule === 'none' || $count <= 1) {
            return;
        }

        for ($index = 2; $index <= $count; $index++) {
            $startsAt = match ($rule) {
                'daily' => $event->starts_at?->copy()->addDays($index - 1),
                'weekly' => $event->starts_at?->copy()->addWeeks($index - 1),
                'monthly' => $event->starts_at?->copy()->addMonthsNoOverflow($index - 1),
                default => null,
            };
            $endsAt = match ($rule) {
                'daily' => $event->ends_at?->copy()->addDays($index - 1),
                'weekly' => $event->ends_at?->copy()->addWeeks($index - 1),
                'monthly' => $event->ends_at?->copy()->addMonthsNoOverflow($index - 1),
                default => null,
            };

            if (! $startsAt || $this->hasVenueConflict(array_merge($validated, ['starts_at' => $startsAt, 'ends_at' => $endsAt]), $event->id)) {
                continue;
            }

            CampusEvent::create(array_merge($validated, [
                'university_user_id' => $request->user()->id,
                'recurrence_parent_id' => $event->id,
                'recurrence_rule' => 'none',
                'recurrence_count' => 1,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'external_calendar_uid' => (string) Str::uuid(),
                'lifecycle_log' => [$this->lifecycleEntry('recurring occurrence from #'.$event->id, $request->user()->name)],
            ]));
        }
    }

    private function queueScheduleChangeNotifications(CampusEvent $event): void
    {
        $event->loadMissing('registrations');

        foreach ($event->registrations as $registration) {
            PlatformNotification::create([
                'user_id' => $registration->user_id,
                'campus_event_id' => $event->id,
                'notification_type' => 'schedule_update',
                'target_type' => 'attendee',
                'target_id' => $registration->id,
                'channel' => 'email',
                'subject' => 'Visit schedule updated',
                'body' => "{$event->title} is now scheduled for ".$event->starts_at?->format('M j, Y g:i A')." at {$event->venue}.",
                'status' => 'queued',
                'scheduled_for' => now(),
                'metadata' => ['source' => 'schedule_change'],
            ]);
        }
    }

    private function queueStatusChangeNotifications(CampusEvent $event, string $previousStatus): void
    {
        $event->loadMissing('registrations');

        foreach ($event->registrations->whereIn('status', ['confirmed', 'waitlisted']) as $registration) {
            PlatformNotification::create([
                'user_id' => $registration->user_id,
                'campus_event_id' => $event->id,
                'notification_type' => 'event_status_update',
                'target_type' => 'event_registration',
                'target_id' => $registration->id,
                'channel' => 'email',
                'subject' => 'Visit program '.$event->status,
                'body' => $event->title.' changed from '.$previousStatus.' to '.$event->status.'.',
                'status' => 'queued',
                'scheduled_for' => now(),
                'metadata' => [
                    'registration_id' => $registration->id,
                    'registrant_email' => $registration->registrant_email,
                    'registrant_name' => $registration->registrant_name,
                ],
            ]);
        }
    }

    private function icsEscape(?string $value): string
    {
        return str_replace(['\\', "\n", "\r", ',', ';'], ['\\\\', '\\n', '', '\\,', '\\;'], (string) $value);
    }

    private function logProgramActivity(Request $request, string $action, CampusEvent $event, array $metadata = []): void
    {
        $user = $request->user();
        if (! $user) {
            return;
        }

        SystemLog::create([
            'user_id' => $user->id,
            'action' => $action,
            'subject_type' => CampusEvent::class,
            'subject_id' => $event->id,
            'metadata' => array_merge([
                'university_user_id' => $event->university_user_id,
                'program_title' => $event->title,
                'ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 180, ''),
            ], $metadata),
        ]);
    }

    private function uniqueShareSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'program';
        $slug = $base;
        $suffix = 2;

        while (CampusEvent::query()
            ->where('share_slug', $slug)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    private function publicProgramPayload(CampusEvent $event): array
    {
        $confirmedSeats = (int) ($event->confirmed_seats ?? $event->registrations()->where('status', 'confirmed')->sum('party_size'));
        $remainingSeats = max(0, (int) $event->capacity - $confirmedSeats);

        return [
            'id' => $event->id,
            'title' => $event->title,
            'university' => $event->university?->name,
            'startsAt' => $event->starts_at?->toIso8601String(),
            'endsAt' => $event->ends_at?->toIso8601String(),
            'registrationOpensAt' => $event->registration_opens_at?->toIso8601String(),
            'registrationClosesAt' => $event->registration_closes_at?->toIso8601String(),
            'venue' => $event->venue,
            'location' => $event->location,
            'description' => $event->description,
            'about' => $event->about,
            'detailedDescription' => $event->detailed_description,
            'audience' => $event->audience,
            'agenda' => $event->agenda,
            'requirements' => $event->requirements,
            'contactDetails' => $event->contact_details,
            'contactName' => $event->contact_name,
            'contactTitle' => $event->contact_title,
            'contactEmail' => $event->contact_email,
            'contactPhone' => $event->contact_phone,
            'contactOffice' => $event->contact_office,
            'contactWebsite' => $event->contact_website,
            'heroImageUrl' => $event->hero_image_url,
            'heroImageAlt' => $event->hero_image_alt,
            'galleryImageUrls' => $event->gallery_image_urls ?: [],
            'videoUrl' => $event->video_url,
            'videoTitle' => $event->video_title,
            'capacity' => (int) $event->capacity,
            'confirmedSeats' => $confirmedSeats,
            'remainingSeats' => $remainingSeats,
            'perSchoolCapacity' => $event->per_school_capacity,
            'perGroupCapacity' => $event->per_group_capacity,
            'guestRegistrationEnabled' => (bool) $event->guest_registration_enabled,
            'registrationOpen' => (! $event->registration_opens_at || now()->gte($event->registration_opens_at))
                && (! $event->registration_closes_at || now()->lte($event->registration_closes_at)),
            'shareSlug' => $event->share_slug,
            'shareUrl' => route('programs.public.show', $event->share_slug),
        ];
    }
}
