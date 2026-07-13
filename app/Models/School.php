<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'location',
    'logo_url',
    'coordinator_name',
    'coordinator_email',
    'coordinator_phone',
    'email_notifications',
    'sms_alerts',
])]
class School extends Model
{
    protected function casts(): array
    {
        return [
            'email_notifications' => 'boolean',
            'sms_alerts' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    public function institutionPrograms(): HasMany
    {
        return $this->hasMany(InstitutionProgram::class);
    }

    public function visitRequests(): HasMany
    {
        return $this->hasMany(VisitRequest::class);
    }
}
