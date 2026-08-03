<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('school_itinerary_items', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'campus_event_id']);
            $table->string('stop_type')->default('program')->after('visit_request_id');
            $table->string('title')->nullable()->after('stop_type');
            $table->string('location')->nullable()->after('title');
            $table->decimal('latitude', 10, 7)->nullable()->after('location');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });

        Schema::table('school_itinerary_items', function (Blueprint $table): void {
            $table->foreignId('campus_event_id')->nullable()->change();
            $table->unique(['user_id', 'campus_event_id', 'stop_type'], 'school_itinerary_user_event_type_unique');
            $table->index(['user_id', 'planned_start_at']);
        });
    }

    public function down(): void
    {
        Schema::table('school_itinerary_items', function (Blueprint $table): void {
            $table->dropUnique('school_itinerary_user_event_type_unique');
            $table->dropIndex(['user_id', 'planned_start_at']);
            $table->dropColumn(['stop_type', 'title', 'location', 'latitude', 'longitude']);
        });

        Schema::table('school_itinerary_items', function (Blueprint $table): void {
            $table->foreignId('campus_event_id')->nullable(false)->change();
            $table->unique(['user_id', 'campus_event_id']);
        });
    }
};
