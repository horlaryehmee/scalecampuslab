<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('target_schools', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city');
            $table->string('region');
            $table->string('country')->default('United States');
            $table->enum('school_type', ['public', 'private', 'ib_school', 'charter'])->default('private');
            $table->enum('performance_tier', ['elite', 'high', 'emerging', 'stable'])->default('stable')->index();
            $table->unsignedSmallInteger('average_sat')->nullable();
            $table->decimal('yield_rate', 5, 2)->default(0);
            $table->unsignedTinyInteger('match_score')->default(0)->index();
            $table->unsignedInteger('active_applicants')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('visit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_school_id')->constrained('target_schools')->cascadeOnDelete();
            $table->foreignId('campus_event_id')->nullable()->constrained('campus_events')->nullOnDelete();
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('requested_window');
            $table->enum('status', ['requested', 'approved', 'scheduled', 'declined'])->default('requested')->index();
            $table->unsignedTinyInteger('priority')->default(1);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('visit_archives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_school_id')->constrained('target_schools')->cascadeOnDelete();
            $table->date('visited_on')->index();
            $table->string('visit_type')->default('School Fair');
            $table->unsignedInteger('leads_captured')->default(0);
            $table->decimal('engagement_rate', 5, 2)->default(0);
            $table->decimal('quality_score', 3, 1)->default(0);
            $table->enum('status', ['archived', 'synced', 'pending_sync'])->default('archived')->index();
            $table->text('summary')->nullable();
            $table->timestamps();
        });

        Schema::create('visit_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_archive_id')->constrained('visit_archives')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['open', 'done'])->default('open')->index();
            $table->boolean('ai_suggested')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_tasks');
        Schema::dropIfExists('visit_archives');
        Schema::dropIfExists('visit_requests');
        Schema::dropIfExists('target_schools');
    }
};
