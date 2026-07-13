<?php

namespace App\Http\Controllers;

use App\Models\AdmissionApplication;
use App\Models\StudentAcademicRecord;
use App\Models\StudentDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentPortfolioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'student', 403);

        return response()->json([
            'academic_records' => $request->user()->academicRecords()->latest()->get(),
            'documents' => $request->user()->studentDocuments()
                ->with('application:id,reference,status')
                ->latest()
                ->get()
                ->map(fn (StudentDocument $document) => $this->documentData($document)),
        ]);
    }

    public function storeAcademicRecord(Request $request): RedirectResponse|JsonResponse
    {
        $student = $request->user();
        abort_unless($student?->role === 'student', 403);

        $record = StudentAcademicRecord::create($this->validateAcademicRecord($request) + [
            'student_user_id' => $student->id,
        ]);

        return $this->success($request, $record, 'Academic record added.', 201);
    }

    public function updateAcademicRecord(Request $request, StudentAcademicRecord $academicRecord): RedirectResponse|JsonResponse
    {
        abort_unless($request->user()?->role === 'student' && $academicRecord->student_user_id === $request->user()->id, 403);
        $academicRecord->update($this->validateAcademicRecord($request));

        return $this->success($request, $academicRecord, 'Academic record updated.');
    }

    public function destroyAcademicRecord(Request $request, StudentAcademicRecord $academicRecord): RedirectResponse|JsonResponse
    {
        abort_unless($request->user()?->role === 'student' && $academicRecord->student_user_id === $request->user()->id, 403);
        $academicRecord->delete();

        return $this->deleted($request, 'Academic record removed.');
    }

    public function storeDocument(Request $request): RedirectResponse|JsonResponse
    {
        $student = $request->user();
        abort_unless($student?->role === 'student', 403);

        $validated = $request->validate([
            'category' => ['required', Rule::in(['certificate', 'transcript', 'identity', 'recommendation', 'other'])],
            'admission_application_id' => ['nullable', 'integer', 'exists:admission_applications,id'],
            'document' => ['required', File::types(['pdf', 'jpg', 'jpeg', 'png'])->max(10 * 1024)],
        ]);

        if ($validated['admission_application_id'] ?? null) {
            abort_unless(AdmissionApplication::query()
                ->whereKey($validated['admission_application_id'])
                ->where('student_user_id', $student->id)
                ->exists(), 403);
        }

        $file = $request->file('document');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $path = $file->storeAs(
            'student-documents/'.$student->id,
            Str::uuid().'.'.$extension,
            'local',
        );

        $document = StudentDocument::create([
            'student_user_id' => $student->id,
            'admission_application_id' => $validated['admission_application_id'] ?? null,
            'category' => $validated['category'],
            'original_name' => Str::limit($file->getClientOriginalName(), 250, ''),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize(),
            'status' => 'uploaded',
        ]);

        return $this->success($request, $this->documentData($document), 'Document uploaded securely.', 201);
    }

    public function preview(Request $request, StudentDocument $document): StreamedResponse
    {
        $this->authorizeDocument($request, $document);
        abort_unless(in_array($document->mime_type, ['application/pdf', 'image/jpeg', 'image/png'], true), 415);

        return Storage::disk($document->disk)->response(
            $document->path,
            $document->original_name,
            ['Content-Type' => $document->mime_type, 'Content-Disposition' => 'inline; filename="'.addslashes($document->original_name).'"'],
        );
    }

    public function download(Request $request, StudentDocument $document): StreamedResponse
    {
        $this->authorizeDocument($request, $document);

        return Storage::disk($document->disk)->download($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
        ]);
    }

    public function destroyDocument(Request $request, StudentDocument $document): RedirectResponse|JsonResponse
    {
        abort_unless($request->user()?->role === 'student' && $document->student_user_id === $request->user()->id, 403);
        abort_if($document->status === 'verified', 422, 'Verified documents cannot be deleted.');
        abort_if($document->application && ! in_array($document->application->status, ['draft', 'withdrawn'], true), 422, 'Documents attached to a submitted application cannot be deleted.');

        Storage::disk($document->disk)->delete($document->path);
        $document->delete();

        return $this->deleted($request, 'Document deleted.');
    }

    public function reviewDocument(Request $request, StudentDocument $document): RedirectResponse|JsonResponse
    {
        $this->authorizeReviewer($request, $document);
        $validated = $request->validate(['status' => ['required', Rule::in(['verified', 'rejected'])]]);

        $document->update([
            'status' => $validated['status'],
            'reviewed_by_user_id' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return $this->success($request, $this->documentData($document), 'Document review saved.');
    }

    public function updateProfilePhoto(Request $request): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'profile_photo' => ['required', File::image()->max(5 * 1024)],
        ]);

        if ($user->profile_photo_path && $user->profile_photo_disk) {
            Storage::disk($user->profile_photo_disk)->delete($user->profile_photo_path);
        }

        $path = $validated['profile_photo']->store('profile-photos/'.$user->id, 'public');
        $user->update(['profile_photo_disk' => 'public', 'profile_photo_path' => $path]);

        return $this->success($request, [
            'profile_photo_url' => Storage::disk('public')->url($path),
        ], 'Profile image updated.');
    }

    /** @return array<string, mixed> */
    private function validateAcademicRecord(Request $request): array
    {
        return $request->validate([
            'institution_name' => ['required', 'string', 'max:180'],
            'qualification' => ['required', 'string', 'max:120'],
            'graduation_year' => ['nullable', 'integer', 'min:1950', 'max:'.(now()->year + 10)],
            'gpa' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'result_summary' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    private function authorizeDocument(Request $request, StudentDocument $document): void
    {
        if ($request->user()?->role === 'student' && $document->student_user_id === $request->user()->id) {
            return;
        }

        $this->authorizeReviewer($request, $document);
    }

    private function authorizeReviewer(Request $request, StudentDocument $document): void
    {
        $user = $request->user();
        if ($user?->role === 'admin') {
            return;
        }

        $document->loadMissing('application.program');
        $application = $document->application;
        $program = $application?->program;
        $wasSubmitted = $application?->submitted_at !== null
            && in_array($application->status, ['submitted', 'under_review', 'waitlisted', 'accepted', 'rejected', 'withdrawn'], true);
        $allowed = $wasSubmitted && $program && (
            ($user?->role === 'university' && $program->university_user_id === $user->id)
            || ($user?->isSchool() && $user->school_id && $program->school_id === $user->school_id)
        );

        abort_unless($allowed, 403);
    }

    /** @return array<string, mixed> */
    private function documentData(StudentDocument $document): array
    {
        return [
            'id' => $document->id,
            'application_id' => $document->admission_application_id,
            'application_reference' => $document->application?->reference,
            'category' => $document->category,
            'original_name' => $document->original_name,
            'mime_type' => $document->mime_type,
            'size' => $document->size,
            'status' => $document->status,
            'preview_url' => route('student.documents.preview', $document),
            'download_url' => route('student.documents.download', $document),
            'created_at' => $document->created_at?->toIso8601String(),
        ];
    }

    private function success(Request $request, mixed $data, string $message, int $status = 200): RedirectResponse|JsonResponse
    {
        return $request->expectsJson()
            ? response()->json(['message' => $message, 'data' => $data], $status)
            : back()->with('status', $message);
    }

    private function deleted(Request $request, string $message): RedirectResponse|JsonResponse
    {
        return $request->expectsJson()
            ? response()->json(status: 204)
            : back()->with('status', $message);
    }
}
