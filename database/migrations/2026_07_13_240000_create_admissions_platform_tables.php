<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('profile_photo_disk', 32)->nullable()->after('interest_major');
            $table->string('profile_photo_path')->nullable()->after('profile_photo_disk');
        });

        Schema::create('institution_programs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('university_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('school_id')->nullable()->constrained('schools')->restrictOnDelete();
            $table->enum('institution_type', ['university', 'school'])->index();
            $table->string('name');
            $table->string('code', 40);
            $table->string('level', 80)->nullable();
            $table->text('description')->nullable();
            $table->text('requirements')->nullable();
            $table->string('location')->nullable();
            $table->dateTime('application_deadline')->nullable()->index();
            $table->decimal('application_fee', 12, 2)->default(0);
            $table->char('currency', 3)->default('NGN');
            $table->unsignedInteger('capacity')->nullable();
            $table->enum('status', ['draft', 'published', 'closed'])->default('draft')->index();
            $table->timestamps();

            $table->index(['university_user_id', 'status']);
            $table->index(['school_id', 'status']);
            $table->unique(['university_user_id', 'code'], 'program_university_code_unique');
            $table->unique(['school_id', 'code'], 'program_school_code_unique');
        });

        Schema::create('admission_applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('institution_program_id')->constrained('institution_programs')->restrictOnDelete();
            $table->string('reference', 40)->unique();
            $table->enum('status', ['draft', 'submitted', 'under_review', 'waitlisted', 'accepted', 'rejected', 'withdrawn'])->default('draft')->index();
            $table->text('personal_statement')->nullable();
            $table->text('academic_summary')->nullable();
            $table->text('decision_note')->nullable();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['student_user_id', 'institution_program_id'], 'application_student_program_unique');
            $table->index(['institution_program_id', 'status']);
        });

        Schema::create('student_academic_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('institution_name');
            $table->string('qualification');
            $table->unsignedSmallInteger('graduation_year')->nullable();
            $table->decimal('gpa', 5, 2)->nullable();
            $table->text('result_summary')->nullable();
            $table->timestamps();
        });

        Schema::create('student_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('admission_application_id')->nullable()->constrained('admission_applications')->nullOnDelete();
            $table->enum('category', ['certificate', 'transcript', 'identity', 'recommendation', 'profile_image', 'other'])->index();
            $table->string('original_name');
            $table->string('disk', 32)->default('local');
            $table->string('path')->unique();
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size');
            $table->enum('status', ['uploaded', 'verified', 'rejected'])->default('uploaded')->index();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('application_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('admission_application_id')->constrained('admission_applications')->restrictOnDelete();
            $table->foreignId('student_user_id')->constrained('users')->restrictOnDelete();
            $table->string('provider', 40)->default('paystack');
            $table->string('reference', 80)->unique();
            $table->string('gateway_reference', 120)->nullable()->unique();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('NGN');
            $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending')->index();
            $table->text('authorization_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['admission_application_id', 'status']);
        });

        Schema::create('conversations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('admission_application_id')->nullable()->constrained('admission_applications')->nullOnDelete();
            $table->string('subject', 180);
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('conversation_participants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
            $table->index(['user_id', 'last_read_at']);
        });

        Schema::create('conversation_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('sender_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('student_document_id')->nullable()->constrained('student_documents')->nullOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
        });

        Schema::create('announcements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('audience', ['all', 'admin', 'university', 'school', 'student'])->default('all')->index();
            $table->string('title');
            $table->text('body');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('faqs', function (Blueprint $table): void {
            $table->id();
            $table->enum('audience', ['all', 'university', 'school', 'student'])->default('all')->index();
            $table->string('question');
            $table->text('answer');
            $table->unsignedSmallInteger('sort_order')->default(0)->index();
            $table->boolean('is_published')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('email_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('name');
            $table->string('subject');
            $table->text('body');
            $table->boolean('enabled')->default(true);
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('faqs');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('conversation_messages');
        Schema::dropIfExists('conversation_participants');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('application_payments');
        Schema::dropIfExists('student_documents');
        Schema::dropIfExists('student_academic_records');
        Schema::dropIfExists('admission_applications');
        Schema::dropIfExists('institution_programs');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['profile_photo_disk', 'profile_photo_path']);
        });
    }
};
