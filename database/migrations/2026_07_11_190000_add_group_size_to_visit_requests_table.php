<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visit_requests', function (Blueprint $table): void {
            $table->unsignedInteger('group_size')->default(1)->after('requested_window');
        });
    }

    public function down(): void
    {
        Schema::table('visit_requests', function (Blueprint $table): void {
            $table->dropColumn('group_size');
        });
    }
};
