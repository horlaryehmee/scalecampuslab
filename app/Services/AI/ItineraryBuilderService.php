<?php

namespace App\Services\AI;

class ItineraryBuilderService
{
    public function handle(array $input): array
    {
        $destinations = $input['destinations'] ?? [];

        return [
            'summary' => 'Mock itinerary optimized for shortest regional travel window.',
            'days' => collect($destinations)->values()->map(fn ($destination, $index) => [
                'day' => intdiv($index, 3) + 1,
                'stop' => $destination,
                'recommended_time' => $index % 2 === 0 ? '09:00' : '13:30',
            ])->all(),
        ];
    }
}
