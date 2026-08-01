<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_registration_students', function (Blueprint $table): void {
            if (! Schema::hasColumn('event_registration_students', 'absent_at')) {
                $table->timestamp('absent_at')->nullable()->after('checked_out_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_registration_students', function (Blueprint $table): void {
            if (Schema::hasColumn('event_registration_students', 'absent_at')) {
                $table->dropColumn('absent_at');
            }
        });
    }
};
