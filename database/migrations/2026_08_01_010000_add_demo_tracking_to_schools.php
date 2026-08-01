<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            if (! Schema::hasColumn('schools', 'is_demo')) {
                $table->boolean('is_demo')->default(false)->index()->after('email_notifications');
            }
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            if (Schema::hasColumn('schools', 'is_demo')) {
                $table->dropColumn('is_demo');
            }
        });
    }
};
