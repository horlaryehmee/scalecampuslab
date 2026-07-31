<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('university_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'student_population',
                'undergraduate_population',
                'international_student_population',
                'acceptance_rate',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('university_settings', function (Blueprint $table): void {
            $table->unsignedInteger('student_population')->nullable()->after('founded_year');
            $table->unsignedInteger('undergraduate_population')->nullable()->after('student_population');
            $table->unsignedInteger('international_student_population')->nullable()->after('undergraduate_population');
            $table->decimal('acceptance_rate', 5, 2)->nullable()->after('international_student_population');
        });
    }
};
