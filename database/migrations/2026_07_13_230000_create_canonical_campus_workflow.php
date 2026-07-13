<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visit_requests', function (Blueprint $table): void {
            // Legacy recruitment records still use target_school_id. Canonical
            // campus visits use school_id, so the legacy relation must be optional.
            $table->unsignedBigInteger('target_school_id')->nullable()->change();
            $table->foreignId('school_id')
                ->nullable()
                ->after('target_school_id')
                ->constrained('schools')
                ->restrictOnDelete();
            $table->foreignId('responded_by_user_id')
                ->nullable()
                ->after('requested_by_user_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('responded_at')->nullable()->after('status');
            $table->text('decision_note')->nullable()->after('responded_at');

            $table->unique(['campus_event_id', 'school_id']);
            $table->index(['school_id', 'status', 'created_at']);
        });

        Schema::table('event_registrations', function (Blueprint $table): void {
            $table->foreignId('visit_request_id')
                ->nullable()
                ->after('campus_event_id')
                ->constrained('visit_requests')
                ->restrictOnDelete();

            $table->index(['visit_request_id', 'status']);
        });

        Schema::create('event_itinerary_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campus_event_id')->constrained('campus_events')->cascadeOnDelete();
            $table->foreignId('visit_request_id')->nullable()->constrained('visit_requests')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->string('location')->nullable();
            $table->unsignedSmallInteger('position')->default(1);
            $table->timestamps();

            $table->index(['campus_event_id', 'position']);
            $table->index(['visit_request_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_itinerary_items');

        Schema::table('event_registrations', function (Blueprint $table): void {
            $table->dropIndex(['visit_request_id', 'status']);
            $table->dropConstrainedForeignId('visit_request_id');
        });

        Schema::table('visit_requests', function (Blueprint $table): void {
            $table->dropUnique(['campus_event_id', 'school_id']);
            $table->dropIndex(['school_id', 'status', 'created_at']);
            $table->dropConstrainedForeignId('responded_by_user_id');
            $table->dropConstrainedForeignId('school_id');
            $table->dropColumn(['responded_at', 'decision_note']);
        });

        // Rows created by this workflow have no legacy target_school_id and
        // cannot be represented by the old non-null schema after rollback.
        DB::table('visit_requests')->whereNull('target_school_id')->delete();

        Schema::table('visit_requests', function (Blueprint $table): void {
            $table->unsignedBigInteger('target_school_id')->nullable(false)->change();
        });
    }
};
