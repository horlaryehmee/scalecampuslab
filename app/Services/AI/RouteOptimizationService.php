<?php

namespace App\Services\AI;

class RouteOptimizationService
{
    public function handle(array $input): array
    {
        return [
            'optimized_order' => $input['locations'] ?? [],
            'estimated_savings' => [
                'travel_time_minutes' => 84,
                'cost' => 145,
            ],
            'method' => 'Mock nearest-region clustering.',
        ];
    }
}
