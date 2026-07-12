<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'campus_event_id', 'visit_request_id', 'position', 'planned_start_at', 'notes'])]
class SchoolItineraryItem extends Model
{
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'planned_start_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(CampusEvent::class, 'campus_event_id');
    }

    public function visitRequest(): BelongsTo
    {
        return $this->belongsTo(VisitRequest::class);
    }
}
