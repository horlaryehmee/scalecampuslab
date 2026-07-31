<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'university_user_id',
    'institution_name',
    'institution_code',
    'institution_type',
    'ownership',
    'accreditation',
    'founded_year',
    'website',
    'primary_contact_name',
    'primary_contact_email',
    'primary_contact_phone',
    'admissions_email',
    'admissions_phone',
    'outreach_contact_name',
    'outreach_contact_email',
    'outreach_contact_phone',
    'emergency_contact_name',
    'emergency_contact_phone',
    'address',
    'city',
    'state',
    'country',
    'region',
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
    'logo_url',
    'brand_color',
    'default_visit_config',
    'notification_preferences',
    'integration_settings',
    'timezone',
    'calendar_week_start',
])]
class UniversitySetting extends Model
{
    protected function casts(): array
    {
        return [
            'default_visit_config' => 'array',
            'notification_preferences' => 'array',
            'integration_settings' => 'array',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(User::class, 'university_user_id');
    }
}
