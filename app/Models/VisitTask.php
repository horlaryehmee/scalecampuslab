<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['visit_archive_id', 'title', 'description', 'status', 'ai_suggested'])]
class VisitTask extends Model
{
    protected function casts(): array
    {
        return [
            'ai_suggested' => 'boolean',
        ];
    }

    public function archive(): BelongsTo
    {
        return $this->belongsTo(VisitArchive::class, 'visit_archive_id');
    }
}
