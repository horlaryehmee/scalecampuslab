<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            if (! Schema::hasColumn('schools', 'school_code')) {
                $table->string('school_code', 40)->nullable()->unique()->after('id');
            }
            if (! Schema::hasColumn('schools', 'school_type')) {
                $table->string('school_type', 80)->nullable()->after('name');
            }
            if (! Schema::hasColumn('schools', 'institution_level')) {
                $table->string('institution_level', 80)->nullable()->after('school_type');
            }
            if (! Schema::hasColumn('schools', 'ownership')) {
                $table->string('ownership', 80)->nullable()->after('institution_level');
            }
            if (! Schema::hasColumn('schools', 'district')) {
                $table->string('district', 160)->nullable()->after('country');
            }
            if (! Schema::hasColumn('schools', 'region')) {
                $table->string('region', 160)->nullable()->after('district');
            }
            if (! Schema::hasColumn('schools', 'timezone')) {
                $table->string('timezone', 80)->nullable()->after('region');
            }
            if (! Schema::hasColumn('schools', 'main_phone')) {
                $table->string('main_phone', 80)->nullable()->after('website');
            }
            if (! Schema::hasColumn('schools', 'admissions_email')) {
                $table->string('admissions_email', 160)->nullable()->after('coordinator_email');
            }
            if (! Schema::hasColumn('schools', 'registrar_email')) {
                $table->string('registrar_email', 160)->nullable()->after('admissions_email');
            }
            if (! Schema::hasColumn('schools', 'principal_email')) {
                $table->string('principal_email', 160)->nullable()->after('principal_name');
            }
            if (! Schema::hasColumn('schools', 'counselor_phone')) {
                $table->string('counselor_phone', 80)->nullable()->after('counselor_email');
            }
            if (! Schema::hasColumn('schools', 'emergency_contact_name')) {
                $table->string('emergency_contact_name', 160)->nullable()->after('counselor_phone');
            }
            if (! Schema::hasColumn('schools', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone', 80)->nullable()->after('emergency_contact_name');
            }
            if (! Schema::hasColumn('schools', 'emergency_contact_email')) {
                $table->string('emergency_contact_email', 160)->nullable()->after('emergency_contact_phone');
            }
            if (! Schema::hasColumn('schools', 'accreditation')) {
                $table->string('accreditation', 255)->nullable()->after('student_count');
            }
            if (! Schema::hasColumn('schools', 'curriculum')) {
                $table->string('curriculum', 255)->nullable()->after('accreditation');
            }
            if (! Schema::hasColumn('schools', 'academic_calendar')) {
                $table->string('academic_calendar', 120)->nullable()->after('curriculum');
            }
            if (! Schema::hasColumn('schools', 'graduation_rate')) {
                $table->decimal('graduation_rate', 5, 2)->nullable()->after('academic_calendar');
            }
            if (! Schema::hasColumn('schools', 'average_class_size')) {
                $table->unsignedSmallInteger('average_class_size')->nullable()->after('graduation_rate');
            }
            if (! Schema::hasColumn('schools', 'boarding_available')) {
                $table->boolean('boarding_available')->default(false)->after('average_class_size');
            }
            if (! Schema::hasColumn('schools', 'international_students')) {
                $table->boolean('international_students')->default(false)->after('boarding_available');
            }
            if (! Schema::hasColumn('schools', 'student_support_services')) {
                $table->text('student_support_services')->nullable()->after('international_students');
            }
            if (! Schema::hasColumn('schools', 'transportation_notes')) {
                $table->text('transportation_notes')->nullable()->after('student_support_services');
            }
            if (! Schema::hasColumn('schools', 'visit_policy')) {
                $table->text('visit_policy')->nullable()->after('transportation_notes');
            }
            if (! Schema::hasColumn('schools', 'safety_policy_url')) {
                $table->string('safety_policy_url', 500)->nullable()->after('visit_policy');
            }
            if (! Schema::hasColumn('schools', 'facebook_url')) {
                $table->string('facebook_url', 500)->nullable()->after('safety_policy_url');
            }
            if (! Schema::hasColumn('schools', 'linkedin_url')) {
                $table->string('linkedin_url', 500)->nullable()->after('facebook_url');
            }
            if (! Schema::hasColumn('schools', 'instagram_url')) {
                $table->string('instagram_url', 500)->nullable()->after('linkedin_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            foreach ([
                'instagram_url',
                'linkedin_url',
                'facebook_url',
                'safety_policy_url',
                'visit_policy',
                'transportation_notes',
                'student_support_services',
                'international_students',
                'boarding_available',
                'average_class_size',
                'graduation_rate',
                'academic_calendar',
                'curriculum',
                'accreditation',
                'emergency_contact_email',
                'emergency_contact_phone',
                'emergency_contact_name',
                'counselor_phone',
                'principal_email',
                'registrar_email',
                'admissions_email',
                'main_phone',
                'timezone',
                'region',
                'district',
                'ownership',
                'institution_level',
                'school_type',
                'school_code',
            ] as $column) {
                if (Schema::hasColumn('schools', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
