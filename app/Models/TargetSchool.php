<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

#[Fillable(['university_user_id', 'school_code', 'name', 'city', 'region', 'country', 'latitude', 'longitude', 'district', 'coordinator_name', 'coordinator_email', 'status', 'school_type', 'performance_tier', 'average_sat', 'yield_rate', 'match_score', 'active_applicants', 'notes', 'is_demo'])]
class TargetSchool extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope('universityTenant', function (Builder $query): void {
            $user = Auth::user();

            if ($user?->role === 'university') {
                $query->where(function (Builder $tenantQuery) use ($user): void {
                    $tenantQuery
                        ->where($tenantQuery->qualifyColumn('university_user_id'), $user->id)
                        ->orWhereNull($tenantQuery->qualifyColumn('university_user_id'));
                });
            }
        });

        static::creating(function (TargetSchool $school): void {
            $user = Auth::user();

            if ($school->university_user_id === null && $user?->role === 'university') {
                $school->university_user_id = $user->id;
            }
        });
    }

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

    public function university(): BelongsTo
    {
        return $this->belongsTo(User::class, 'university_user_id');
    }

    public function visitRequests(): HasMany
    {
        return $this->hasMany(VisitRequest::class);
    }

    public function archives(): HasMany
    {
        return $this->hasMany(VisitArchive::class);
    }

    public function partnerTasks(): HasMany
    {
        return $this->hasMany(PartnerSchoolTask::class);
    }
}
