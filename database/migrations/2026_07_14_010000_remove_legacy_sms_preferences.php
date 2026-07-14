<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('university_settings')) {
            DB::table('university_settings')
                ->select(['id', 'notification_preferences'])
                ->orderBy('id')
                ->each(function (object $setting): void {
                    $preferences = json_decode((string) $setting->notification_preferences, true);

                    if (! is_array($preferences) || ! array_key_exists('sms_enabled', $preferences)) {
                        return;
                    }

                    unset($preferences['sms_enabled']);

                    DB::table('university_settings')
                        ->where('id', $setting->id)
                        ->update(['notification_preferences' => json_encode($preferences)]);
                });
        }

        if (Schema::hasTable('project_milestones')) {
            DB::table('project_milestones')
                ->where('title', 'SMS delivery')
                ->delete();
        }
    }

    public function down(): void
    {
        // Removed notification-provider preferences are intentionally not restored.
    }
};
