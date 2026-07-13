<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('target_schools', function (Blueprint $table): void {
            $table->foreignId('university_user_id')
                ->nullable()
                ->after('id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->index(['university_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('target_schools', function (Blueprint $table): void {
            $table->dropIndex(['university_user_id', 'status']);
            $table->dropConstrainedForeignId('university_user_id');
        });
    }
};
