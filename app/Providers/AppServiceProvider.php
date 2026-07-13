<?php

namespace App\Providers;

use App\Models\TargetSchool;
use App\Policies\TargetSchoolPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(TargetSchool::class, TargetSchoolPolicy::class);
    }
}
