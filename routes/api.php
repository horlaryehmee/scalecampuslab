<?php

use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\ReportingController;
use App\Http\Controllers\Api\SchoolController;
use App\Http\Controllers\Api\StudentController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/calendar', [CalendarController::class, 'index']);
    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store'])->middleware('role:university,admin');
    Route::middleware('role:school,admin')->group(function (): void {
        Route::get('/students', [StudentController::class, 'index']);
        Route::post('/students', [StudentController::class, 'store']);
        Route::post('/students/bulk', [StudentController::class, 'bulkStore']);
        Route::patch('/students/{student}', [StudentController::class, 'update']);
        Route::delete('/students/{student}', [StudentController::class, 'destroy']);
    });

    Route::get('/events', [EventController::class, 'index']);
    Route::get('/events/{event}', [EventController::class, 'show']);

    Route::middleware('role:university,admin')->group(function (): void {
        Route::post('/events', [EventController::class, 'store']);
        Route::put('/events/{event}', [EventController::class, 'update']);
        Route::delete('/events/{event}', [EventController::class, 'destroy']);
        Route::post('/events/{event}/publish', [EventController::class, 'publish']);
        Route::post('/events/{event}/unpublish', [EventController::class, 'unpublish']);
        Route::post('/events/{event}/cancel', [EventController::class, 'cancel']);
        Route::post('/events/{event}/reminders', [EventController::class, 'reminders']);
        Route::get('/events/{event}/registrations', [RegistrationController::class, 'index']);
        Route::post('/events/{event}/attendance', [AttendanceController::class, 'store']);
    });

    Route::middleware('role:student,school')->group(function (): void {
        Route::post('/events/{event}/registrations', [RegistrationController::class, 'store']);
    });

    Route::middleware('role:school,admin')->group(function (): void {
        Route::post('/events/{event}/group-registrations', [RegistrationController::class, 'groupStore']);
    });

    Route::delete('/registrations/{registration}', [RegistrationController::class, 'cancel']);
    Route::get('/registrations', [RegistrationController::class, 'mine'])->middleware('role:student,school');

    Route::get('/applications', [ApplicationController::class, 'index']);
    Route::post('/applications', [ApplicationController::class, 'store'])->middleware('role:student,admin');
    Route::patch('/applications/{application}', [ApplicationController::class, 'update'])->middleware('role:university,admin');

    Route::get('/reports', [ReportingController::class, 'index'])->middleware('role:university,admin');
    Route::get('/reports/export/pdf', [ReportingController::class, 'exportPdf'])->middleware('role:university,admin');
    Route::get('/reports/export/excel', [ReportingController::class, 'exportExcel'])->middleware('role:university,admin');

    Route::prefix('ai')->middleware('role:university,admin')->group(function (): void {
        Route::post('/school-matches', [AIController::class, 'schoolMatches']);
        Route::post('/predictive-score', [AIController::class, 'predictiveScore']);
        Route::post('/itinerary', [AIController::class, 'itinerary']);
        Route::post('/route-optimization', [AIController::class, 'route']);
        Route::post('/engagement-prediction', [AIController::class, 'engagement']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/users', [AdminController::class, 'users']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::patch('/users/{user}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);
        Route::get('/universities', [AdminController::class, 'universities']);
        Route::get('/schools/summary', [AdminController::class, 'schools']);
        Route::get('/events', [AdminController::class, 'events']);
        Route::get('/analytics', [AdminController::class, 'analytics']);
        Route::get('/logs', [AdminController::class, 'logs']);

        Route::get('/schools', [SchoolController::class, 'index']);
        Route::post('/schools', [SchoolController::class, 'store']);
        Route::patch('/schools/{school}', [SchoolController::class, 'update']);
        Route::delete('/schools/{school}', [SchoolController::class, 'destroy']);
    });
});
