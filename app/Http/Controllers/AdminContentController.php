<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\EmailTemplate;
use App\Models\Faq;
use App\Models\User;
use App\Services\PlatformNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminContentController extends Controller
{
    public function __construct(private readonly PlatformNotifier $notifier) {}

    public function storeAnnouncement(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $validated = $this->validateAnnouncement($request);

        $announcement = Announcement::create($this->announcementPayload($validated) + [
            'created_by_user_id' => $request->user()->id,
        ]);

        if ($announcement->status === 'published') {
            $this->notifyAnnouncementAudience($announcement);
        }

        return back()->with('status', 'Announcement created.');
    }

    public function updateAnnouncement(Request $request, Announcement $announcement): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $validated = $this->validateAnnouncement($request);
        $wasPublished = $announcement->status === 'published';
        $announcement->update($this->announcementPayload($validated, $announcement));

        if (! $wasPublished && $announcement->status === 'published') {
            $this->notifyAnnouncementAudience($announcement);
        }

        return back()->with('status', 'Announcement updated.');
    }

    public function destroyAnnouncement(Request $request, Announcement $announcement): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $announcement->delete();

        return back()->with('status', 'Announcement deleted.');
    }

    public function storeFaq(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);
        Faq::create($this->validateFaq($request));

        return back()->with('status', 'FAQ created.');
    }

    public function updateFaq(Request $request, Faq $faq): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $faq->update($this->validateFaq($request));

        return back()->with('status', 'FAQ updated.');
    }

    public function destroyFaq(Request $request, Faq $faq): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $faq->delete();

        return back()->with('status', 'FAQ deleted.');
    }

    public function storeEmailTemplate(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $validated = $this->validateEmailTemplate($request);
        EmailTemplate::create($validated + ['updated_by_user_id' => $request->user()->id]);

        return back()->with('status', 'Email template created.');
    }

    public function updateEmailTemplate(Request $request, EmailTemplate $emailTemplate): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $validated = $this->validateEmailTemplate($request, $emailTemplate);
        $emailTemplate->update($validated + ['updated_by_user_id' => $request->user()->id]);

        return back()->with('status', 'Email template updated.');
    }

    public function destroyEmailTemplate(Request $request, EmailTemplate $emailTemplate): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $emailTemplate->delete();

        return back()->with('status', 'Email template deleted.');
    }

    /** @return array<string, mixed> */
    private function validateAnnouncement(Request $request): array
    {
        return $request->validate([
            'audience' => ['required', Rule::in(['all', 'admin', 'university', 'school', 'student'])],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);
    }

    /** @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    private function announcementPayload(array $validated, ?Announcement $announcement = null): array
    {
        return $validated + [
            'published_at' => $validated['status'] === 'published'
                ? ($announcement?->published_at ?? now())
                : null,
        ];
    }

    /** @return array<string, mixed> */
    private function validateFaq(Request $request): array
    {
        return $request->validate([
            'audience' => ['required', Rule::in(['all', 'university', 'school', 'student'])],
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string', 'max:10000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'is_published' => ['nullable', 'boolean'],
        ]) + [
            'sort_order' => $request->integer('sort_order'),
            'is_published' => $request->boolean('is_published'),
        ];
    }

    /** @return array<string, mixed> */
    private function validateEmailTemplate(Request $request, ?EmailTemplate $template = null): array
    {
        return $request->validate([
            'key' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9._-]+$/', Rule::unique('email_templates', 'key')->ignore($template?->id)],
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:20000'],
            'enabled' => ['nullable', 'boolean'],
        ]) + ['enabled' => $request->boolean('enabled')];
    }

    private function notifyAnnouncementAudience(Announcement $announcement): void
    {
        User::query()
            ->where('access_status', 'active')
            ->when($announcement->audience !== 'all', function ($query) use ($announcement): void {
                $roles = $announcement->audience === 'school' ? ['school', 'high_school'] : [$announcement->audience];
                $query->whereIn('role', $roles);
            })
            ->select(['id', 'name', 'email'])
            ->chunkById(200, function ($users) use ($announcement): void {
                DB::transaction(function () use ($users, $announcement): void {
                    foreach ($users as $user) {
                        $this->notifier->notify(
                            $user,
                            $announcement->title,
                            $announcement->body,
                            'announcement.published',
                            ['announcement_id' => $announcement->id],
                            false,
                        );
                    }
                });
            });
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
