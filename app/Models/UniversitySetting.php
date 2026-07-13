<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'university_user_id',
    'institution_name',
    'website',
    'primary_contact_name',
    'primary_contact_email',
    'primary_contact_phone',
    'address',
    'region',
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
