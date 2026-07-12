<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('student_identifier')->nullable()->after('school_id');
            $table->string('grade_level', 40)->nullable()->after('student_identifier');
            $table->string('interest_major', 120)->nullable()->after('grade_level');
            $table->json('assigned_events')->nullable()->after('interest_major');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['student_identifier', 'grade_level', 'interest_major', 'assigned_events']);
        });
    }
};
