<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->string('logo_url')->nullable()->after('location');
            $table->string('coordinator_name')->nullable()->after('logo_url');
            $table->string('coordinator_email')->nullable()->after('coordinator_name');
            $table->string('coordinator_phone')->nullable()->after('coordinator_email');
            $table->boolean('email_notifications')->default(true)->after('coordinator_phone');
            $table->boolean('sms_alerts')->default(false)->after('email_notifications');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn([
                'logo_url',
                'coordinator_name',
                'coordinator_email',
                'coordinator_phone',
                'email_notifications',
                'sms_alerts',
            ]);
        });
    }
};
