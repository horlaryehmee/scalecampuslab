<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use LogicException;
use UnexpectedValueException;

class PaystackService
{
    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    public function initializeTransaction(
        string $email,
        int $amount,
        string $currency,
        string $reference,
        string $callbackUrl,
        array $metadata = [],
    ): array {
        if ($amount < 1) {
            throw new InvalidArgumentException('The Paystack amount must be at least one subunit.');
        }

        $data = $this->request('post', '/transaction/initialize', [
            'email' => $email,
            'amount' => $amount,
            'currency' => strtoupper($currency),
            'reference' => $reference,
            'callback_url' => $callbackUrl,
            'metadata' => $metadata,
        ]);

        $authorizationUrl = $data['authorization_url'] ?? null;
        $authorizationHost = is_string($authorizationUrl) ? parse_url($authorizationUrl, PHP_URL_HOST) : null;
        $authorizationScheme = is_string($authorizationUrl) ? parse_url($authorizationUrl, PHP_URL_SCHEME) : null;

        if (($data['reference'] ?? null) !== $reference
            || $authorizationScheme !== 'https'
            || ! is_string($authorizationHost)
            || ($authorizationHost !== 'paystack.com' && ! str_ends_with($authorizationHost, '.paystack.com'))) {
            throw new UnexpectedValueException('Paystack returned an invalid initialization response.');
        }

        return $data;
    }

    /** @return array<string, mixed> */
    public function verifyTransaction(string $reference): array
    {
        if (! preg_match('/^[A-Za-z0-9._-]{8,80}$/', $reference)) {
            throw new InvalidArgumentException('The payment reference is invalid.');
        }

        return $this->request('get', '/transaction/verify/'.rawurlencode($reference));
    }

    public function hasValidWebhookSignature(string $payload, ?string $signature): bool
    {
        $secret = $this->secretKey();
        $signature = strtolower(trim((string) $signature));

        if (! preg_match('/^[a-f0-9]{128}$/', $signature)) {
            return false;
        }

        return hash_equals(hash_hmac('sha512', $payload, $secret), $signature);
    }

    public function toSubunit(string|int $amount): int
    {
        $amount = trim((string) $amount);

        if (! preg_match('/^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/', $amount, $matches)) {
            throw new InvalidArgumentException('The payment amount must have no more than two decimal places.');
        }

        $whole = (int) $matches[1];
        $fraction = (int) str_pad($matches[2] ?? '', 2, '0');

        if ($whole > intdiv(PHP_INT_MAX - $fraction, 100)) {
            throw new InvalidArgumentException('The payment amount is too large.');
        }

        return ($whole * 100) + $fraction;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, array $payload = []): array
    {
        $request = $this->client();
        $response = $method === 'get'
            ? $request->get($path)
            : $request->post($path, $payload);

        $response->throw();
        $body = $response->json();

        if (! is_array($body)
            || ($body['status'] ?? null) !== true
            || ! is_array($body['data'] ?? null)) {
            throw new UnexpectedValueException('Paystack returned an invalid API response.');
        }

        return $body['data'];
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('services.paystack.base_url'), '/'))
            ->withToken($this->secretKey())
            ->acceptJson()
            ->asJson()
            ->timeout((int) config('services.paystack.timeout', 15))
            ->retry(
                (int) config('services.paystack.retries', 2),
                (int) config('services.paystack.retry_delay_ms', 250),
                throw: false,
            );
    }

    private function secretKey(): string
    {
        $secret = trim((string) config('services.paystack.secret_key'));

        if ($secret === '') {
            throw new LogicException('PAYSTACK_SECRET_KEY is not configured.');
        }

        return $secret;
    }
}
