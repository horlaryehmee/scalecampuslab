<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'campus_event_id',
    'visit_request_id',
    'user_id',
    'registrant_name',
    'registrant_email',
    'registrant_type',
    'party_size',
    'status',
    'consent_status',
    'is_minor',
    'guardian_name',
    'guardian_email',
    'guardian_phone',
    'emergency_contact_name',
    'emergency_contact_phone',
    'medical_notes',
    'attended_at',
    'checked_in_at',
    'checked_out_at',
    'waitlist_promoted_at',
    'student_confirmed_at',
    'imported_at',
    'import_batch',
    'is_demo',
])]
class EventRegistration extends Model
{
    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'is_minor' => 'boolean',
            'attended_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'waitlist_promoted_at' => 'datetime',
            'student_confirmed_at' => 'datetime',
            'imported_at' => 'datetime',
            'is_demo' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(CampusEvent::class, 'campus_event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(EventRegistrationStudent::class);
    }

    public function visitRequest(): BelongsTo
    {
        return $this->belongsTo(VisitRequest::class);
    }
}
