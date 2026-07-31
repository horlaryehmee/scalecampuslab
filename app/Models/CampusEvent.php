<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['recurrence_parent_id', 'university_user_id', 'title', 'starts_at', 'ends_at', 'registration_opens_at', 'registration_closes_at', 'venue', 'location', 'latitude', 'longitude', 'description', 'about', 'detailed_description', 'audience', 'agenda', 'requirements', 'contact_details', 'contact_name', 'contact_title', 'contact_email', 'contact_phone', 'contact_office', 'contact_website', 'hero_image_url', 'hero_image_alt', 'gallery_image_urls', 'video_url', 'video_title', 'capacity', 'per_school_capacity', 'per_group_capacity', 'status', 'visibility', 'guest_registration_enabled', 'lifecycle_stage', 'recurrence_rule', 'recurrence_count', 'external_calendar_uid', 'share_slug', 'last_schedule_change_at', 'reminders_enabled', 'reminder_days_before', 'reminder_time', 'last_reminder_queued_at', 'invited_school_ids', 'lifecycle_log', 'is_demo'])]
class CampusEvent extends Model
{
    protected static function booted(): void
    {
        static::deleting(function (CampusEvent $event): void {
            if (VisitRequest::query()->where('campus_event_id', $event->id)->whereNotNull('school_id')->exists()) {
                throw new \LogicException('Canonical campus events with visit requests must be cancelled, not deleted.');
            }
        });
    }

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'registration_opens_at' => 'datetime',
            'registration_closes_at' => 'datetime',
            'last_schedule_change_at' => 'datetime',
            'reminders_enabled' => 'boolean',
            'guest_registration_enabled' => 'boolean',
            'reminder_days_before' => 'integer',
            'last_reminder_queued_at' => 'datetime',
            'capacity' => 'integer',
            'per_school_capacity' => 'integer',
            'per_group_capacity' => 'integer',
            'recurrence_count' => 'integer',
            'is_demo' => 'boolean',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'gallery_image_urls' => 'array',
            'invited_school_ids' => 'array',
            'lifecycle_log' => 'array',
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
