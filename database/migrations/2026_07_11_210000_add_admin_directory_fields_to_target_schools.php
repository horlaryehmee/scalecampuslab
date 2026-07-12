<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('target_schools', function (Blueprint $table): void {
            $table->string('school_code')->nullable()->unique()->after('id');
            $table->string('district')->nullable()->after('country');
            $table->string('coordinator_name')->nullable()->after('district');
            $table->string('coordinator_email')->nullable()->after('coordinator_name');
            $table->enum('status', ['verified', 'pending', 'suspended'])->default('verified')->index()->after('coordinator_email');
        });
    }

    public function down(): void
    {
        Schema::table('target_schools', function (Blueprint $table): void {
            $table->dropUnique(['school_code']);
            $table->dropColumn(['school_code', 'district', 'coordinator_name', 'coordinator_email', 'status']);
        });
    }
};
