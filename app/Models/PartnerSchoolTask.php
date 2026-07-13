<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

#[Fillable(['target_school_id', 'user_id', 'title', 'description', 'status', 'ai_suggested'])]
class PartnerSchoolTask extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope('universityTenant', function (Builder $query): void {
            $user = Auth::user();

            if ($user?->role === 'university') {
                $query->where($query->qualifyColumn('user_id'), $user->id);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'ai_suggested' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(TargetSchool::class, 'target_school_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
