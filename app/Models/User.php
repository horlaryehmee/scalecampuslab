<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'access_status', 'school_id', 'student_identifier', 'grade_level', 'interest_major', 'assigned_events', 'email_verified_at', 'is_demo', 'two_factor_enabled', 'security_alerts', 'recovery_email'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

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
}
