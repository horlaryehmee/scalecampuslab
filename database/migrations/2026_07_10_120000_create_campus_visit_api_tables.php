<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schools', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->string('location')->index();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('school_id')->nullable()->after('role')->constrained('schools')->nullOnDelete();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin','university','school','student','high_school') NOT NULL DEFAULT 'student'");
        }

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->index();
            $table->dateTime('event_date')->index();
            $table->unsignedInteger('capacity');
            $table->enum('status', ['draft', 'published', 'cancelled'])->default('draft')->index();
            $table->timestamps();

            $table->index(['university_id', 'event_date']);
            $table->unique(['location', 'event_date']);
        });

        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('school_id')->nullable()->constrained('schools')->nullOnDelete();
            $table->enum('status', ['confirmed', 'waitlisted', 'cancelled'])->default('confirmed')->index();
            $table->timestamps();

            $table->unique(['event_id', 'student_id']);
            $table->index(['event_id', 'status', 'created_at']);
            $table->index(['school_id', 'status']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['email', 'sms'])->default('email')->index();
            $table->text('content');
            $table->enum('status', ['sent', 'pending'])->default('pending')->index();
            $table->timestamps();
        });

        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('attended')->default(false);
            $table->timestamps();

            $table->unique(['event_id', 'student_id']);
            $table->index(['event_id', 'attended']);
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('university_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['applied', 'accepted', 'rejected'])->default('applied')->index();
            $table->timestamps();

            $table->unique(['student_id', 'university_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
        Schema::dropIfExists('attendance');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('registrations');
        Schema::dropIfExists('events');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_id');
        });

        Schema::dropIfExists('schools');
    }
};
