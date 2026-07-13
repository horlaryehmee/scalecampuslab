<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends WorkflowController
{
    public function users(Request $request): JsonResponse
    {
        $this->requireRole($request, 'admin');
        $users = User::query()
            ->with('school:id,name')
            ->when($request->filled('role'), fn ($builder) => $builder->where('role', $request->string('role')))
            ->when($request->filled('access_status'), fn ($builder) => $builder->where('access_status', $request->string('access_status')))
            ->when($request->filled('q'), function ($builder) use ($request): void {
                $term = '%'.$request->string('q')->toString().'%';
                $builder->where(fn ($nested) => $nested->where('name', 'like', $term)->orWhere('email', 'like', $term));
            })
            ->latest()
            ->paginate(min(200, max(1, $request->integer('per_page', 50))));

        return $this->data(
            collect($users->items())->map(fn (User $user) => $this->userPayload($user))->all(),
            meta: [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        );
    }

    public function updateUser(Request $request, User $managedUser): JsonResponse
    {
        $actor = $this->requireRole($request, 'admin');
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($managedUser->id)],
            'role' => ['sometimes', Rule::in(['admin', 'university', 'school', 'student'])],
            'access_status' => ['sometimes', Rule::in(['active', 'pending', 'suspended'])],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
        ]);
        abort_if(
            $managedUser->is($actor)
            && (($validated['role'] ?? 'admin') !== 'admin' || ($validated['access_status'] ?? 'active') !== 'active'),
            422,
            'You cannot remove or suspend your own admin access.'
        );

        if (($validated['role'] ?? $managedUser->role) === 'student' || ($validated['role'] ?? $managedUser->role) === 'school') {
            $schoolId = array_key_exists('school_id', $validated) ? $validated['school_id'] : $managedUser->school_id;
            abort_unless($schoolId, 422, 'school_id is required for school and student accounts.');
        }

        DB::transaction(function () use ($managedUser, $validated, $actor): void {
            $managedUser->update($validated);
            $this->workflow->notifyUsers(
                [$managedUser, $actor],
                'Account updated by administrator',
                "{$managedUser->name}'s role or access settings were updated.",
                'admin.user_updated',
                null,
                User::class,
                $managedUser->id,
                ['role' => $managedUser->role, 'access_status' => $managedUser->access_status],
            );
        });

        return $this->data($this->userPayload($managedUser->fresh('school')));
    }

    public function settings(Request $request): JsonResponse
    {
        $this->requireRole($request, 'admin');
        $setting = PlatformSetting::find('admin.global');

        return $this->data([
            'key' => 'admin.global',
            'settings' => $setting?->value ?? [],
            'updated_at' => $setting?->updated_at?->toIso8601String(),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $actor = $this->requireRole($request, 'admin');
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.branding' => ['sometimes', 'array'],
            'settings.branding.platformName' => ['sometimes', 'string', 'max:120'],
            'settings.branding.supportEmail' => ['sometimes', 'email:rfc', 'max:160'],
            'settings.branding.primaryColor' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'settings.branding.logoUrl' => ['nullable', 'url', 'max:500'],
            'settings.localization' => ['sometimes', 'array'],
            'settings.localization.defaultLanguage' => ['sometimes', 'string', 'max:40'],
            'settings.localization.supportedLanguages' => ['sometimes', 'array', 'max:20'],
            'settings.localization.supportedLanguages.*' => ['string', 'max:40'],
            'settings.features' => ['sometimes', 'array'],
            'settings.features.*' => ['boolean'],
            'settings.security' => ['sometimes', 'array'],
            'settings.security.adminMfaRequired' => ['sometimes', 'boolean'],
            'settings.security.sessionTimeoutMinutes' => ['sometimes', 'integer', 'min:15', 'max:240'],
            'settings.security.passwordRotationDays' => ['sometimes', 'integer', 'min:30', 'max:365'],
            'settings.security.dataRetentionDays' => ['sometimes', 'integer', 'min:30', 'max:3650'],
            'settings.integrations' => ['sometimes', 'array'],
            'settings.integrations.apiKeyLabel' => ['nullable', 'string', 'max:100'],
            'settings.integrations.webhookUrl' => ['nullable', 'url', 'max:500'],
            'settings.integrations.lmsProvider' => ['nullable', 'string', 'max:100'],
        ]);
        $existing = PlatformSetting::find('admin.global')?->value ?? [];
        $settings = array_replace_recursive($existing, $validated['settings']);
        $settings['updatedBy'] = [
            'id' => $actor->id,
            'name' => $actor->name,
            'updatedAt' => now()->toIso8601String(),
        ];

        $setting = DB::transaction(function () use ($settings, $actor): PlatformSetting {
            $setting = PlatformSetting::updateOrCreate(['key' => 'admin.global'], ['value' => $settings]);
            $this->workflow->notifyUsers(
                [$actor],
                'System settings updated',
                'Global platform settings were updated.',
                'admin.settings_updated',
                null,
                PlatformSetting::class,
                null,
            );

            return $setting;
        });

        return $this->data([
            'key' => $setting->key,
            'settings' => $setting->value,
            'updated_at' => $setting->updated_at?->toIso8601String(),
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $this->workflow->normalizedRole($user),
            'access_status' => $user->access_status,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'school' => $user->school ? ['id' => $user->school->id, 'name' => $user->school->name] : null,
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }
}
