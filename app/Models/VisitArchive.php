<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['target_school_id', 'visited_on', 'visit_type', 'leads_captured', 'engagement_rate', 'quality_score', 'status', 'summary'])]
class VisitArchive extends Model
{
    protected function casts(): array
    {
        return [
            'visited_on' => 'date',
            'leads_captured' => 'integer',
            'engagement_rate' => 'decimal:2',
            'quality_score' => 'decimal:1',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(TargetSchool::class, 'target_school_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(VisitTask::class);
    }
}
