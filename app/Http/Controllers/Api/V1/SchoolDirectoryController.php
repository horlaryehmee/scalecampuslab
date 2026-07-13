<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolDirectoryController extends WorkflowController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $this->workflow->normalizedRole($user);
        $query = School::query()
            ->withCount([
                'users as students_count' => fn ($builder) => $builder->where('role', 'student'),
                'users as coordinators_count' => fn ($builder) => $builder
                    ->whereIn('role', ['school', 'high_school'])
                    ->where('access_status', 'active')
                    ->whereNotNull('email_verified_at'),
            ])
            ->when(! in_array($role, ['university', 'admin'], true), function ($builder) use ($user): void {
                $user->school_id ? $builder->whereKey($user->school_id) : $builder->whereRaw('1 = 0');
            })
            ->when($request->filled('q'), fn ($builder) => $builder->where('name', 'like', '%'.$request->string('q')->toString().'%'))
            ->orderBy('name')
            ->get();

        return $this->data($query->map(fn (School $school) => [
            'id' => $school->id,
            'name' => $school->name,
            'location' => $school->location,
            'coordinator_name' => $school->coordinator_name,
            'coordinator_email' => $school->coordinator_email,
            'coordinator_phone' => $school->coordinator_phone,
            'students_count' => (int) $school->students_count,
            'coordinators_count' => (int) $school->coordinators_count,
            'can_receive_visits' => (int) $school->coordinators_count > 0,
            'updated_at' => $school->updated_at?->toIso8601String(),
        ])->all());
    }
}
