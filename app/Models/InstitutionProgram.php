<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'university_user_id',
    'school_id',
    'institution_type',
    'name',
    'code',
    'level',
    'description',
    'requirements',
    'location',
    'application_deadline',
    'application_fee',
    'currency',
    'capacity',
    'status',
])]
class InstitutionProgram extends Model
{
    protected function casts(): array
    {
        return [
            'application_deadline' => 'datetime',
            'application_fee' => 'decimal:2',
            'capacity' => 'integer',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(User::class, 'university_user_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(AdmissionApplication::class);
    }

    public function institutionName(): string
    {
        return $this->institution_type === 'university'
            ? ($this->university?->name ?? 'University')
            : ($this->school?->name ?? 'School');
    }
}
