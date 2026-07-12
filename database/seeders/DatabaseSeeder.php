<?php

namespace Database\Seeders;

use App\Models\CampusEvent;
use App\Models\School;
use App\Models\User;
use App\Models\ProjectMilestone;
use App\Models\TargetSchool;
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
        $demoSchool = School::updateOrCreate(
            ['name' => 'Lincoln High School'],
            [
                'location' => '123 Education Blvd, Cityville, ST 12345',
                'coordinator_name' => 'Jane Doe',
                'coordinator_email' => 'jane.doe@lincolnhigh.edu',
                'coordinator_phone' => '(555) 123-4567',
                'email_notifications' => true,
                'sms_alerts' => false,
            ]
        );

        $users = [
            ['name' => 'Platform Admin', 'email' => 'admin@scalecampuslab.test', 'role' => 'admin'],
            ['name' => 'University Demo', 'email' => 'university@scalecampuslab.test', 'role' => 'university'],
            ['name' => 'School Demo', 'email' => 'school@scalecampuslab.test', 'role' => 'school', 'school_id' => $demoSchool->id],
            ['name' => 'Student Demo', 'email' => 'student@scalecampuslab.test', 'role' => 'student'],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'school_id' => $user['school_id'] ?? null,
                    'email_verified_at' => now(),
                    'password' => Hash::make('password'),
                ]
            );
        }

        foreach ([
            ['Ada Student', 'ada.student@scalecampuslab.test'],
            ['Maya Student', 'maya.student@scalecampuslab.test'],
            ['Tunde Student', 'tunde.student@scalecampuslab.test'],
        ] as [$name, $email]) {
            User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'role' => 'student',
                    'school_id' => $demoSchool->id,
                    'email_verified_at' => now(),
                    'password' => Hash::make('password'),
                ]
            );
        }

        $university = User::where('email', 'university@scalecampuslab.test')->first();

        if ($university) {
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
                    'notes' => 'Seeded target institution for recruitment planning.',
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
            ['Notifications', 'SMS delivery', 'Optional SMS delivery for time-sensitive visit updates.', 'planned'],
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
