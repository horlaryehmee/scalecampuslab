<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paystack' => [
        'base_url' => env('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
        'callback_url' => env('PAYSTACK_CALLBACK_URL'),
        'supported_currencies' => array_values(array_filter(array_map(
            static fn (string $currency): string => strtoupper(trim($currency)),
            explode(',', (string) env('PAYSTACK_SUPPORTED_CURRENCIES', 'NGN')),
        ))),
        'timeout' => (int) env('PAYSTACK_TIMEOUT_SECONDS', 15),
        'retries' => (int) env('PAYSTACK_RETRIES', 2),
        'retry_delay_ms' => (int) env('PAYSTACK_RETRY_DELAY_MS', 250),
        'initialization_stale_after_minutes' => (int) env('PAYSTACK_INITIALIZATION_STALE_AFTER_MINUTES', 5),
    ],

];
