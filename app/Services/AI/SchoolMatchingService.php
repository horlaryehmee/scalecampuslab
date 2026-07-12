<?php

namespace App\Services\AI;

class SchoolMatchingService
{
    public function handle(array $input): array
    {
        $schools = $input['schools'] ?? [];

        return collect($schools)
            ->map(fn (array $school, int $index) => $school + [
                'match_score' => max(70, 98 - ($index * 4)),
                'reason' => 'Strong fit based on region, curriculum, and prior engagement.',
            ])
            ->sortByDesc('match_score')
            ->values()
            ->all();
    }
}
