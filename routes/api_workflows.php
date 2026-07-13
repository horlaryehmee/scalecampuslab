<?php

use App\Http\Controllers\AdmissionApplicationController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\CampusEventController;
use App\Http\Controllers\Api\V1\CommunicationController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EventRosterController;
use App\Http\Controllers\Api\V1\ItineraryController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ParticipationController;
use App\Http\Controllers\Api\V1\SchoolDirectoryController;
use App\Http\Controllers\Api\V1\StudentDirectoryController;
use App\Http\Controllers\Api\V1\StudentVisitController;
use App\Http\Controllers\Api\V1\VisitRequestController;
use App\Http\Controllers\ApplicationPaymentController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\InstitutionProgramController;
use App\Http\Controllers\StudentPortfolioController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->middleware(['auth:sanctum', 'active', 'verified'])
    ->name('api.v1.workflow.')
    ->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'show'])->name('dashboard');
        Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');
        Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications');
        Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
        Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::post('/messages', [CommunicationController::class, 'store'])->name('messages.store');
        Route::get('/conversations/recipients', [ConversationController::class, 'recipients'])->name('conversations.recipients');
        Route::get('/conversations', [ConversationController::class, 'index'])->name('conversations.index');
        Route::post('/conversations', [ConversationController::class, 'store'])->name('conversations.store');
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])->whereNumber('conversation')->name('conversations.show');
        Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'reply'])->whereNumber('conversation')->name('conversations.messages.store');
        Route::patch('/conversations/{conversation}/read', [ConversationController::class, 'markRead'])->whereNumber('conversation')->name('conversations.read');
        Route::get('/programs', [InstitutionProgramController::class, 'index'])->name('programs.index');
        Route::post('/programs', [InstitutionProgramController::class, 'store'])->name('programs.store');
        Route::match(['put', 'patch'], '/programs/{program}', [InstitutionProgramController::class, 'update'])->name('programs.update');
        Route::delete('/programs/{program}', [InstitutionProgramController::class, 'destroy'])->name('programs.destroy');
        Route::get('/applications', [AdmissionApplicationController::class, 'index'])->name('applications.index');
        Route::post('/applications', [AdmissionApplicationController::class, 'store'])->name('applications.store');
        Route::post('/applications/{application}/decision', [AdmissionApplicationController::class, 'decide'])->name('applications.decision');
        Route::post('/applications/{application}/withdraw', [AdmissionApplicationController::class, 'withdraw'])->name('applications.withdraw');
        Route::post('/applications/{application}/payments/paystack', [ApplicationPaymentController::class, 'initialize'])->name('application-payments.initialize');
        Route::get('/student/portfolio', [StudentPortfolioController::class, 'index'])->name('student.portfolio');
        Route::post('/student/academic-records', [StudentPortfolioController::class, 'storeAcademicRecord'])->name('student.academic-records.store');
        Route::match(['put', 'patch'], '/student/academic-records/{academicRecord}', [StudentPortfolioController::class, 'updateAcademicRecord'])->name('student.academic-records.update');
        Route::delete('/student/academic-records/{academicRecord}', [StudentPortfolioController::class, 'destroyAcademicRecord'])->name('student.academic-records.destroy');
        Route::post('/student/documents', [StudentPortfolioController::class, 'storeDocument'])->name('student.documents.store');
        Route::delete('/student/documents/{document}', [StudentPortfolioController::class, 'destroyDocument'])->name('student.documents.destroy');
        Route::get('/schools', [SchoolDirectoryController::class, 'index'])->name('schools.index');
        Route::get('/students', [StudentDirectoryController::class, 'index'])->name('students.index');
        Route::post('/students', [StudentDirectoryController::class, 'store'])->name('students.store');
        Route::patch('/students/{student}', [StudentDirectoryController::class, 'update'])->name('students.update');

        Route::get('/campus-events', [CampusEventController::class, 'index'])->name('events.index');
        Route::post('/campus-events', [CampusEventController::class, 'store'])->name('events.store');
        Route::get('/campus-events/{campusEvent}', [CampusEventController::class, 'show'])->name('events.show');
        Route::match(['put', 'patch'], '/campus-events/{campusEvent}', [CampusEventController::class, 'update'])->name('events.update');
        Route::delete('/campus-events/{campusEvent}', [CampusEventController::class, 'destroy'])->name('events.destroy');
        Route::post('/campus-events/{campusEvent}/publish', [CampusEventController::class, 'publish'])->name('events.publish');
        Route::post('/campus-events/{campusEvent}/cancel', [CampusEventController::class, 'cancel'])->name('events.cancel');
        Route::get('/campus-events/{campusEvent}/roster', [EventRosterController::class, 'index'])->name('events.roster');

        Route::get('/visits', [VisitRequestController::class, 'index'])->name('visits.index');
        Route::post('/visits', [VisitRequestController::class, 'store'])->name('visits.store');
        Route::post('/visits/{visitRequest}/decision', [VisitRequestController::class, 'decide'])->name('visits.decision');

        Route::get('/campus-events/{campusEvent}/itinerary', [ItineraryController::class, 'index'])->name('itinerary.index');
        Route::post('/campus-events/{campusEvent}/itinerary', [ItineraryController::class, 'store'])->name('itinerary.store');
        Route::post('/campus-events/{campusEvent}/itinerary/reorder', [ItineraryController::class, 'reorder'])->name('itinerary.reorder');
        Route::match(['put', 'patch'], '/campus-events/{campusEvent}/itinerary/{itineraryItem}', [ItineraryController::class, 'update'])->name('itinerary.update');
        Route::delete('/campus-events/{campusEvent}/itinerary/{itineraryItem}', [ItineraryController::class, 'destroy'])->name('itinerary.destroy');

        Route::post('/visits/{visitRequest}/participation/self', [ParticipationController::class, 'selfRegister'])->name('participation.self');
        Route::post('/visits/{visitRequest}/participation/assign', [ParticipationController::class, 'assign'])->name('participation.assign');
        Route::get('/student/visits/upcoming', [StudentVisitController::class, 'upcoming'])->name('student.upcoming');
        Route::get('/student/visits/history', [StudentVisitController::class, 'history'])->name('student.history');

        Route::post('/attendance/registrations/{registration}/check-in', [AttendanceController::class, 'checkInRegistration'])->name('attendance.registration.check-in');
        Route::post('/attendance/registrations/{registration}/check-out', [AttendanceController::class, 'checkOutRegistration'])->name('attendance.registration.check-out');
        Route::post('/attendance/registration-students/{registrationStudent}/check-in', [AttendanceController::class, 'checkInStudent'])->name('attendance.student.check-in');
        Route::post('/attendance/registration-students/{registrationStudent}/check-out', [AttendanceController::class, 'checkOutStudent'])->name('attendance.student.check-out');

        Route::get('/admin/users', [AdminController::class, 'users'])->name('admin.users');
        Route::patch('/admin/users/{managedUser}', [AdminController::class, 'updateUser'])->name('admin.users.update');
        Route::get('/admin/settings', [AdminController::class, 'settings'])->name('admin.settings');
        Route::patch('/admin/settings', [AdminController::class, 'updateSettings'])->name('admin.settings.update');
    });
