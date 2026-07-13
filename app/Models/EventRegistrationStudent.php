<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'event_registration_id',
    'user_id',
    'name',
    'email',
    'student_identifier',
    'grade_level',
    'interest_major',
    'status',
    'consent_status',
    'is_minor',
    'guardian_name',
    'guardian_email',
    'guardian_phone',
    'emergency_contact_name',
    'emergency_contact_phone',
    'medical_notes',
    'checked_in_at',
    'checked_out_at',
    'student_confirmed_at',
])]
class EventRegistrationStudent extends Model
{
    protected function casts(): array
    {
        return [
            'is_minor' => 'boolean',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'student_confirmed_at' => 'datetime',
        ];
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(EventRegistration::class, 'event_registration_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
