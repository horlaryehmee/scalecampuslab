<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['university_id', 'title', 'description', 'location', 'event_date', 'capacity', 'status'])]
class Event extends Model
{
    protected function casts(): array
    {
        return [
            'event_date' => 'datetime',
            'capacity' => 'integer',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(User::class, 'university_id');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    public function attendance(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function confirmedRegistrationsCount(): int
    {
        return $this->registrations()->where('status', 'confirmed')->count();
    }

    public function hasCapacity(): bool
    {
        return $this->confirmedRegistrationsCount() < $this->capacity;
    }
}
