<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['school_code', 'name', 'city', 'region', 'country', 'latitude', 'longitude', 'district', 'coordinator_name', 'coordinator_email', 'status', 'school_type', 'performance_tier', 'average_sat', 'yield_rate', 'match_score', 'active_applicants', 'notes', 'is_demo'])]
class TargetSchool extends Model
{
    protected function casts(): array
    {
        return [
            'average_sat' => 'integer',
            'yield_rate' => 'decimal:2',
            'match_score' => 'integer',
            'active_applicants' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function visitRequests(): HasMany
    {
        return $this->hasMany(VisitRequest::class);
    }

    public function archives(): HasMany
    {
        return $this->hasMany(VisitArchive::class);
    }
}
