<?php

namespace Database\Seeders;

use App\Models\CampusEvent;
use App\Models\EventItineraryItem;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\PlatformNotification;
use App\Models\ProjectMilestone;
use App\Models\School;
use App\Models\TargetSchool;
use App\Models\UniversitySetting;
use App\Models\UniversityTeamMember;
use App\Models\User;
use App\Models\VisitArchive;
use App\Models\VisitRequest;
use App\Models\VisitTask;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new \LogicException('Demo seeding is disabled in production.');
        }

        $demoSchool = School::updateOrCreate(
            ['coordinator_email' => 'demo-school@scalecampuslab.test'],
            [
                'name' => 'Lincoln High School (Demo)',
                'location' => '123 Education Blvd, Cityville, ST 12345',
                'coordinator_name' => 'Jane Doe',
                'coordinator_phone' => '(555) 123-4567',
                'website' => 'https://lincolnhigh.scalecampuslab.test',
                'address' => '123 Education Boulevard',
                'city' => 'Cityville',
                'state' => 'ST',
                'country' => 'United States',
                'principal_name' => 'Dr. Evelyn Carter',
                'counselor_name' => 'Jane Doe',
                'counselor_email' => 'jane.doe@lincolnhigh.edu',
                'grade_range' => 'Grades 9-12',
                'student_count' => 1240,
                'visit_notes' => 'Prefers Wednesday or Friday campus visits. Senior students need accessible transportation and lunch timing confirmed at least one week before travel.',
                'email_notifications' => true,
            ]
        );

        $users = [
            ['name' => 'Platform Admin', 'email' => 'admin@scalecampuslab.test', 'role' => 'admin'],
            ['name' => 'University Demo', 'email' => 'university@scalecampuslab.test', 'role' => 'university'],
            ['name' => 'School Demo', 'email' => 'school@scalecampuslab.test', 'role' => 'school', 'school_id' => $demoSchool->id],
            ['name' => 'Student Demo', 'email' => 'student@scalecampuslab.test', 'role' => 'student', 'school_id' => $demoSchool->id],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'school_id' => $user['school_id'] ?? null,
                    'phone' => match ($user['role']) {
                        'admin' => '+1 555 0100',
                        'university' => '+1 555 0110',
                        'school' => '+1 555 0120',
                        default => '+1 555 0130',
                    },
                    'access_status' => 'active',
                    'email_verified_at' => now(),
                    'is_demo' => true,
                    'two_factor_enabled' => false,
                    'password' => Hash::make('password'),
                ]
            );
        }

        foreach ([
            ['Ada Student', 'ada.student@scalecampuslab.test', 'ST-1001', '12th', 'Computer Science', '200 Student Lane', 'Cityville', 'ST', 'United States', 'Monica Student', 'Mother', 'monica.student@example.test', '+1 555 0211', 'Eric Student', 'Uncle', '+1 555 0212', 'Peanut allergy', 'Prefers front-row seating for presentations.', 'Vegetarian'],
            ['Maya Student', 'maya.student@scalecampuslab.test', 'ST-1002', '11th', 'Biomedical Engineering', '204 Student Lane', 'Cityville', 'ST', 'United States', 'Victor Student', 'Father', 'victor.student@example.test', '+1 555 0221', 'Ana Student', 'Aunt', '+1 555 0222', null, 'Needs step-free route where possible.', 'No pork'],
            ['Tunde Student', 'tunde.student@scalecampuslab.test', 'ST-1003', '12th', 'Business Analytics', '208 Student Lane', 'Cityville', 'ST', 'United States', 'Kemi Student', 'Mother', 'kemi.student@example.test', '+1 555 0231', 'Femi Student', 'Brother', '+1 555 0232', 'Carries inhaler', null, 'None'],
        ] as [$name, $email, $identifier, $grade, $interest, $address, $city, $state, $country, $guardian, $relationship, $guardianEmail, $guardianPhone, $emergencyName, $emergencyRelationship, $emergencyPhone, $medical, $accessibility, $diet]) {
            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'role' => 'student',
                    'school_id' => $demoSchool->id,
                    'phone' => '+1 555 '.substr(str_replace(['ST-', '100'], ['02', ''], $identifier), 0, 4),
                    'access_status' => 'active',
                    'email_verified_at' => now(),
                    'is_demo' => true,
                    'two_factor_enabled' => false,
                    'student_identifier' => $identifier,
                    'grade_level' => $grade,
                    'interest_major' => $interest,
                    'date_of_birth' => now()->subYears($grade === '11th' ? 16 : 17)->subMonths(4)->toDateString(),
                    'address' => $address,
                    'city' => $city,
                    'state' => $state,
                    'country' => $country,
                    'guardian_name' => $guardian,
                    'guardian_relationship' => $relationship,
                    'guardian_email' => $guardianEmail,
                    'guardian_phone' => $guardianPhone,
                    'emergency_contact_name' => $emergencyName,
                    'emergency_contact_relationship' => $emergencyRelationship,
                    'emergency_contact_phone' => $emergencyPhone,
                    'medical_notes' => $medical,
                    'accessibility_needs' => $accessibility,
                    'dietary_restrictions' => $diet,
                    'consent_to_share' => true,
                    'password' => Hash::make('password'),
                ]
            );
        }

        $university = User::where('email', 'university@scalecampuslab.test')->first();

        if ($university) {
            UniversitySetting::updateOrCreate(
                ['university_user_id' => $university->id],
                [
                    'institution_name' => 'Scale State University',
                    'website' => 'https://scale-state.scalecampuslab.test',
                    'primary_contact_name' => 'Dr. Amara Brooks',
                    'primary_contact_email' => 'visits@scale-state.scalecampuslab.test',
                    'primary_contact_phone' => '+1 555 0144',
                    'address' => '900 University Avenue, Cityville, ST 12345',
                    'region' => 'Midwest Recruitment Region',
                    'logo_url' => null,
                    'brand_color' => '#006a61',
                    'default_visit_config' => [
                        'capacity' => 120,
                        'per_school_capacity' => 45,
                        'per_group_capacity' => 35,
                        'visibility' => 'public',
                        'lifecycle_stage' => 'open',
                        'duration_minutes' => 210,
                    ],
                    'notification_preferences' => [
                        'request_created' => true,
                        'request_updated' => true,
                        'registration_confirmed' => true,
                        'waitlist_promoted' => true,
                        'schedule_changed' => true,
                        'reminder_days_before' => 5,
                        'email_enabled' => true,
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

            foreach ([
                ['Dr. Amara Brooks', 'amara.brooks@scale-state.scalecampuslab.test', 'Director of Campus Outreach', '+1 555 0144', 'active'],
                ['Noah Rivera', 'noah.rivera@scale-state.scalecampuslab.test', 'Visit Logistics Manager', '+1 555 0145', 'active'],
                ['Priya Shah', 'priya.shah@scale-state.scalecampuslab.test', 'Student Ambassador Lead', '+1 555 0146', 'active'],
            ] as [$name, $email, $title, $phone, $status]) {
                UniversityTeamMember::updateOrCreate(
                    ['university_user_id' => $university->id, 'email' => $email],
                    [
                        'name' => $name,
                        'title' => $title,
                        'phone' => $phone,
                        'status' => $status,
                        'permissions' => ['manage_programs', 'manage_requests', 'send_messages'],
                        'last_active_at' => now()->subDays(rand(1, 7)),
                    ]
                );
            }

            foreach ([
                ['Campus Preview Day', 3, 'Admissions Welcome Center', 'Main Campus', 'A guided campus experience for prospective students and school groups.', 120, 'published', 10, 14],
                ['STEM Discovery Fair', 5, 'Engineering Hall', 'North Campus', 'Hands-on faculty sessions, lab tours, and student project showcases.', 80, 'published', 9, 13],
                ['International Applicant Webinar', 7, 'Online Admissions Studio', 'Virtual', 'A live online information session for international applicants and counselors.', 150, 'published', 14, 15],
                ['Creative Arts Portfolio Review', 9, 'Arts & Design Center', 'West Campus', 'Portfolio reviews and conversations with faculty from creative disciplines.', 45, 'draft', 11, 15],
            ] as [$title, $weeks, $venue, $location, $description, $capacity, $status, $startHour, $endHour]) {
                CampusEvent::updateOrCreate(
                    ['title' => $title, 'university_user_id' => $university->id],
                    [
                        'starts_at' => now()->addWeeks($weeks)->setTime($startHour, 0),
                        'ends_at' => now()->addWeeks($weeks)->setTime($endHour, 0),
                        'venue' => $venue,
                        'location' => $location,
                        'description' => $description,
                        'capacity' => $capacity,
                        'status' => $status,
                    ]
                );
            }
        }

        $schools = [
            ['Lincoln High School', 'Cityville', 'Midwest US', 'public', 'high', 1320, 3.4, 89, 34],
            ['Oakwood Preparatory Academy', 'Greenwich', 'Northeast US', 'private', 'elite', 1480, 4.2, 98, 12],
            ['North Valley Science Magnet', 'San Jose', 'West Coast', 'public', 'high', 1420, 2.8, 91, 8],
            ['International School of Boston', 'Boston', 'Northeast US', 'ib_school', 'high', 1510, 5.1, 95, 18],
            ['Westlake Arts and Tech Academy', 'Austin', 'South Central', 'charter', 'emerging', 1390, 2.1, 84, 3],
            ['NIST International School', 'Bangkok', 'Southeast Asia', 'ib_school', 'elite', 1500, 6.4, 97, 24],
            ['St. Georges International School', 'Geneva', 'Europe', 'private', 'stable', 1460, 3.6, 88, 9],
        ];

        foreach ($schools as [$name, $city, $region, $type, $tier, $sat, $yield, $score, $applicants]) {
            TargetSchool::updateOrCreate(
                ['name' => $name],
                [
                    'city' => $city,
                    'region' => $region,
                    'country' => in_array($city, ['Bangkok', 'Geneva'], true) ? ($city === 'Bangkok' ? 'Thailand' : 'Switzerland') : 'United States',
                    'school_type' => $type,
                    'performance_tier' => $tier,
                    'average_sat' => $sat,
                    'yield_rate' => $yield,
                    'match_score' => $score,
                    'active_applicants' => $applicants,
                    'notes' => $name === 'Lincoln High School'
                        ? 'Registered school account. Ready for canonical visit scheduling and coordinator approval.'
                        : 'Seeded target institution for recruitment planning.',
                ]
            );
        }

        $previewEvent = CampusEvent::where('title', 'Campus Preview Day')->first();
        $schoolUser = User::where('email', 'school@scalecampuslab.test')->first();

        foreach ([
            ['Oakwood Preparatory Academy', 'Oct 14, 2026 - 10:00 AM', 'requested', 3],
            ['International School of Boston', 'Oct 16, 2026 - 2:00 PM', 'approved', 2],
            ['NIST International School', 'Oct 18, 2026 - 9:00 AM', 'scheduled', 3],
        ] as [$schoolName, $window, $status, $priority]) {
            $school = TargetSchool::where('name', $schoolName)->first();
            if ($school) {
                VisitRequest::updateOrCreate(
                    ['target_school_id' => $school->id, 'requested_window' => $window],
                    [
                        'campus_event_id' => $previewEvent?->id,
                        'requested_by_user_id' => $schoolUser?->id,
                        'status' => $status,
                        'priority' => $priority,
                        'notes' => 'Counselor request generated from the school portal.',
                    ]
                );
            }
        }

        $student = User::where('email', 'student@scalecampuslab.test')->first();

        if ($previewEvent && $university && $schoolUser && $student) {
            $canonicalVisit = VisitRequest::query()->updateOrCreate(
                [
                    'campus_event_id' => $previewEvent->id,
                    'school_id' => $demoSchool->id,
                ],
                [
                    'target_school_id' => null,
                    'requested_by_user_id' => $university->id,
                    'responded_by_user_id' => $schoolUser->id,
                    'requested_window' => $previewEvent->starts_at->toIso8601String(),
                    'group_size' => 24,
                    'status' => 'approved',
                    'priority' => 2,
                    'notes' => 'Approved demo visit connecting a real university event and school account.',
                    'responded_at' => now(),
                    'decision_note' => 'Approved for the senior student cohort.',
                ]
            );

            $registration = EventRegistration::query()->firstOrNew([
                'campus_event_id' => $previewEvent->id,
                'registrant_email' => $student->email,
            ]);
            $registration->forceFill([
                'visit_request_id' => $canonicalVisit->id,
                'user_id' => $student->id,
                'registrant_name' => $student->name,
                'registrant_type' => 'student',
                'party_size' => 1,
                'status' => 'confirmed',
                'consent_status' => 'not_required',
                'is_minor' => false,
            ])->save();

            foreach ([
                ['Arrival and check-in', -20, 0, 'Admissions Welcome Center', 'Meet the school coordinator and complete check-in.'],
                ['Campus welcome', 0, 45, 'Admissions Welcome Center', 'University welcome, safety briefing, and visit overview.'],
                ['Guided campus experience', 45, 150, 'Main Campus', 'Student-led tour and academic program conversations.'],
                ['Questions and departure', 150, 180, 'Admissions Welcome Center', 'Final questions, next steps, and coordinated departure.'],
            ] as $position => [$title, $startMinutes, $endMinutes, $location, $description]) {
                EventItineraryItem::query()->updateOrCreate(
                    [
                        'campus_event_id' => $previewEvent->id,
                        'visit_request_id' => $canonicalVisit->id,
                        'title' => $title,
                    ],
                    [
                        'created_by_user_id' => $university->id,
                        'description' => $description,
                        'starts_at' => $previewEvent->starts_at->copy()->addMinutes($startMinutes),
                        'ends_at' => $previewEvent->starts_at->copy()->addMinutes($endMinutes),
                        'location' => $location,
                        'position' => $position + 1,
                    ]
                );
            }

            $groupRegistration = EventRegistration::query()->firstOrNew([
                'campus_event_id' => $previewEvent->id,
                'registrant_email' => $schoolUser->email,
            ]);
            $groupRegistration->forceFill([
                'visit_request_id' => $canonicalVisit->id,
                'user_id' => $schoolUser->id,
                'registrant_name' => $demoSchool->name.' Senior Group',
                'registrant_type' => 'school_group',
                'party_size' => 4,
                'status' => 'confirmed',
                'consent_status' => 'received',
                'is_minor' => true,
                'guardian_name' => 'School counselor records',
                'guardian_email' => $demoSchool->coordinator_email,
                'guardian_phone' => $demoSchool->coordinator_phone,
                'emergency_contact_name' => $demoSchool->coordinator_name,
                'emergency_contact_phone' => $demoSchool->coordinator_phone,
                'is_demo' => true,
            ])->save();

            foreach (User::query()->where('role', 'student')->where('school_id', $demoSchool->id)->limit(4)->get() as $index => $rosterStudent) {
                EventRegistrationStudent::updateOrCreate(
                    [
                        'event_registration_id' => $groupRegistration->id,
                        'email' => $rosterStudent->email,
                    ],
                    [
                        'user_id' => $rosterStudent->id,
                        'name' => $rosterStudent->name,
                        'student_identifier' => $rosterStudent->student_identifier,
                        'grade_level' => $rosterStudent->grade_level,
                        'interest_major' => $rosterStudent->interest_major,
                        'status' => 'confirmed',
                        'consent_status' => 'received',
                        'is_minor' => true,
                        'guardian_name' => $rosterStudent->guardian_name,
                        'guardian_email' => $rosterStudent->guardian_email,
                        'guardian_phone' => $rosterStudent->guardian_phone,
                        'emergency_contact_name' => $rosterStudent->emergency_contact_name,
                        'emergency_contact_phone' => $rosterStudent->emergency_contact_phone,
                        'medical_notes' => $rosterStudent->medical_notes,
                        'student_confirmed_at' => $index === 0 ? now()->subDay() : null,
                    ]
                );
            }

            foreach ([
                [$university, $previewEvent, 'Demo university profile ready', 'Your university profile, team contacts, visit defaults, and published visit programs have been seeded.'],
                [$schoolUser, $previewEvent, 'Demo school profile ready', 'Your school profile, student roster, and approved visit request are ready to explore.'],
                [$student, $previewEvent, 'Demo student profile ready', 'Your student profile and assigned campus visit are ready to review.'],
            ] as [$recipient, $event, $subject, $body]) {
                PlatformNotification::withoutEvents(fn () => PlatformNotification::updateOrCreate(
                    [
                        'user_id' => $recipient->id,
                        'campus_event_id' => $event->id,
                        'subject' => $subject,
                    ],
                    [
                        'notification_type' => 'demo.seeded',
                        'channel' => 'email',
                        'body' => $body,
                        'status' => 'sent',
                        'sent_at' => now()->subMinutes(15),
                        'read_at' => null,
                        'metadata' => ['source' => 'database_seeder'],
                    ]
                ));
            }
        }

        foreach ([
            ['St. Georges International School', '2026-10-12', 'School Fair', 142, 32.0, 4.8, 'archived'],
            ['NIST International School', '2026-10-22', 'Counselor Visit', 84, 41.0, 4.0, 'pending_sync'],
            ['North Valley Science Magnet', '2026-11-05', 'Presentation', 580, 45.0, 4.9, 'synced'],
        ] as [$schoolName, $date, $type, $leads, $engagement, $quality, $status]) {
            $school = TargetSchool::where('name', $schoolName)->first();
            if ($school) {
                $archive = VisitArchive::updateOrCreate(
                    ['target_school_id' => $school->id, 'visited_on' => $date],
                    [
                        'visit_type' => $type,
                        'leads_captured' => $leads,
                        'engagement_rate' => $engagement,
                        'quality_score' => $quality,
                        'status' => $status,
                        'summary' => 'Visit captured strong student interest and counselor follow-up requirements.',
                    ]
                );

                foreach ([
                    ['Send follow-up email to counselor', 'Personalize with STEM interest stats from visit.', 'done', true],
                    ['Update CRM with new lead data', 'Manual verification required for imported email records.', $status === 'synced' ? 'done' : 'open', false],
                    ['Prepare travel expense report', 'Log flight and local transit for the visit.', 'open', false],
                ] as [$title, $description, $taskStatus, $aiSuggested]) {
                    VisitTask::updateOrCreate(
                        ['visit_archive_id' => $archive->id, 'title' => $title],
                        compact('description') + ['status' => $taskStatus, 'ai_suggested' => $aiSuggested]
                    );
                }
            }
        }

        TargetSchool::query()->orderBy('id')->get()->each(function (TargetSchool $school, int $index): void {
            $baseLeads = max(55, (int) $school->active_applicants * 11);
            $engagementBase = min(52, max(24, (int) round($school->match_score / 2)));
            $visitRows = [
                ['Spring Tech Career Fair', '2026-04-12', $baseLeads + ($index * 9), $engagementBase, 4.6, 'synced'],
                ['Engineering Mixer', '2026-03-05', (int) round($baseLeads * 0.72), $engagementBase - 5, 4.4, 'archived'],
                ['MBA Leadership Session', '2026-02-18', (int) round($baseLeads * 0.54), $engagementBase - 9, 4.2, 'archived'],
            ];

            foreach ($visitRows as [$type, $date, $leads, $engagement, $quality, $status]) {
                $archive = VisitArchive::updateOrCreate(
                    ['target_school_id' => $school->id, 'visited_on' => $date, 'visit_type' => $type],
                    [
                        'leads_captured' => $leads,
                        'engagement_rate' => max(18, $engagement),
                        'quality_score' => $quality,
                        'status' => $status,
                        'summary' => $type.' generated qualified prospects and counselor follow-up tasks.',
                    ]
                );

                foreach ([
                    ['Send counselor recap', 'Summarize high-interest programs and next application steps.', 'done', true],
                    ['Tag high-intent students', 'Segment leads by interest area for recruiter follow-up.', $status === 'synced' ? 'done' : 'open', true],
                    ['Plan next visit window', 'Coordinate availability with the school counseling team.', 'open', false],
                ] as [$title, $description, $taskStatus, $aiSuggested]) {
                    VisitTask::updateOrCreate(
                        ['visit_archive_id' => $archive->id, 'title' => $title],
                        compact('description') + ['status' => $taskStatus, 'ai_suggested' => $aiSuggested]
                    );
                }
            }
        });

        $milestones = [
            ['Foundation', 'Role-based authentication and dashboards', 'Separate secure workspaces for admin, university, school, and student users.', 'completed'],
            ['Foundation', 'Visual PRD delivery tracker', 'A persistent checklist for PRD features, status, and delivery progress.', 'in_progress'],
            ['Events', 'Campus visit event management', 'Universities can create, publish, edit, and cancel campus visit events.', 'in_progress'],
            ['Events', 'Venue conflict prevention', 'Prevent double-booking the same venue at overlapping times.', 'in_progress'],
            ['Registrations', 'Student event registration', 'Students can register for published visits with automatic capacity checks.', 'in_progress'],
            ['Registrations', 'School group booking', 'High school users can reserve multiple seats for student groups.', 'in_progress'],
            ['Registrations', 'Waitlist promotion workflow', 'Full events move new registrations to a waitlist and promote users when slots open.', 'planned'],
            ['Scheduling', 'Calendar view', 'Weekly and monthly visual schedules for campus visits.', 'planned'],
            ['Notifications', 'Email confirmations and reminders', 'Transactional messages for confirmations, changes, reminders, and cancellations.', 'planned'],
            ['Analytics', 'Reports and exports', 'Registration, attendance, conversion, and school engagement reporting.', 'planned'],
            ['AI', 'School matchmaking', 'Recommend high schools based on recruitment goals and historical engagement.', 'planned'],
            ['AI', 'Predictive school scoring', 'Rank schools by engagement, application quality, and enrollment outcomes.', 'planned'],
            ['AI', 'Itinerary and route optimization', 'Generate efficient recruiter travel schedules across regions.', 'planned'],
            ['Compliance', 'Security, legal, and privacy controls', 'Least-privilege access, validation, consent-aware data handling, and deployable production settings.', 'in_progress'],
            ['Performance', 'Production optimization', 'Cacheable config, lean dashboard payloads, indexes, and responsive UI.', 'in_progress'],
        ];

        foreach ($milestones as $index => [$category, $title, $description, $status]) {
            ProjectMilestone::updateOrCreate(
                ['title' => $title],
                compact('category', 'description', 'status') + ['sort_order' => $index + 1]
            );
        }
    }
}
