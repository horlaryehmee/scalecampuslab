<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($this->data($request->user()));
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $data = $this->data($request->user());

        return response()->streamDownload(function () use ($data): void {
            echo '<table>';
            echo "<tr><th colspan='4'>Campus Visit Report</th></tr>";
            echo '<tr><th>Event</th><th>Date</th><th>Registrations</th><th>Type</th></tr>';
            foreach ($data['registrations_per_event'] as $event) {
                echo '<tr><td>'.e($event->title).'</td><td>'.e((string) $event->event_date).'</td><td>'.e((string) $event->registrations_count).'</td><td>Registrations</td></tr>';
            }
            echo '</table>';
        }, 'campus-visit-report.xls', [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
        ]);
    }

    public function exportPdf(Request $request)
    {
        $data = $this->data($request->user());
        $lines = ['Campus Visit Report', ''];

        foreach ($data['registrations_per_event'] as $event) {
            $lines[] = "{$event->title}: {$event->registrations_count} registrations";
        }

        $pdf = $this->simplePdf($lines);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="campus-visit-report.pdf"',
        ]);
    }

    private function data(User $user): array
    {
        $registrationsPerEvent = Event::query()
            ->when($user->role === 'university', fn ($query) => $query->where('university_id', $user->id))
            ->withCount('registrations')
            ->orderByDesc('registrations_count')
            ->get(['id', 'title', 'event_date']);

        $attendance = Attendance::query()
            ->when($user->role === 'university', fn ($query) => $query->whereIn(
                'event_id',
                Event::query()->where('university_id', $user->id)->select('id')
            ))
            ->selectRaw('event_id, count(*) as total, sum(case when attended = 1 then 1 else 0 end) as attended_count')
            ->groupBy('event_id')
            ->get();

        $applications = Application::query()
            ->when($user->role === 'university', fn ($query) => $query->where('university_id', $user->id))
            ->selectRaw('university_id, status, count(*) as total')
            ->groupBy('university_id', 'status')
            ->get();

        $topSchools = School::query()
            ->when($user->role === 'university', fn ($query) => $query->whereHas(
                'registrations.event',
                fn ($events) => $events->where('university_id', $user->id)
            ))
            ->withCount(['registrations as confirmed_registrations_count' => fn ($query) => $query
                ->where('status', 'confirmed')
                ->when($user->role === 'university', fn ($registrations) => $registrations->whereHas(
                    'event',
                    fn ($events) => $events->where('university_id', $user->id)
                ))])
            ->orderByDesc('confirmed_registrations_count')
            ->limit(10)
            ->get(['id', 'name', 'location']);

        return [
            'registrations_per_event' => $registrationsPerEvent,
            'attendance_tracking' => $attendance,
            'conversion_to_applications' => $applications,
            'top_engaged_schools' => $topSchools,
        ];
    }

    private function simplePdf(array $lines): string
    {
        $text = collect($lines)
            ->values()
            ->map(fn (string $line, int $index) => 'BT /F1 12 Tf 50 '.(760 - ($index * 18)).' Td ('.$this->escapePdfText($line).') Tj ET')
            ->implode("\n");

        $objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            '5 0 obj << /Length '.strlen($text)." >> stream\n{$text}\nendstream endobj",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object."\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= str_pad((string) $offset, 10, '0', STR_PAD_LEFT)." 00000 n \n";
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";

        return $pdf;
    }

    private function escapePdfText(string $text): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
    }
}
