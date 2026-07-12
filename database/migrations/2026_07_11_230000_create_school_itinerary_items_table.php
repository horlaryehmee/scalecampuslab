<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_itinerary_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campus_event_id')->constrained('campus_events')->cascadeOnDelete();
            $table->foreignId('visit_request_id')->nullable()->constrained('visit_requests')->nullOnDelete();
            $table->unsignedInteger('position')->default(1);
            $table->dateTime('planned_start_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'campus_event_id']);
            $table->index(['user_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_itinerary_items');
    }
};
