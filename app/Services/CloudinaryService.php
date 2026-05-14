<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Cloudinary upload via REST API — no SDK / package needed.
 *
 * Works with PHP 8.2 + XAMPP, no composer dependency drama.
 *
 * Setup required in .env:
 *   CLOUDINARY_CLOUD_NAME=your-cloud-name
 *   CLOUDINARY_API_KEY=your-api-key
 *   CLOUDINARY_API_SECRET=your-api-secret
 *
 * Get these 3 values from your Cloudinary dashboard after signing up
 * for free at cloudinary.com (no credit card needed).
 */
class CloudinaryService
{
    protected string $cloudName;
    protected string $apiKey;
    protected string $apiSecret;

    public function __construct()
    {
        $this->cloudName = config('cloudinary.cloud_name');
        $this->apiKey    = config('cloudinary.api_key');
        $this->apiSecret = config('cloudinary.api_secret');
    }

    /**
     * Upload an image to Cloudinary.
     *
     * @param  string $filePath  absolute path to the temp uploaded file
     * @return array{public_id:string, url:string}
     */
    public function uploadStrip(string $filePath): array
    {
        $timestamp = time();
        $folder = 'photo-strips';

        // Cloudinary requires a SHA-1 signature of the params (alphabetical),
        // with the api_secret appended. Only signed params go into the signature.
        $paramsToSign = [
            'folder'    => $folder,
            'timestamp' => $timestamp,
        ];
        ksort($paramsToSign);

        $signatureBase = urldecode(http_build_query($paramsToSign));
        $signature = sha1($signatureBase . $this->apiSecret);

        $uploadUrl = "https://api.cloudinary.com/v1_1/{$this->cloudName}/image/upload";

        $response = Http::attach(
            'file',
            file_get_contents($filePath),
            'strip.jpg'
        )->post($uploadUrl, [
            'api_key'   => $this->apiKey,
            'timestamp' => $timestamp,
            'folder'    => $folder,
            'signature' => $signature,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Cloudinary upload failed: ' . $response->body());
        }

        $body = $response->json();

        return [
            'public_id' => $body['public_id'],   // e.g. "photo-strips/abc123"
            'url'       => $body['secure_url'],   // https://res.cloudinary.com/...
        ];
    }

    /**
     * Delete an image from Cloudinary by its public_id.
     */
    public function deleteStrip(string $publicId): bool
    {
        $timestamp = time();

        $paramsToSign = [
            'public_id' => $publicId,
            'timestamp' => $timestamp,
        ];
        ksort($paramsToSign);

        $signatureBase = urldecode(http_build_query($paramsToSign));
        $signature = sha1($signatureBase . $this->apiSecret);

        $destroyUrl = "https://api.cloudinary.com/v1_1/{$this->cloudName}/image/destroy";

        $response = Http::post($destroyUrl, [
            'api_key'   => $this->apiKey,
            'timestamp' => $timestamp,
            'public_id' => $publicId,
            'signature' => $signature,
        ]);

        return $response->successful();
    }
}