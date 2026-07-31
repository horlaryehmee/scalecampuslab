<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->string('share_slug')->nullable()->unique()->after('external_calendar_uid');
            $table->boolean('guest_registration_enabled')->default(true)->after('visibility')->index();
            $table->string('about')->nullable()->after('description');
            $table->longText('detailed_description')->nullable()->after('about');
            $table->text('audience')->nullable()->after('detailed_description');
            $table->text('agenda')->nullable()->after('audience');
            $table->text('requirements')->nullable()->after('agenda');
            $table->text('contact_details')->nullable()->after('requirements');
        });

        $used = [];
        DB::table('campus_events')->orderBy('id')->get(['id', 'title'])->each(function ($event) use (&$used): void {
            $base = Str::slug($event->title) ?: 'program';
            $slug = $base;
            $suffix = 2;

            while (isset($used[$slug])) {
                $slug = $base.'-'.$suffix;
                $suffix++;
            }

            $used[$slug] = true;
            DB::table('campus_events')->where('id', $event->id)->update(['share_slug' => $slug]);
        });
    }

    public function down(): void
    {
        Schema::table('campus_events', function (Blueprint $table): void {
            $table->dropColumn([
                'share_slug',
                'guest_registration_enabled',
                'about',
                'detailed_description',
                'audience',
                'agenda',
                'requirements',
                'contact_details',
            ]);
        });
    }
};
