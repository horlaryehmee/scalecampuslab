<?php

return [
    'check_in_early_minutes' => (int) env('VISIT_CHECK_IN_EARLY_MINUTES', 240),
    'check_in_late_minutes' => (int) env('VISIT_CHECK_IN_LATE_MINUTES', 720),
];
