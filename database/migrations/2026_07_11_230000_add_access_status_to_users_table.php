<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'access_status')) {
                $table->enum('access_status', ['active', 'pending', 'suspended'])
                    ->default('active')
                    ->after('role')
                    ->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'access_status')) {
                $table->dropColumn('access_status');
            }
        });
    }
};
