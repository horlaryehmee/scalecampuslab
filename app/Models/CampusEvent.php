<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['university_user_id', 'title', 'starts_at', 'ends_at', 'venue', 'location', 'latitude', 'longitude', 'description', 'capacity', 'status', 'is_demo'])]
class CampusEvent extends Model
{
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'capacity' => 'integer',
            'is_demo' => 'boolean',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(User::class, 'university_user_id');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function confirmedSeats(): int
    {
        return (int) $this->registrations()->where('status', 'confirmed')->sum('party_size');
    }

    public function remainingSeats(): int
    {
        return max(0, $this->capacity - $this->confirmedSeats());
    }
}
