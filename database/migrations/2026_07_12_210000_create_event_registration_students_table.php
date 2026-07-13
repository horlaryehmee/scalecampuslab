<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_registration_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_registration_id')->constrained('event_registrations')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('student_identifier')->nullable();
            $table->string('grade_level')->nullable();
            $table->string('interest_major')->nullable();
            $table->enum('status', ['confirmed', 'waitlisted', 'cancelled'])->default('confirmed')->index();
            $table->enum('consent_status', ['not_required', 'pending', 'received', 'expired'])->default('not_required')->index();
            $table->boolean('is_minor')->default(true)->index();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_email')->nullable();
            $table->string('guardian_phone')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->text('medical_notes')->nullable();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->timestamps();

            $table->unique(['event_registration_id', 'email']);
            $table->index(['event_registration_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registration_students');
    }
};
