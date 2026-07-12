<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['campus_event_id', 'user_id', 'registrant_name', 'registrant_email', 'registrant_type', 'party_size', 'status', 'attended_at', 'is_demo'])]
class EventRegistration extends Model
{
    protected function casts(): array
    {
        return [
            'party_size' => 'integer',
            'attended_at' => 'datetime',
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
}
