<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 60)->nullable()->after('email');
            }
            if (! Schema::hasColumn('users', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('interest_major');
            }
            if (! Schema::hasColumn('users', 'address')) {
                $table->string('address')->nullable()->after('date_of_birth');
            }
            if (! Schema::hasColumn('users', 'city')) {
                $table->string('city', 120)->nullable()->after('address');
            }
            if (! Schema::hasColumn('users', 'state')) {
                $table->string('state', 120)->nullable()->after('city');
            }
            if (! Schema::hasColumn('users', 'country')) {
                $table->string('country', 120)->nullable()->after('state');
            }
            if (! Schema::hasColumn('users', 'guardian_name')) {
                $table->string('guardian_name', 160)->nullable()->after('country');
            }
            if (! Schema::hasColumn('users', 'guardian_relationship')) {
                $table->string('guardian_relationship', 80)->nullable()->after('guardian_name');
            }
            if (! Schema::hasColumn('users', 'guardian_email')) {
                $table->string('guardian_email', 160)->nullable()->after('guardian_relationship');
            }
            if (! Schema::hasColumn('users', 'guardian_phone')) {
                $table->string('guardian_phone', 60)->nullable()->after('guardian_email');
            }
            if (! Schema::hasColumn('users', 'emergency_contact_name')) {
                $table->string('emergency_contact_name', 160)->nullable()->after('guardian_phone');
            }
            if (! Schema::hasColumn('users', 'emergency_contact_relationship')) {
                $table->string('emergency_contact_relationship', 80)->nullable()->after('emergency_contact_name');
            }
            if (! Schema::hasColumn('users', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone', 60)->nullable()->after('emergency_contact_relationship');
            }
            if (! Schema::hasColumn('users', 'medical_notes')) {
                $table->text('medical_notes')->nullable()->after('emergency_contact_phone');
            }
            if (! Schema::hasColumn('users', 'accessibility_needs')) {
                $table->text('accessibility_needs')->nullable()->after('medical_notes');
            }
            if (! Schema::hasColumn('users', 'dietary_restrictions')) {
                $table->string('dietary_restrictions')->nullable()->after('accessibility_needs');
            }
            if (! Schema::hasColumn('users', 'consent_to_share')) {
                $table->boolean('consent_to_share')->default(false)->after('dietary_restrictions');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            foreach ([
                'consent_to_share',
                'dietary_restrictions',
                'accessibility_needs',
                'medical_notes',
                'emergency_contact_phone',
                'emergency_contact_relationship',
                'emergency_contact_name',
                'guardian_phone',
                'guardian_email',
                'guardian_relationship',
                'guardian_name',
                'country',
                'state',
                'city',
                'address',
                'date_of_birth',
                'phone',
            ] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
