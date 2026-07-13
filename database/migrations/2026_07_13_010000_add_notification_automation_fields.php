<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->boolean('reminders_enabled')->default(true)->after('last_schedule_change_at');
            $table->unsignedSmallInteger('reminder_days_before')->default(7)->after('reminders_enabled');
            $table->time('reminder_time')->default('09:00:00')->after('reminder_days_before');
            $table->timestamp('last_reminder_queued_at')->nullable()->after('reminder_time');
        });

        Schema::table('platform_notifications', function (Blueprint $table): void {
            $table->string('notification_type')->default('general')->after('campus_event_id')->index();
            $table->string('target_type')->nullable()->after('notification_type')->index();
            $table->unsignedBigInteger('target_id')->nullable()->after('target_type');
            $table->unsignedInteger('retry_count')->default(0)->after('status');
            $table->timestamp('scheduled_for')->nullable()->after('retry_count')->index();
            $table->timestamp('last_attempt_at')->nullable()->after('scheduled_for');
            $table->text('failure_reason')->nullable()->after('last_attempt_at');
            $table->json('metadata')->nullable()->after('failure_reason');

            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::table('platform_notifications', function (Blueprint $table): void {
            $table->dropIndex(['target_type', 'target_id']);
            $table->dropColumn([
                'notification_type',
                'target_type',
                'target_id',
                'retry_count',
                'scheduled_for',
                'last_attempt_at',
                'failure_reason',
                'metadata',
            ]);
        });

        Schema::table('campus_events', function (Blueprint $table): void {
            $table->dropColumn([
                'reminders_enabled',
                'reminder_days_before',
                'reminder_time',
                'last_reminder_queued_at',
            ]);
        });
    }
};
