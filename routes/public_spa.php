<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\WaitlistController;
use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Route;

/*
 * Include this file from routes/web.php after replacing the legacy GET routes for
 * /, /login and /forgot-password. Keep the existing named POST routes; their
 * login.authenticate and password.email names do not collide with these pages.
 */
// Preserve this legacy name because the existing session logout redirects to it.
Route::get('/', function () {
    $settings = PlatformSetting::query()->find('admin.global')?->value ?? [];

    if ((bool) data_get($settings, 'launch.waitlistMode', false)) {
        return app(WaitlistController::class)->landing();
    }

    return view('marketing');
})->name('waitlist.landing');
Route::view('/about', 'marketing')->name('saas.about');
Route::view('/how-it-works', 'marketing')->name('saas.how-it-works');
Route::view('/contact', 'marketing')->name('saas.contact');
Route::view('/faq', 'marketing')->name('saas.faq');
Route::view('/register', 'marketing')->name('register');
Route::view('/login', 'marketing')->name('login');
Route::view('/mfa-challenge', 'marketing')->name('saas.mfa.challenge');
Route::view('/forgot-password', 'marketing')->name('password.request');
Route::view('/reset-password/{token}', 'marketing')->name('password.reset');
Route::view('/verify-email', 'marketing')->name('verification.notice');

Route::get('/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::get('/app/{path?}', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }

    $role = auth()->user()->role === 'high_school' ? 'school' : auth()->user()->role;
    $route = match ($role) {
        'admin' => 'dashboard.admin',
        'university' => 'dashboard.university',
        'school' => 'dashboard.school',
        default => 'dashboard.student',
    };

    return redirect()->route($route);
})->where('path', '.*')->name('saas.app');
