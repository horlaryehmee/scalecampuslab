<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('waitlist_signups', 'role')) {
            return;
        }

        Schema::table('waitlist_signups', function (Blueprint $table): void {
            $table->dropIndex('waitlist_signups_role_created_at_index');
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('waitlist_signups', 'role')) {
            return;
        }

        Schema::table('waitlist_signups', function (Blueprint $table): void {
            $table->enum('role', ['university', 'high_school', 'student'])->default('university')->after('email');
            $table->index(['role', 'created_at']);
        });
    }
};
