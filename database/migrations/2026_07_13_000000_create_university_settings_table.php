<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('university_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('university_user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('institution_name')->nullable();
            $table->string('website')->nullable();
            $table->string('primary_contact_name')->nullable();
            $table->string('primary_contact_email')->nullable();
            $table->string('primary_contact_phone')->nullable();
            $table->string('address')->nullable();
            $table->string('region')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('brand_color', 32)->default('#006a61');
            $table->json('default_visit_config')->nullable();
            $table->json('notification_preferences')->nullable();
            $table->json('integration_settings')->nullable();
            $table->string('timezone')->default('UTC');
            $table->string('calendar_week_start', 16)->default('monday');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('university_settings');
    }
};
