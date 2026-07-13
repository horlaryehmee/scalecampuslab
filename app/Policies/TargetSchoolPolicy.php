<?php

namespace App\Policies;

use App\Models\TargetSchool;
use App\Models\User;

class TargetSchoolPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isAdmin() ? true : null;
    }

    public function view(User $user, TargetSchool $school): bool
    {
        return $user->role === 'university'
            && ($school->university_user_id === null || $school->university_user_id === $user->id);
    }

    public function manage(User $user, TargetSchool $school): bool
    {
        return $user->role === 'university'
            && $school->university_user_id === $user->id;
    }

    public function update(User $user, TargetSchool $school): bool
    {
        return $this->manage($user, $school);
    }

    public function delete(User $user, TargetSchool $school): bool
    {
        return $this->manage($user, $school);
    }
}
