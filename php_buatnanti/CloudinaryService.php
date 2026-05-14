<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Cloudinary\Configuration\Configuration;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * CloudinaryService
 *
 * Thin wrapper around the Cloudinary PHP SDK (v2).
 * All credentials come from config/cloudinary.php (→ .env).
 *
 * Usage:
 *   $result = app(CloudinaryService::class)->upload('/path/to/file.jpg', [...]);
 *   $url    = $result['secure_url'];
 */
class CloudinaryService
{
    private Cloudinary $client;

    public function __construct()
    {
        $this->client = new Cloudinary(
            Configuration::instance([
                'cloud' => [
                    'cloud_name' => config('cloudinary.cloud_name'),
                    'api_key'    => config('cloudinary.api_key'),
                    'api_secret' => config('cloudinary.api_secret'),
                ],
                'url' => [
                    'secure' => true,
                ],
            ])
        );
    }

    /**
     * Upload a local file to Cloudinary.
     *
     * @param  string  $filePath   Absolute path to the file on disk
     * @param  array   $options    Cloudinary upload options
     *                             (folder, public_id, tags, transformation…)
     * @return array               Raw Cloudinary response array
     *                             Keys you'll use: secure_url, public_id, width, height
     * @throws RuntimeException    When the upload fails
     */
    public function upload(string $filePath, array $options = []): array
    {
        try {
            $response = $this->client
                ->uploadApi()
                ->upload($filePath, $options);

            Log::info('Cloudinary upload success', [
                'public_id'   => $response['public_id'],
                'secure_url'  => $response['secure_url'],
                'bytes'       => $response['bytes'],
            ]);

            return (array) $response;

        } catch (\Throwable $e) {
            Log::error('Cloudinary upload failed', [
                'file'    => $filePath,
                'message' => $e->getMessage(),
            ]);
            throw new RuntimeException('Cloudinary upload failed: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Delete an asset from Cloudinary by its public_id.
     * Used when a user requests their strip to be removed.
     */
    public function destroy(string $publicId): bool
    {
        try {
            $result = $this->client->uploadApi()->destroy($publicId);
            return ($result['result'] ?? '') === 'ok';
        } catch (\Throwable $e) {
            Log::warning('Cloudinary destroy failed', ['public_id' => $publicId, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Build a Cloudinary URL with arbitrary transformations without uploading.
     * Useful for on-the-fly thumbnail generation.
     *
     * @param  string  $publicId
     * @param  array   $transformations  e.g. [['width' => 400, 'crop' => 'fill']]
     */
    public function url(string $publicId, array $transformations = []): string
    {
        return $this->client
            ->image($publicId)
            ->toUrl(['transformation' => $transformations]);
    }
}