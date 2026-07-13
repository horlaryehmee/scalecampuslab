<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'name',
    'email',
    'phone',
    'organization',
    'subject',
    'message',
    'status',
])]
class ContactMessage extends Model
{
    // Contact submissions are deliberately persisted for the admin workflow.
}
