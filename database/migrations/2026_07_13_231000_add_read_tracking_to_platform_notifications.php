<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_notifications', function (Blueprint $table): void {
            $table->timestamp('read_at')->nullable()->after('sent_at');
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::table('platform_notifications', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'read_at']);
            $table->dropColumn('read_at');
        });
    }
};
