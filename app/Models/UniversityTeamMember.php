<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'university_user_id',
    'name',
    'email',
    'title',
    'phone',
    'status',
    'permissions',
    'last_active_at',
])]
class UniversityTeamMember extends Model
{
    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'last_active_at' => 'datetime',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(User::class, 'university_user_id');
    }
}
