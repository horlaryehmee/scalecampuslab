<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CampusEventController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AdminWaitlistController;
use App\Http\Controllers\VisitOperationsController;
use App\Http\Controllers\SchoolItineraryController;
use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::get('/', [WaitlistController::class, 'landing'])->name('waitlist.landing');
Route::view('/platform', 'platform')->name('platform');
Route::post('/waitlist', [WaitlistController::class, 'store'])->middleware('throttle:10,1')->name('waitlist.store');
Route::get('/thank-you', [WaitlistController::class, 'success'])->name('waitlist.success');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthController::class, 'generalLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'authenticate'])->middleware('throttle:5,1')->name('login.authenticate');
    Route::get('/admin/login', [AuthController::class, 'adminLogin'])->name('admin.login');
    Route::post('/admin/login', [AuthController::class, 'authenticate'])->middleware('throttle:5,1')->name('admin.login.authenticate');
    Route::get('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'sendResetLink'])->middleware('throttle:3,1')->name('password.email');
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');
Route::middleware('auth')->prefix('dashboard')->name('dashboard.')->group(function (): void {
    Route::get('/admin', [DashboardController::class, 'admin'])->middleware('role:admin')->name('admin');
    Route::get('/university', [DashboardController::class, 'university'])->middleware('role:university')->name('university');
    Route::get('/school', [DashboardController::class, 'school'])->middleware('role:school,high_school')->name('school');
    Route::get('/student', [DashboardController::class, 'student'])->middleware('role:student')->name('student');
});

Route::middleware('auth')->group(function (): void {
    Route::post('/campus-events', [CampusEventController::class, 'store'])->middleware('role:university')->name('campus-events.store');
    Route::put('/campus-events/{event}', [CampusEventController::class, 'update'])->middleware('role:university')->name('campus-events.update');
    Route::delete('/campus-events/{event}', [CampusEventController::class, 'destroy'])->middleware('role:university')->name('campus-events.destroy');
    Route::post('/campus-events/{event}/duplicate', [CampusEventController::class, 'duplicate'])->middleware('role:university')->name('campus-events.duplicate');
    Route::post('/campus-events/{event}/invite-schools', [CampusEventController::class, 'inviteSchools'])->middleware('role:university')->name('campus-events.invite-schools');
    Route::post('/campus-events/{event}/registrations', [CampusEventController::class, 'register'])->middleware('role:student,school,high_school')->name('campus-events.register');
    Route::post('/partner-schools/{school}/schedule-visit', [VisitOperationsController::class, 'schedulePartnerVisit'])->middleware('role:university')->name('partner-schools.schedule-visit');
    Route::post('/visit-requests', [VisitOperationsController::class, 'storeRequest'])->middleware('role:university,school,high_school')->name('visit-requests.store');
    Route::post('/visit-requests/{visitRequest}/decision', [VisitOperationsController::class, 'decideRequest'])->name('visit-requests.decision');
    Route::post('/school-itinerary', [SchoolItineraryController::class, 'store'])->middleware('role:school,high_school')->name('school-itinerary.store');
    Route::put('/school-itinerary/{itineraryItem}', [SchoolItineraryController::class, 'update'])->middleware('role:school,high_school')->name('school-itinerary.update');
    Route::delete('/school-itinerary/{itineraryItem}', [SchoolItineraryController::class, 'destroy'])->middleware('role:school,high_school')->name('school-itinerary.destroy');
    Route::post('/school-itinerary/reorder', [SchoolItineraryController::class, 'reorder'])->middleware('role:school,high_school')->name('school-itinerary.reorder');
    Route::post('/visit-archives/{archive}/sync', [VisitOperationsController::class, 'syncArchive'])->name('visit-archives.sync');
    Route::post('/visit-tasks/{task}', [VisitOperationsController::class, 'updateTask'])->name('visit-tasks.update');
    Route::post('/dashboard/messages', [DashboardController::class, 'sendMessage'])->name('dashboard.messages.send');
    Route::post('/dashboard/admin/universities', [DashboardController::class, 'storeAdminUniversity'])->middleware('role:admin')->name('dashboard.admin.universities.store');
    Route::put('/dashboard/admin/universities/{university}', [DashboardController::class, 'updateAdminUniversity'])->middleware('role:admin')->name('dashboard.admin.universities.update');
    Route::delete('/dashboard/admin/universities/{university}', [DashboardController::class, 'destroyAdminUniversity'])->middleware('role:admin')->name('dashboard.admin.universities.destroy');
    Route::post('/dashboard/admin/universities/{university}/verification', [DashboardController::class, 'toggleAdminUniversityVerification'])->middleware('role:admin')->name('dashboard.admin.universities.verification');
    Route::post('/dashboard/admin/schools', [DashboardController::class, 'storeAdminSchool'])->middleware('role:admin')->name('dashboard.admin.schools.store');
    Route::put('/dashboard/admin/schools/{school}', [DashboardController::class, 'updateAdminSchool'])->middleware('role:admin')->name('dashboard.admin.schools.update');
    Route::delete('/dashboard/admin/schools/{school}', [DashboardController::class, 'destroyAdminSchool'])->middleware('role:admin')->name('dashboard.admin.schools.destroy');
    Route::post('/dashboard/admin/schools/{school}/status', [DashboardController::class, 'updateAdminSchoolStatus'])->middleware('role:admin')->name('dashboard.admin.schools.status');
    Route::post('/dashboard/admin/users', [DashboardController::class, 'storeAdminUser'])->middleware('role:admin')->name('dashboard.admin.users.store');
    Route::put('/dashboard/admin/users/{managedUser}', [DashboardController::class, 'updateAdminUser'])->middleware('role:admin')->name('dashboard.admin.users.update');
    Route::delete('/dashboard/admin/users/{managedUser}', [DashboardController::class, 'destroyAdminUser'])->middleware('role:admin')->name('dashboard.admin.users.destroy');
    Route::post('/dashboard/admin/users/{managedUser}/access', [DashboardController::class, 'updateAdminUserAccess'])->middleware('role:admin')->name('dashboard.admin.users.access');
    Route::post('/dashboard/admin/settings', [DashboardController::class, 'updateAdminPlatformSettings'])->middleware('role:admin')->name('dashboard.admin.settings.update');
    Route::post('/dashboard/security/password', [DashboardController::class, 'updateSecurityPassword'])->name('dashboard.security.password');
    Route::post('/dashboard/security/preferences', [DashboardController::class, 'updateSecurityPreferences'])->name('dashboard.security.preferences');
    Route::delete('/dashboard/security/sessions', [DashboardController::class, 'revokeOtherSessions'])->name('dashboard.security.sessions.revoke');
    Route::put('/dashboard/university/attendees/{registration}', [DashboardController::class, 'updateUniversityAttendee'])->middleware('role:university')->name('dashboard.university.attendees.update');
    Route::delete('/dashboard/university/attendees/{registration}', [DashboardController::class, 'destroyUniversityAttendee'])->middleware('role:university')->name('dashboard.university.attendees.destroy');
    Route::post('/dashboard/university/attendees/message', [DashboardController::class, 'messageUniversityAttendees'])->middleware('role:university')->name('dashboard.university.attendees.message');
    Route::post('/dashboard/university/demo-data/populate', [DashboardController::class, 'populateUniversityDemoData'])->middleware('role:university')->name('dashboard.university.demo.populate');
    Route::delete('/dashboard/university/demo-data', [DashboardController::class, 'clearUniversityDemoData'])->middleware('role:university')->name('dashboard.university.demo.clear');
    Route::post('/dashboard/university/partner-schools', [DashboardController::class, 'storeUniversityPartnerSchool'])->middleware('role:university')->name('dashboard.university.partner-schools.store');
    Route::put('/dashboard/university/partner-schools/{school}', [DashboardController::class, 'updateUniversityPartnerSchool'])->middleware('role:university')->name('dashboard.university.partner-schools.update');
    Route::delete('/dashboard/university/partner-schools/{school}', [DashboardController::class, 'destroyUniversityPartnerSchool'])->middleware('role:university')->name('dashboard.university.partner-schools.destroy');
    Route::post('/dashboard/university/partner-schools/{school}/contact', [DashboardController::class, 'contactUniversityPartnerSchool'])->middleware('role:university')->name('dashboard.university.partner-schools.contact');
    Route::post('/dashboard/university/partner-schools/{school}/tasks', [DashboardController::class, 'storeUniversityPartnerTask'])->middleware('role:university')->name('dashboard.university.partner-schools.tasks.store');
    Route::post('/dashboard/school/settings', [DashboardController::class, 'updateSchoolSettings'])->middleware('role:school,high_school')->name('dashboard.school.settings.update');
    Route::post('/dashboard/school/students', [DashboardController::class, 'storeSchoolStudent'])->middleware('role:school,high_school')->name('dashboard.school.students.store');
    Route::put('/dashboard/school/students/{student}', [DashboardController::class, 'updateSchoolStudent'])->middleware('role:school,high_school')->name('dashboard.school.students.update');
    Route::delete('/dashboard/school/students/{student}', [DashboardController::class, 'destroySchoolStudent'])->middleware('role:school,high_school')->name('dashboard.school.students.destroy');
    Route::post('/dashboard/school/students/assign', [DashboardController::class, 'assignSchoolStudents'])->middleware('role:school,high_school')->name('dashboard.school.students.assign');
    Route::post('/dashboard/school/students/bulk', [DashboardController::class, 'bulkStoreSchoolStudents'])->middleware('role:school,high_school')->name('dashboard.school.students.bulk');
});

Route::prefix('admin/waitlist')->name('admin.waitlist.')->group(function (): void {
    Route::get('/login', [AdminWaitlistController::class, 'login'])->name('login');
    Route::post('/login', [AdminWaitlistController::class, 'authenticate'])->middleware('throttle:5,1')->name('authenticate');

    Route::middleware('waitlist.admin')->group(function (): void {
        Route::get('/', [AdminWaitlistController::class, 'index'])->name('index');
        Route::get('/export', [AdminWaitlistController::class, 'export'])->name('export');
        Route::post('/logout', [AdminWaitlistController::class, 'logout'])->name('logout');
    });
});
