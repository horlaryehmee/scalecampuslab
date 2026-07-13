<?php

use App\Http\Controllers\AdminContentController;
use App\Http\Controllers\AdminWaitlistController;
use App\Http\Controllers\AdmissionApplicationController;
use App\Http\Controllers\ApplicationPaymentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CampusEventController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InstitutionBrandingController;
use App\Http\Controllers\InstitutionProgramController;
use App\Http\Controllers\SchoolItineraryController;
use App\Http\Controllers\StudentPortfolioController;
use App\Http\Controllers\VisitOperationsController;
use App\Http\Controllers\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::get('/platform', static function () {
    return app()->isLocal()
        ? view('platform')
        : redirect('/app');
})->name('platform');
Route::get('/waitlist', [WaitlistController::class, 'landing'])->name('waitlist.join');
Route::post('/waitlist', [WaitlistController::class, 'store'])->middleware('throttle:10,1')->name('waitlist.store');
Route::get('/thank-you', [WaitlistController::class, 'success'])->name('waitlist.success');

Route::middleware('guest')->group(function (): void {
    Route::post('/login', [AuthController::class, 'authenticate'])->middleware('throttle:5,1')->name('login.authenticate');
    Route::get('/admin/login', [AuthController::class, 'adminLogin'])->name('admin.login');
    Route::post('/admin/login', [AuthController::class, 'authenticate'])->middleware('throttle:5,1')->name('admin.login.authenticate');
    Route::get('/two-factor-challenge', [AuthController::class, 'mfaChallenge'])->name('login.mfa.challenge');
    Route::post('/two-factor-challenge', [AuthController::class, 'verifyMfa'])->middleware('throttle:10,1')->name('login.mfa.verify');
    Route::post('/two-factor-challenge/resend', [AuthController::class, 'resendMfa'])->middleware('throttle:3,10')->name('login.mfa.resend');
    Route::post('/forgot-password', [AuthController::class, 'sendResetLink'])->middleware('throttle:3,1')->name('password.email');
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');
Route::get('/payments/paystack/callback', [ApplicationPaymentController::class, 'callback'])->middleware('throttle:30,1')->name('payments.paystack.callback');
Route::middleware(['auth', 'active', 'verified'])->prefix('dashboard')->name('dashboard.')->group(function (): void {
    Route::get('/admin', [DashboardController::class, 'admin'])->middleware('role:admin')->name('admin');
    Route::get('/university', [DashboardController::class, 'university'])->middleware('role:university')->name('university');
    Route::get('/school', [DashboardController::class, 'school'])->middleware('role:school,high_school')->name('school');
    Route::get('/student', [DashboardController::class, 'student'])->middleware('role:student')->name('student');
});

Route::middleware(['auth', 'active', 'verified'])->group(function (): void {
    Route::post('/institution-programs', [InstitutionProgramController::class, 'store'])->name('institution-programs.store');
    Route::put('/institution-programs/{program}', [InstitutionProgramController::class, 'update'])->name('institution-programs.update');
    Route::delete('/institution-programs/{program}', [InstitutionProgramController::class, 'destroy'])->name('institution-programs.destroy');
    Route::post('/admission-applications', [AdmissionApplicationController::class, 'store'])->middleware('role:student')->name('admission-applications.store');
    Route::post('/admission-applications/{application}/decision', [AdmissionApplicationController::class, 'decide'])->middleware('role:admin,university,school,high_school')->name('admission-applications.decision');
    Route::post('/admission-applications/{application}/withdraw', [AdmissionApplicationController::class, 'withdraw'])->middleware('role:student')->name('admission-applications.withdraw');
    Route::post('/admission-applications/{application}/payments/paystack', [ApplicationPaymentController::class, 'initialize'])->middleware('role:student')->name('application-payments.initialize');
    Route::get('/application-payments/{payment}/receipt', [ApplicationPaymentController::class, 'receipt'])->name('application-payments.receipt');
    Route::get('/application-payments/{payment}/receipt/download', [ApplicationPaymentController::class, 'downloadReceipt'])->name('application-payments.receipt.download');
    Route::post('/student/academic-records', [StudentPortfolioController::class, 'storeAcademicRecord'])->middleware('role:student')->name('student.academic-records.store');
    Route::put('/student/academic-records/{academicRecord}', [StudentPortfolioController::class, 'updateAcademicRecord'])->middleware('role:student')->name('student.academic-records.update');
    Route::delete('/student/academic-records/{academicRecord}', [StudentPortfolioController::class, 'destroyAcademicRecord'])->middleware('role:student')->name('student.academic-records.destroy');
    Route::post('/student/documents', [StudentPortfolioController::class, 'storeDocument'])->middleware('role:student')->name('student.documents.store');
    Route::get('/student/documents/{document}/preview', [StudentPortfolioController::class, 'preview'])->name('student.documents.preview');
    Route::get('/student/documents/{document}/download', [StudentPortfolioController::class, 'download'])->name('student.documents.download');
    Route::delete('/student/documents/{document}', [StudentPortfolioController::class, 'destroyDocument'])->middleware('role:student')->name('student.documents.destroy');
    Route::post('/student/documents/{document}/review', [StudentPortfolioController::class, 'reviewDocument'])->middleware('role:admin,university,school,high_school')->name('student.documents.review');
    Route::post('/profile/photo', [StudentPortfolioController::class, 'updateProfilePhoto'])->name('profile.photo.update');
    Route::post('/university/branding/logo', [InstitutionBrandingController::class, 'universityLogo'])->middleware('role:university')->name('university.branding.logo');
    Route::post('/school/branding/logo', [InstitutionBrandingController::class, 'schoolLogo'])->middleware('role:school,high_school')->name('school.branding.logo');
    Route::post('/admin/content/announcements', [AdminContentController::class, 'storeAnnouncement'])->middleware('role:admin')->name('admin.content.announcements.store');
    Route::put('/admin/content/announcements/{announcement}', [AdminContentController::class, 'updateAnnouncement'])->middleware('role:admin')->name('admin.content.announcements.update');
    Route::delete('/admin/content/announcements/{announcement}', [AdminContentController::class, 'destroyAnnouncement'])->middleware('role:admin')->name('admin.content.announcements.destroy');
    Route::post('/admin/content/faqs', [AdminContentController::class, 'storeFaq'])->middleware('role:admin')->name('admin.content.faqs.store');
    Route::put('/admin/content/faqs/{faq}', [AdminContentController::class, 'updateFaq'])->middleware('role:admin')->name('admin.content.faqs.update');
    Route::delete('/admin/content/faqs/{faq}', [AdminContentController::class, 'destroyFaq'])->middleware('role:admin')->name('admin.content.faqs.destroy');
    Route::post('/admin/content/email-templates', [AdminContentController::class, 'storeEmailTemplate'])->middleware('role:admin')->name('admin.content.email-templates.store');
    Route::put('/admin/content/email-templates/{emailTemplate}', [AdminContentController::class, 'updateEmailTemplate'])->middleware('role:admin')->name('admin.content.email-templates.update');
    Route::delete('/admin/content/email-templates/{emailTemplate}', [AdminContentController::class, 'destroyEmailTemplate'])->middleware('role:admin')->name('admin.content.email-templates.destroy');
    Route::post('/campus-events', [CampusEventController::class, 'store'])->middleware('role:university')->name('campus-events.store');
    Route::put('/campus-events/{event}', [CampusEventController::class, 'update'])->middleware('role:university')->name('campus-events.update');
    Route::patch('/campus-events/{event}/status', [CampusEventController::class, 'updateStatus'])->middleware('role:university')->name('campus-events.status.update');
    Route::delete('/campus-events/{event}', [CampusEventController::class, 'destroy'])->middleware('role:university')->name('campus-events.destroy');
    Route::post('/campus-events/{event}/duplicate', [CampusEventController::class, 'duplicate'])->middleware('role:university')->name('campus-events.duplicate');
    Route::post('/campus-events/{event}/schedule', [CampusEventController::class, 'schedule'])->middleware('role:university')->name('campus-events.schedule');
    Route::get('/campus-events/calendar/export', [CampusEventController::class, 'calendarExport'])->middleware('role:university')->name('campus-events.calendar.export');
    Route::post('/campus-events/{event}/invite-schools', [CampusEventController::class, 'inviteSchools'])->middleware('role:university')->name('campus-events.invite-schools');
    Route::post('/campus-events/{event}/registrations', [CampusEventController::class, 'register'])->middleware('role:student,school,high_school')->name('campus-events.register');
    Route::post('/partner-schools/{school}/schedule-visit', [VisitOperationsController::class, 'schedulePartnerVisit'])->middleware(['role:university', 'can:view,school'])->name('partner-schools.schedule-visit');
    Route::post('/visit-requests', [VisitOperationsController::class, 'storeRequest'])->middleware('role:university,school,high_school')->name('visit-requests.store');
    Route::post('/visit-requests/{visitRequest}/decision', [VisitOperationsController::class, 'decideRequest'])->name('visit-requests.decision');
    Route::post('/school-itinerary', [SchoolItineraryController::class, 'store'])->middleware('role:school,high_school')->name('school-itinerary.store');
    Route::put('/school-itinerary/{itineraryItem}', [SchoolItineraryController::class, 'update'])->middleware('role:school,high_school')->name('school-itinerary.update');
    Route::delete('/school-itinerary/{itineraryItem}', [SchoolItineraryController::class, 'destroy'])->middleware('role:school,high_school')->name('school-itinerary.destroy');
    Route::post('/school-itinerary/reorder', [SchoolItineraryController::class, 'reorder'])->middleware('role:school,high_school')->name('school-itinerary.reorder');
    Route::post('/visit-archives/{archive}/sync', [VisitOperationsController::class, 'syncArchive'])->name('visit-archives.sync');
    Route::post('/visit-tasks/{task}', [VisitOperationsController::class, 'updateTask'])->name('visit-tasks.update');
    Route::post('/dashboard/admin/universities', [DashboardController::class, 'storeAdminUniversity'])->middleware('role:admin')->name('dashboard.admin.universities.store');
    Route::put('/dashboard/admin/universities/{university}', [DashboardController::class, 'updateAdminUniversity'])->middleware('role:admin')->name('dashboard.admin.universities.update');
    Route::delete('/dashboard/admin/universities/{university}', [DashboardController::class, 'destroyAdminUniversity'])->middleware('role:admin')->name('dashboard.admin.universities.destroy');
    Route::post('/dashboard/admin/universities/{university}/verification', [DashboardController::class, 'toggleAdminUniversityVerification'])->middleware('role:admin')->name('dashboard.admin.universities.verification');
    Route::post('/dashboard/admin/schools', [DashboardController::class, 'storeAdminSchool'])->middleware('role:admin')->name('dashboard.admin.schools.store');
    Route::put('/dashboard/admin/schools/{school}', [DashboardController::class, 'updateAdminSchool'])->middleware('role:admin')->name('dashboard.admin.schools.update');
    Route::delete('/dashboard/admin/schools/{school}', [DashboardController::class, 'destroyAdminSchool'])->middleware('role:admin')->name('dashboard.admin.schools.destroy');
    Route::post('/dashboard/admin/schools/{school}/status', [DashboardController::class, 'updateAdminSchoolStatus'])->middleware('role:admin')->name('dashboard.admin.schools.status');
    Route::post('/dashboard/admin/school-accounts', [DashboardController::class, 'storeAdminSchoolAccount'])->middleware('role:admin')->name('dashboard.admin.school-accounts.store');
    Route::put('/dashboard/admin/school-accounts/{schoolAccount}', [DashboardController::class, 'updateAdminSchoolAccount'])->middleware('role:admin')->name('dashboard.admin.school-accounts.update');
    Route::delete('/dashboard/admin/school-accounts/{schoolAccount}', [DashboardController::class, 'destroyAdminSchoolAccount'])->middleware('role:admin')->name('dashboard.admin.school-accounts.destroy');
    Route::post('/dashboard/admin/users', [DashboardController::class, 'storeAdminUser'])->middleware('role:admin')->name('dashboard.admin.users.store');
    Route::put('/dashboard/admin/users/{managedUser}', [DashboardController::class, 'updateAdminUser'])->middleware('role:admin')->name('dashboard.admin.users.update');
    Route::delete('/dashboard/admin/users/{managedUser}', [DashboardController::class, 'destroyAdminUser'])->middleware('role:admin')->name('dashboard.admin.users.destroy');
    Route::post('/dashboard/admin/users/{managedUser}/access', [DashboardController::class, 'updateAdminUserAccess'])->middleware('role:admin')->name('dashboard.admin.users.access');
    Route::post('/dashboard/admin/settings', [DashboardController::class, 'updateAdminPlatformSettings'])->middleware('role:admin')->name('dashboard.admin.settings.update');
    Route::post('/dashboard/security/password', [DashboardController::class, 'updateSecurityPassword'])->name('dashboard.security.password');
    Route::post('/dashboard/security/preferences', [DashboardController::class, 'updateSecurityPreferences'])->name('dashboard.security.preferences');
    Route::delete('/dashboard/security/sessions', [DashboardController::class, 'revokeOtherSessions'])->name('dashboard.security.sessions.revoke');
    Route::post('/dashboard/student/profile', [DashboardController::class, 'updateStudentProfile'])->middleware('role:student')->name('dashboard.student.profile.update');
    Route::put('/dashboard/university/attendees/{registration}', [DashboardController::class, 'updateUniversityAttendee'])->middleware('role:university')->name('dashboard.university.attendees.update');
    Route::delete('/dashboard/university/attendees/{registration}', [DashboardController::class, 'destroyUniversityAttendee'])->middleware('role:university')->name('dashboard.university.attendees.destroy');
    Route::post('/dashboard/university/attendees/{registration}/check-in', [DashboardController::class, 'checkInUniversityAttendee'])->middleware('role:university')->name('dashboard.university.attendees.check-in');
    Route::post('/dashboard/university/attendees/{registration}/check-out', [DashboardController::class, 'checkOutUniversityAttendee'])->middleware('role:university')->name('dashboard.university.attendees.check-out');
    Route::post('/dashboard/university/attendees/bulk', [DashboardController::class, 'bulkUpdateUniversityAttendees'])->middleware('role:university')->name('dashboard.university.attendees.bulk');
    Route::post('/dashboard/university/attendees/import', [DashboardController::class, 'importUniversityAttendees'])->middleware('role:university')->name('dashboard.university.attendees.import');
    Route::get('/dashboard/university/attendees/export', [DashboardController::class, 'exportUniversityAttendees'])->middleware('role:university')->name('dashboard.university.attendees.export');
    Route::post('/dashboard/university/attendees/message', [DashboardController::class, 'messageUniversityAttendees'])->middleware('role:university')->name('dashboard.university.attendees.message');
    Route::post('/dashboard/university/programs/{event}/reminder-settings', [DashboardController::class, 'updateUniversityProgramReminder'])->middleware('role:university')->name('dashboard.university.programs.reminders.update');
    Route::post('/dashboard/university/programs/{event}/queue-reminders', [DashboardController::class, 'queueUniversityProgramReminder'])->middleware('role:university')->name('dashboard.university.programs.reminders.queue');
    Route::post('/dashboard/university/notices', [DashboardController::class, 'sendUniversityTargetedNotice'])->middleware('role:university')->name('dashboard.university.notices.send');
    Route::post('/dashboard/university/notifications/{notification}/retry', [DashboardController::class, 'retryUniversityNotification'])->middleware('role:university')->name('dashboard.university.notifications.retry');
    Route::post('/dashboard/university/compliance-requests', [DashboardController::class, 'storeUniversityComplianceRequest'])->middleware('role:university')->name('dashboard.university.compliance.store');
    Route::post('/dashboard/university/compliance-requests/{complianceRequest}/status', [DashboardController::class, 'updateUniversityComplianceRequest'])->middleware('role:university')->name('dashboard.university.compliance.status');
    Route::post('/dashboard/admin/compliance-requests/{complianceRequest}/status', [DashboardController::class, 'updateAdminComplianceRequest'])->middleware('role:admin')->name('dashboard.admin.compliance.status');
    Route::get('/dashboard/university/insights/export', [DashboardController::class, 'exportUniversityInsights'])->middleware('role:university')->name('dashboard.university.insights.export');
    Route::post('/dashboard/university/insights', [DashboardController::class, 'storeUniversityInsight'])->middleware('role:university')->name('dashboard.university.insights.store');
    Route::post('/dashboard/university/insights/{insight}/status', [DashboardController::class, 'updateUniversityInsightStatus'])->middleware('role:university')->name('dashboard.university.insights.status');
    Route::post('/dashboard/university/settings', [DashboardController::class, 'updateUniversitySettings'])->middleware('role:university')->name('dashboard.university.settings.update');
    Route::post('/dashboard/university/team-members', [DashboardController::class, 'storeUniversityTeamMember'])->middleware('role:university')->name('dashboard.university.team-members.store');
    Route::put('/dashboard/university/team-members/{teamMember}', [DashboardController::class, 'updateUniversityTeamMember'])->middleware('role:university')->name('dashboard.university.team-members.update');
    Route::delete('/dashboard/university/team-members/{teamMember}', [DashboardController::class, 'destroyUniversityTeamMember'])->middleware('role:university')->name('dashboard.university.team-members.destroy');
    if (app()->environment(['local', 'testing'])) {
        Route::post('/dashboard/university/demo-data/populate', [DashboardController::class, 'populateUniversityDemoData'])->middleware('role:university')->name('dashboard.university.demo.populate');
        Route::delete('/dashboard/university/demo-data', [DashboardController::class, 'clearUniversityDemoData'])->middleware('role:university')->name('dashboard.university.demo.clear');
    }
    Route::post('/dashboard/university/partner-schools', [DashboardController::class, 'storeUniversityPartnerSchool'])->middleware('role:university')->name('dashboard.university.partner-schools.store');
    Route::put('/dashboard/university/partner-schools/{school}', [DashboardController::class, 'updateUniversityPartnerSchool'])->middleware(['role:university', 'can:manage,school'])->name('dashboard.university.partner-schools.update');
    Route::delete('/dashboard/university/partner-schools/{school}', [DashboardController::class, 'destroyUniversityPartnerSchool'])->middleware(['role:university', 'can:manage,school'])->name('dashboard.university.partner-schools.destroy');
    Route::post('/dashboard/university/partner-schools/{school}/contact', [DashboardController::class, 'contactUniversityPartnerSchool'])->middleware(['role:university', 'can:view,school'])->name('dashboard.university.partner-schools.contact');
    Route::post('/dashboard/university/partner-schools/{school}/tasks', [DashboardController::class, 'storeUniversityPartnerTask'])->middleware(['role:university', 'can:view,school'])->name('dashboard.university.partner-schools.tasks.store');
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

require __DIR__.'/public_spa.php';
