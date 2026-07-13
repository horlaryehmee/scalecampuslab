<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'token_hash', 'code_hash', 'context', 'remember', 'attempts', 'max_attempts', 'resend_count', 'last_sent_at', 'expires_at', 'consumed_at'])]
#[Hidden(['token_hash', 'code_hash'])]
class LoginChallenge extends Model
{
    protected function casts(): array
    {
        return [
            'remember' => 'boolean',
            'last_sent_at' => 'datetime',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
