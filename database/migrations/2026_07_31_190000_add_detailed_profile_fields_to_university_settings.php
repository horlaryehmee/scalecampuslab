<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('university_settings', function (Blueprint $table): void {
            $table->string('institution_code', 40)->nullable()->unique()->after('institution_name');
            $table->string('institution_type', 100)->nullable()->after('institution_code');
            $table->string('ownership', 80)->nullable()->after('institution_type');
            $table->string('accreditation', 255)->nullable()->after('ownership');
            $table->string('founded_year', 12)->nullable()->after('accreditation');
            $table->unsignedInteger('student_population')->nullable()->after('founded_year');
            $table->unsignedInteger('undergraduate_population')->nullable()->after('student_population');
            $table->unsignedInteger('international_student_population')->nullable()->after('undergraduate_population');
            $table->decimal('acceptance_rate', 5, 2)->nullable()->after('international_student_population');
            $table->string('city', 120)->nullable()->after('address');
            $table->string('state', 120)->nullable()->after('city');
            $table->string('country', 120)->nullable()->after('state');
            $table->string('admissions_email', 180)->nullable()->after('primary_contact_phone');
            $table->string('admissions_phone', 80)->nullable()->after('admissions_email');
            $table->string('outreach_contact_name', 160)->nullable()->after('admissions_phone');
            $table->string('outreach_contact_email', 180)->nullable()->after('outreach_contact_name');
            $table->string('outreach_contact_phone', 80)->nullable()->after('outreach_contact_email');
            $table->string('emergency_contact_name', 160)->nullable()->after('outreach_contact_phone');
            $table->string('emergency_contact_phone', 80)->nullable()->after('emergency_contact_name');
            $table->string('public_profile_summary', 500)->nullable()->after('region');
            $table->text('about')->nullable()->after('public_profile_summary');
            $table->text('academic_strengths')->nullable()->after('about');
            $table->text('student_support_services')->nullable()->after('academic_strengths');
            $table->text('international_student_support')->nullable()->after('student_support_services');
            $table->text('accessibility_services')->nullable()->after('international_student_support');
            $table->text('visit_policy')->nullable()->after('accessibility_services');
            $table->text('safety_policy')->nullable()->after('visit_policy');
            $table->string('campus_map_url', 500)->nullable()->after('safety_policy');
            $table->string('virtual_tour_url', 500)->nullable()->after('campus_map_url');
            $table->string('facebook_url', 500)->nullable()->after('virtual_tour_url');
            $table->string('linkedin_url', 500)->nullable()->after('facebook_url');
            $table->string('instagram_url', 500)->nullable()->after('linkedin_url');
            $table->string('youtube_url', 500)->nullable()->after('instagram_url');
        });
    }

    public function down(): void
    {
        Schema::table('university_settings', function (Blueprint $table): void {
            $table->dropUnique(['institution_code']);
            $table->dropColumn([
                'institution_code',
                'institution_type',
                'ownership',
                'accreditation',
                'founded_year',
                'student_population',
                'undergraduate_population',
                'international_student_population',
                'acceptance_rate',
                'city',
                'state',
                'country',
                'admissions_email',
                'admissions_phone',
                'outreach_contact_name',
                'outreach_contact_email',
                'outreach_contact_phone',
                'emergency_contact_name',
                'emergency_contact_phone',
                'public_profile_summary',
                'about',
                'academic_strengths',
                'student_support_services',
                'international_student_support',
                'accessibility_services',
                'visit_policy',
                'safety_policy',
                'campus_map_url',
                'virtual_tour_url',
                'facebook_url',
                'linkedin_url',
                'instagram_url',
                'youtube_url',
            ]);
        });
    }
};
