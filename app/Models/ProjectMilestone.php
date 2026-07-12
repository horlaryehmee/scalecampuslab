<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['category', 'title', 'description', 'status', 'sort_order'])]
class ProjectMilestone extends Model
{
}
