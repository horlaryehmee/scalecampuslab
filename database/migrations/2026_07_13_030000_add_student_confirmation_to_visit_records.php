<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_registrations', function (Blueprint $table): void {
            if (! Schema::hasColumn('event_registrations', 'student_confirmed_at')) {
                $table->timestamp('student_confirmed_at')->nullable()->after('waitlist_promoted_at');
            }
        });

        Schema::table('event_registration_students', function (Blueprint $table): void {
            if (! Schema::hasColumn('event_registration_students', 'student_confirmed_at')) {
                $table->timestamp('student_confirmed_at')->nullable()->after('checked_out_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_registration_students', function (Blueprint $table): void {
            if (Schema::hasColumn('event_registration_students', 'student_confirmed_at')) {
                $table->dropColumn('student_confirmed_at');
            }
        });

        Schema::table('event_registrations', function (Blueprint $table): void {
            if (Schema::hasColumn('event_registrations', 'student_confirmed_at')) {
                $table->dropColumn('student_confirmed_at');
            }
        });
    }
};
