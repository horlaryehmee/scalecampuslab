<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['users', 'campus_events', 'event_registrations', 'target_schools', 'visit_requests', 'platform_notifications'] as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->boolean('is_demo')->default(false)->index();
            });
        }
    }

    public function down(): void
    {
        foreach (['users', 'campus_events', 'event_registrations', 'target_schools', 'visit_requests', 'platform_notifications'] as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropColumn('is_demo');
            });
        }
    }
};
