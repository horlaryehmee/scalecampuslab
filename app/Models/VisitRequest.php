<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'target_school_id',
    'school_id',
    'campus_event_id',
    'requested_by_user_id',
    'responded_by_user_id',
    'requested_window',
    'group_size',
    'status',
    'priority',
    'notes',
    'responded_at',
    'decision_note',
    'is_demo',
])]
class VisitRequest extends Model
{
    protected static function booted(): void
    {
        static::saving(function (VisitRequest $visit): void {
            if ($visit->school_id !== null && $visit->campus_event_id === null) {
                throw new \LogicException('Canonical visit requests must belong to a campus event.');
            }
        });
    }

    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'group_size' => 'integer',
            'responded_at' => 'datetime',
            'is_demo' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(TargetSchool::class, 'target_school_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(CampusEvent::class, 'campus_event_id');
    }

    public function recipientSchool(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by_user_id');
    }
}
