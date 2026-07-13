<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailBehavior;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'phone', 'password', 'role', 'access_status', 'school_id', 'student_identifier', 'grade_level', 'interest_major', 'profile_photo_disk', 'profile_photo_path', 'assigned_events', 'date_of_birth', 'address', 'city', 'state', 'country', 'guardian_name', 'guardian_relationship', 'guardian_email', 'guardian_phone', 'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone', 'medical_notes', 'accessibility_needs', 'dietary_restrictions', 'consent_to_share', 'email_verified_at', 'is_demo', 'two_factor_enabled', 'security_alerts', 'recovery_email'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, MustVerifyEmailBehavior, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'assigned_events' => 'array',
            'date_of_birth' => 'date',
            'consent_to_share' => 'boolean',
            'is_demo' => 'boolean',
            'two_factor_enabled' => 'boolean',
            'security_alerts' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSchool(): bool
    {
        return in_array($this->role, ['school', 'high_school'], true);
    }

    public function campusEvents(): HasMany
    {
        return $this->hasMany(CampusEvent::class, 'university_user_id');
    }

    public function targetSchools(): HasMany
    {
        return $this->hasMany(TargetSchool::class, 'university_user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'university_id');
    }

    public function eventRegistrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function institutionPrograms(): HasMany
    {
        return $this->hasMany(InstitutionProgram::class, 'university_user_id');
    }

    public function admissionApplications(): HasMany
    {
        return $this->hasMany(AdmissionApplication::class, 'student_user_id');
    }

    public function academicRecords(): HasMany
    {
        return $this->hasMany(StudentAcademicRecord::class, 'student_user_id');
    }

    public function studentDocuments(): HasMany
    {
        return $this->hasMany(StudentDocument::class, 'student_user_id');
    }

    public function loginChallenges(): HasMany
    {
        return $this->hasMany(LoginChallenge::class);
    }
}
