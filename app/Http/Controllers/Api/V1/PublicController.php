<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Faq;
use App\Models\PlatformSetting;
use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    public function registrationOptions(): JsonResponse
    {
        $branding = PlatformSetting::find('admin.global')?->value['branding'] ?? [];

        return response()->json([
            'branding' => [
                'platform_name' => $branding['platformName'] ?? 'ScaleCampusLab',
                'support_email' => $branding['supportEmail'] ?? null,
                'primary_color' => $branding['primaryColor'] ?? '#075f56',
                'logo_url' => $branding['logoUrl'] ?? null,
            ],
            'schools' => School::query()
                ->orderBy('name')
                ->get(['id', 'name', 'location']),
        ]);
    }

    public function home(): JsonResponse
    {
        return $this->registrationOptions();
    }

    public function faqs(): JsonResponse
    {
        return response()->json([
            'data' => Faq::query()
                ->where('is_published', true)
                ->where('audience', 'all')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'question', 'answer'])
                ->map(fn (Faq $faq) => [
                    'id' => $faq->id,
                    'question' => $faq->question,
                    'answer' => $faq->answer,
                ]),
        ]);
    }

    public function contact(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email:rfc', 'max:180'],
            'phone' => ['nullable', 'string', 'max:60'],
            'organization' => ['nullable', 'string', 'max:180'],
            'subject' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        $contactMessage = ContactMessage::create($validated);

        return response()->json([
            'message' => 'Thanks for contacting ScaleCampusLab. Our team will follow up shortly.',
            'contact_message_id' => $contactMessage->id,
        ], 201);
    }
}
