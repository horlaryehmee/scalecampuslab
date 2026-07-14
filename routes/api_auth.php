<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PublicController;
use Illuminate\Support\Facades\Route;

// This file is self-prefixed. Requiring it once from routes/api.php exposes /api/v1/*.
Route::prefix('v1')->name('api.v1.')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:5,1')
        ->name('auth.register');
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1')
        ->name('auth.login');
    Route::post('/demo-login', [AuthController::class, 'demoLogin'])
        ->middleware('throttle:20,1')
        ->name('auth.demo-login');
    Route::post('/mfa/verify', [AuthController::class, 'verifyMfa'])
        ->middleware('throttle:10,1')
        ->name('auth.mfa.verify');
    Route::post('/mfa/resend', [AuthController::class, 'resendMfa'])
        ->middleware('throttle:3,10')
        ->name('auth.mfa.resend');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,1')
        ->name('password.email');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:5,1')
        ->name('password.reset');

    Route::get('/public/home', [PublicController::class, 'home'])
        ->name('public.home');
    Route::get('/public/registration-options', [PublicController::class, 'registrationOptions'])
        ->name('public.registration-options');
    Route::get('/public/faqs', [PublicController::class, 'faqs'])
        ->name('public.faqs');
    Route::post('/contact', [PublicController::class, 'contact'])
        ->middleware('throttle:5,1')
        ->name('public.contact');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/email/verification-notification', [AuthController::class, 'sendVerificationNotification'])
            ->middleware('throttle:6,1')
            ->name('verification.send');
    });
});
