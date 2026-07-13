<?php

return [
    'code_ttl_minutes' => (int) env('MFA_CODE_TTL_MINUTES', 10),
    'max_attempts' => (int) env('MFA_MAX_ATTEMPTS', 5),
    'resend_cooldown_seconds' => (int) env('MFA_RESEND_COOLDOWN_SECONDS', 60),
    'max_resends' => (int) env('MFA_MAX_RESENDS', 3),
];
