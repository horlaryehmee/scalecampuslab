<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\CampusEvent;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\EventRegistrationStudent;
use App\Models\Registration;
use App\Models\School;
use App\Models\SystemLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function users(): JsonResponse
    {
        return response()->json(User::query()->with('school:id,name')->paginate(50));
    }

    public function universities(): JsonResponse
    {
        return response()->json(User::query()
            ->where('role', 'university')
            ->withCount('events')
            ->orderBy('name')
            ->paginate(50));
    }

    public function schools(): JsonResponse
    {
        return response()->json(School::query()
            ->withCount(['users', 'registrations'])
            ->orderBy('name')
            ->paginate(50));
    }

    public function storeUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'university', 'school', 'student'])],
            'school_id' => ['nullable', 'exists:schools,id'],
        ]);

        if (in_array($validated['role'], ['school', 'student'], true)) {
            abort_unless($validated['school_id'] ?? null, 422, 'school_id is required for school and student accounts.');
        }

        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);
        $this->log($request, 'user.created', $user, ['role' => $user->role]);

        return response()->json($user, 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email:rfc', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['sometimes', Rule::in(['admin', 'university', 'school', 'student'])],
            'school_id' => ['nullable', 'exists:schools,id'],
        ]);

        $nextRole = $validated['role'] ?? $user->role;
        if (in_array($nextRole, ['school', 'student'], true)) {
            abort_unless(array_key_exists('school_id', $validated) ? $validated['school_id'] : $user->school_id, 422, 'school_id is required for school and student accounts.');
        }

        $user->update($validated);
        $this->log($request, 'user.updated', $user, ['role' => $user->role]);

        return response()->json($user);
    }

    public function destroyUser(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 422, 'You cannot delete your own administrator account.');
        abort_if(
            $user->role === 'university' && CampusEvent::query()->where('university_user_id', $user->id)->exists(),
            409,
            'This university owns campus events. Suspend the account or transfer its events instead.'
        );
        abort_if(
            $user->role === 'student' && (
                EventRegistration::query()->where('user_id', $user->id)->exists()
                || EventRegistrationStudent::query()->where('user_id', $user->id)->exists()
            ),
            409,
            'This student has campus participation records. Suspend the account to preserve attendance history.'
        );

        $this->log($request, 'user.deleted', $user, ['email' => $user->email, 'role' => $user->role]);
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    public function events(): JsonResponse
    {
        return response()->json(Event::query()
            ->with('university:id,name,email')
            ->withCount([
                'registrations as confirmed_count' => fn ($query) => $query->where('status', 'confirmed'),
                'registrations as waitlisted_count' => fn ($query) => $query->where('status', 'waitlisted'),
            ])
            ->latest('event_date')
            ->paginate(50));
    }

    public function analytics(): JsonResponse
    {
        $registrationsByDay = Registration::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->limit(14)
            ->get();

        return response()->json([
            'users' => User::count(),
            'universities' => User::where('role', 'university')->count(),
            'schools' => School::count(),
            'students' => User::where('role', 'student')->count(),
            'events' => Event::count(),
            'registrations' => Registration::count(),
            'applications' => Application::count(),
            'published_events' => Event::where('status', 'published')->count(),
            'cancelled_events' => Event::where('status', 'cancelled')->count(),
            'waitlisted_registrations' => Registration::where('status', 'waitlisted')->count(),
            'engagement_trends' => $registrationsByDay,
        ]);
    }

    public function logs(): JsonResponse
    {
        return response()->json(SystemLog::query()
            ->with('user:id,name,email,role')
            ->latest()
            ->paginate(75));
    }

    private function log(Request $request, string $action, object $subject, array $metadata = []): void
    {
        SystemLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => $subject::class,
            'subject_id' => $subject->id ?? null,
            'metadata' => $metadata,
        ]);
    }
}
