<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->string('video_url')->nullable()->after('gallery_image_urls');
            $table->string('video_title', 180)->nullable()->after('video_url');
        });
    }

    public function down(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->dropColumn(['video_url', 'video_title']);
        });
    }
};
