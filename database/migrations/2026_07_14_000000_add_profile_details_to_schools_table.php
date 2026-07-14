<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            if (! Schema::hasColumn('schools', 'website')) {
                $table->string('website')->nullable()->after('logo_url');
            }
            if (! Schema::hasColumn('schools', 'address')) {
                $table->string('address')->nullable()->after('website');
            }
            if (! Schema::hasColumn('schools', 'city')) {
                $table->string('city', 120)->nullable()->after('address');
            }
            if (! Schema::hasColumn('schools', 'state')) {
                $table->string('state', 120)->nullable()->after('city');
            }
            if (! Schema::hasColumn('schools', 'country')) {
                $table->string('country', 120)->nullable()->after('state');
            }
            if (! Schema::hasColumn('schools', 'principal_name')) {
                $table->string('principal_name', 160)->nullable()->after('coordinator_phone');
            }
            if (! Schema::hasColumn('schools', 'counselor_name')) {
                $table->string('counselor_name', 160)->nullable()->after('principal_name');
            }
            if (! Schema::hasColumn('schools', 'counselor_email')) {
                $table->string('counselor_email', 160)->nullable()->after('counselor_name');
            }
            if (! Schema::hasColumn('schools', 'grade_range')) {
                $table->string('grade_range', 80)->nullable()->after('counselor_email');
            }
            if (! Schema::hasColumn('schools', 'student_count')) {
                $table->unsignedInteger('student_count')->nullable()->after('grade_range');
            }
            if (! Schema::hasColumn('schools', 'visit_notes')) {
                $table->text('visit_notes')->nullable()->after('student_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            foreach ([
                'visit_notes',
                'student_count',
                'grade_range',
                'counselor_email',
                'counselor_name',
                'principal_name',
                'country',
                'state',
                'city',
                'address',
                'website',
            ] as $column) {
                if (Schema::hasColumn('schools', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
