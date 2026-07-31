<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->string('contact_name')->nullable()->after('contact_details');
            $table->string('contact_title')->nullable()->after('contact_name');
            $table->string('contact_email')->nullable()->after('contact_title');
            $table->string('contact_phone')->nullable()->after('contact_email');
            $table->string('contact_office')->nullable()->after('contact_phone');
            $table->string('contact_website')->nullable()->after('contact_office');
        });
    }

    public function down(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->dropColumn([
                'contact_name',
                'contact_title',
                'contact_email',
                'contact_phone',
                'contact_office',
                'contact_website',
            ]);
        });
    }
};
