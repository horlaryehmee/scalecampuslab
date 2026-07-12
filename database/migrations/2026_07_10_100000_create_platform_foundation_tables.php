<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_milestones', function (Blueprint $table) {
            $table->id();
            $table->string('category');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['planned', 'in_progress', 'completed'])->default('planned')->index();
            $table->unsignedSmallInteger('sort_order')->default(0)->index();
            $table->timestamps();
        });

        Schema::create('campus_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at')->nullable();
            $table->string('venue');
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('capacity');
            $table->enum('status', ['draft', 'published', 'cancelled'])->default('draft')->index();
            $table->timestamps();

            $table->index(['university_user_id', 'starts_at']);
            $table->index(['venue', 'starts_at']);
        });

        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campus_event_id')->constrained('campus_events')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('registrant_name');
            $table->string('registrant_email');
            $table->enum('registrant_type', ['student', 'school_group'])->default('student')->index();
            $table->unsignedInteger('party_size')->default(1);
            $table->enum('status', ['confirmed', 'waitlisted', 'cancelled'])->default('confirmed')->index();
            $table->timestamp('attended_at')->nullable();
            $table->timestamps();

            $table->unique(['campus_event_id', 'registrant_email']);
            $table->index(['campus_event_id', 'status']);
        });

        Schema::create('platform_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('campus_event_id')->nullable()->constrained('campus_events')->nullOnDelete();
            $table->string('channel')->default('email');
            $table->string('subject');
            $table->text('body')->nullable();
            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued')->index();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_notifications');
        Schema::dropIfExists('event_registrations');
        Schema::dropIfExists('campus_events');
        Schema::dropIfExists('project_milestones');
    }
};
