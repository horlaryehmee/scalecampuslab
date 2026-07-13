<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['student_user_id', 'institution_name', 'qualification', 'graduation_year', 'gpa', 'result_summary'])]
class StudentAcademicRecord extends Model
{
    protected function casts(): array
    {
        return [
            'graduation_year' => 'integer',
            'gpa' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }
}
