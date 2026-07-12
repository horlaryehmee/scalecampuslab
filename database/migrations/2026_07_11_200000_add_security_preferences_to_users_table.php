<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->boolean('two_factor_enabled')->default(false)->after('is_demo');
            }
            if (! Schema::hasColumn('users', 'security_alerts')) {
                $table->boolean('security_alerts')->default(true)->after('two_factor_enabled');
            }
            if (! Schema::hasColumn('users', 'recovery_email')) {
                $table->string('recovery_email')->nullable()->after('security_alerts');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            foreach (['recovery_email', 'security_alerts', 'two_factor_enabled'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
