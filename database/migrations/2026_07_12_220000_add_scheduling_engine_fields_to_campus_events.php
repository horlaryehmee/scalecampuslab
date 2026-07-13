<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campus_events', function (Blueprint $table) {
            $table->foreignId('recurrence_parent_id')->nullable()->after('id')->constrained('campus_events')->nullOnDelete();
            $table->enum('recurrence_rule', ['none', 'daily', 'weekly', 'monthly'])->default('none')->index()->after('lifecycle_stage');
            $table->unsignedSmallInteger('recurrence_count')->default(1)->after('recurrence_rule');
            $table->string('external_calendar_uid')->nullable()->unique()->after('recurrence_count');
            $table->timestamp('last_schedule_change_at')->nullable()->after('external_calendar_uid');
        });
    }

    public function down(): void
    {
        Schema::table('campus_events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurrence_parent_id');
            $table->dropColumn([
                'recurrence_rule',
                'recurrence_count',
                'external_calendar_uid',
                'last_schedule_change_at',
            ]);
        });
    }
};
