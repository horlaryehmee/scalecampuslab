<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'school_code',
    'school_type',
    'institution_level',
    'ownership',
    'location',
    'logo_url',
    'website',
    'main_phone',
    'address',
    'city',
    'state',
    'country',
    'district',
    'region',
    'timezone',
    'coordinator_name',
    'coordinator_email',
    'admissions_email',
    'registrar_email',
    'coordinator_phone',
    'principal_name',
    'principal_email',
    'counselor_name',
    'counselor_email',
    'counselor_phone',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_email',
    'grade_range',
    'student_count',
    'accreditation',
    'curriculum',
    'academic_calendar',
    'graduation_rate',
    'average_class_size',
    'boarding_available',
    'international_students',
    'student_support_services',
    'transportation_notes',
    'visit_policy',
    'safety_policy_url',
    'facebook_url',
    'linkedin_url',
    'instagram_url',
    'visit_notes',
    'email_notifications',
])]
class School extends Model
{
    protected function casts(): array
    {
        return [
            'email_notifications' => 'boolean',
            'boarding_available' => 'boolean',
            'international_students' => 'boolean',
            'graduation_rate' => 'decimal:2',
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
