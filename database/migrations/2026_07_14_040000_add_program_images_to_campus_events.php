<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->string('hero_image_url')->nullable()->after('contact_details');
            $table->string('hero_image_alt')->nullable()->after('hero_image_url');
            $table->json('gallery_image_urls')->nullable()->after('hero_image_alt');
        });
    }

    public function down(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->dropColumn([
                'hero_image_url',
                'hero_image_alt',
                'gallery_image_urls',
            ]);
        });
    }
};
