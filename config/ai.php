<?php

return [
    // Experimental scoring endpoints stay unavailable unless a real provider or
    // reviewed scoring implementation is deliberately enabled.
    'enabled' => (bool) env('AI_FEATURES_ENABLED', false),
];
