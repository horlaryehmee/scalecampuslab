<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->dateTime('registration_opens_at')->nullable()->after('ends_at');
            $table->dateTime('registration_closes_at')->nullable()->after('registration_opens_at');
            $table->enum('visibility', ['public', 'invite_only', 'private'])->default('public')->after('status')->index();
            $table->unsignedInteger('per_school_capacity')->nullable()->after('capacity');
            $table->unsignedInteger('per_group_capacity')->nullable()->after('per_school_capacity');
            $table->enum('lifecycle_stage', ['planning', 'inviting', 'open', 'full', 'in_progress', 'completed', 'archived'])->default('planning')->after('visibility')->index();
            $table->json('invited_school_ids')->nullable()->after('lifecycle_stage');
            $table->json('lifecycle_log')->nullable()->after('invited_school_ids');
        });
    }

    public function down(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->dropColumn([
                'registration_opens_at',
                'registration_closes_at',
                'visibility',
                'per_school_capacity',
                'per_group_capacity',
                'lifecycle_stage',
                'invited_school_ids',
                'lifecycle_log',
            ]);
        });
    }
};
