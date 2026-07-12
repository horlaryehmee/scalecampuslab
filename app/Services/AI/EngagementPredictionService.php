<?php

namespace App\Services\AI;

class EngagementPredictionService
{
    public function handle(array $input): array
    {
        $base = 40 + (($input['past_attendance'] ?? 0) * 0.2) + (($input['email_responses'] ?? 0) * 2);

        return [
            'engagement_probability' => round(min(95, $base), 2),
            'risk_level' => $base > 70 ? 'low' : ($base > 50 ? 'medium' : 'high'),
            'recommended_action' => 'Send counselor-specific follow-up and schedule reminder sequence.',
        ];
    }
}
