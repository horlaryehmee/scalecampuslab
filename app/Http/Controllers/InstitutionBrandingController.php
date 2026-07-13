<?php

namespace App\Http\Controllers;

use App\Models\UniversitySetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;

class InstitutionBrandingController extends Controller
{
    public function universityLogo(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->role === 'university', 403);
        $validated = $request->validate(['logo' => ['required', File::image()->max(5 * 1024)]]);

        $settings = UniversitySetting::query()->firstOrCreate(['university_user_id' => $user->id]);
        $this->deletePublicPath($settings->logo_url);
        $settings->update(['logo_url' => Storage::disk('public')->url($validated['logo']->store('institution-logos/'.$user->id, 'public'))]);

        return back()->with('status', 'University logo updated.');
    }

    public function schoolLogo(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->isSchool() && $user->school_id, 403);
        $validated = $request->validate(['logo' => ['required', File::image()->max(5 * 1024)]]);

        $school = $user->school;
        $this->deletePublicPath($school->logo_url);
        $school->update(['logo_url' => Storage::disk('public')->url($validated['logo']->store('school-logos/'.$school->id, 'public'))]);

        return back()->with('status', 'School logo updated.');
    }

    private function deletePublicPath(?string $url): void
    {
        if (! $url || ! str_contains($url, '/storage/')) {
            return;
        }

        Storage::disk('public')->delete(Str::after($url, '/storage/'));
    }
}
