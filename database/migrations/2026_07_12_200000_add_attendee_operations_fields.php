<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_registrations', function (Blueprint $table) {
            $table->timestamp('checked_in_at')->nullable()->after('attended_at');
            $table->timestamp('checked_out_at')->nullable()->after('checked_in_at');
            $table->timestamp('waitlist_promoted_at')->nullable()->after('checked_out_at');
            $table->enum('consent_status', ['not_required', 'pending', 'received', 'expired'])->default('not_required')->index()->after('status');
            $table->boolean('is_minor')->default(false)->index()->after('consent_status');
            $table->string('guardian_name')->nullable()->after('is_minor');
            $table->string('guardian_email')->nullable()->after('guardian_name');
            $table->string('guardian_phone')->nullable()->after('guardian_email');
            $table->string('emergency_contact_name')->nullable()->after('guardian_phone');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            $table->text('medical_notes')->nullable()->after('emergency_contact_phone');
            $table->timestamp('imported_at')->nullable()->after('medical_notes');
            $table->string('import_batch')->nullable()->index()->after('imported_at');
        });
    }

    public function down(): void
    {
        Schema::table('event_registrations', function (Blueprint $table) {
            $table->dropColumn([
                'checked_in_at',
                'checked_out_at',
                'waitlist_promoted_at',
                'consent_status',
                'is_minor',
                'guardian_name',
                'guardian_email',
                'guardian_phone',
                'emergency_contact_name',
                'emergency_contact_phone',
                'medical_notes',
                'imported_at',
                'import_batch',
            ]);
        });
    }
};
