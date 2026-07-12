<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['target_school_id', 'campus_event_id', 'requested_by_user_id', 'requested_window', 'group_size', 'status', 'priority', 'notes', 'is_demo'])]
class VisitRequest extends Model
{
    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'group_size' => 'integer',
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
}
