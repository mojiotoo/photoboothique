<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * PhotoboothSessionController
 *
 * Manages short-lived editing sessions so the frontend never has to
 * permanently store interim photos. Each session:
 *  - lives for 2 hours (TTL in Cache + file cleanup cron)
 *  - is identified by a UUID token the browser keeps in sessionStorage
 *  - stores up to 4 base64 photos as flat JPEG files under
 *    storage/app/sessions/{token}/photo_{n}.jpg
 *
 * No database row is created here — Redis / file cache is enough.
 * Only the final strip (after the user clicks "Save") writes to DB.
 */
class PhotoboothSessionController extends Controller
{
    /** Session lifetime in seconds (2 hours) */
    private const TTL = 7200;

    /** Maximum photos allowed per session */
    private const MAX_PHOTOS = 4;

    /** Maximum size per base64-encoded photo string (~8 MB decoded) */
    private const MAX_B64_BYTES = 11_000_000;

    // ──────────────────────────────────────────────────────────
    //  POST /api/session/start
    // ──────────────────────────────────────────────────────────
    /**
     * Create a new blank session token.
     * The frontend stores this token in sessionStorage immediately.
     *
     * Body (JSON, optional):
     *   mode       – "photobooth" | "upload"  (default: "photobooth")
     *   frame_type – one of the FRAME_CONFIGS keys             (default: "classic-baby-pink")
     */
    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mode'       => 'sometimes|string|in:photobooth,upload',
            'frame_type' => 'sometimes|string|max:64',
        ]);

        $token = (string) Str::uuid();

        Cache::put("session:{$token}", [
            'token'      => $token,
            'mode'       => $data['mode']       ?? 'photobooth',
            'frame_type' => $data['frame_type'] ?? 'classic-baby-pink',
            'photo_count'=> 0,
            'created_at' => now()->toIso8601String(),
        ], self::TTL);

        // Create an empty directory so we can write photos into it later
        Storage::makeDirectory("sessions/{$token}");

        Log::info('Session started', ['token' => $token, 'mode' => $data['mode'] ?? 'photobooth']);

        return response()->json([
            'session_token' => $token,
            'expires_in'    => self::TTL,
            'max_photos'    => self::MAX_PHOTOS,
        ], 201);
    }

    // ──────────────────────────────────────────────────────────
    //  GET /api/session/{token}
    // ──────────────────────────────────────────────────────────
    /**
     * Returns session metadata so editframe.js can verify the session
     * is still alive before attempting an export.
     */
    public function show(string $token): JsonResponse
    {
        $session = $this->resolveSession($token);
        if (! $session) {
            return $this->sessionNotFound();
        }

        return response()->json([
            'token'       => $session['token'],
            'mode'        => $session['mode'],
            'frame_type'  => $session['frame_type'],
            'photo_count' => $session['photo_count'],
            'created_at'  => $session['created_at'],
        ]);
    }

    // ──────────────────────────────────────────────────────────
    //  POST /api/session/{token}/photos
    // ──────────────────────────────────────────────────────────
    /**
     * Store (or replace) the 4 interim photos for a session.
     *
     * Body (JSON):
     *   photos – array of base64 data-URI strings, max 4 items
     *            each string must start with "data:image/"
     *
     * Returns:
     *   photo_count  – how many were saved
     *   saved_indices – [0,1,2,3]
     */
    public function storePhotos(Request $request, string $token): JsonResponse
    {
        $session = $this->resolveSession($token);
        if (! $session) {
            return $this->sessionNotFound();
        }

        $validator = Validator::make($request->all(), [
            'photos'   => 'required|array|min:1|max:' . self::MAX_PHOTOS,
            'photos.*' => 'required|string|max:' . self::MAX_B64_BYTES,
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'  => 'Validation failed',
                'detail' => $validator->errors()->first(),
            ], 422);
        }

        $photos  = $request->input('photos');
        $saved   = [];
        $dir     = "sessions/{$token}";

        Storage::makeDirectory($dir);

        foreach ($photos as $i => $dataURI) {
            if ($i >= self::MAX_PHOTOS) break;

            // Validate it's a real image data-URI
            if (! str_starts_with($dataURI, 'data:image/')) {
                return response()->json([
                    'error' => "photos[{$i}] is not a valid image data-URI",
                ], 422);
            }

            // Decode and save as JPEG
            $rawBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $dataURI);
            $binary    = base64_decode($rawBase64, strict: true);

            if ($binary === false) {
                return response()->json([
                    'error' => "photos[{$i}] could not be base64-decoded",
                ], 422);
            }

            Storage::put("{$dir}/photo_{$i}.jpg", $binary);
            $saved[] = $i;
        }

        // Refresh session in cache with new count
        $session['photo_count'] = count($saved);
        Cache::put("session:{$token}", $session, self::TTL);

        Log::info('Session photos stored', ['token' => $token, 'count' => count($saved)]);

        return response()->json([
            'photo_count'  => count($saved),
            'saved_indices' => $saved,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    //  DELETE /api/session/{token}
    // ──────────────────────────────────────────────────────────
    /**
     * Immediately clean up all temp files and invalidate the cache key.
     * Called by the beforeunload handler on photobooth / upload / editframe pages.
     */
    public function destroy(string $token): JsonResponse
    {
        $session = $this->resolveSession($token);
        if (! $session) {
            // Already gone — still return 200 so JS doesn't error
            return response()->json(['deleted' => false, 'reason' => 'not_found']);
        }

        Cache::forget("session:{$token}");
        Storage::deleteDirectory("sessions/{$token}");

        Log::info('Session destroyed', ['token' => $token]);

        return response()->json(['deleted' => true]);
    }

    // ──────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────
    private function resolveSession(string $token): ?array
    {
        // Basic UUID-format guard to avoid cache-key injection
        if (! Str::isUuid($token)) return null;
        return Cache::get("session:{$token}");
    }

    private function sessionNotFound(): JsonResponse
    {
        return response()->json([
            'error'  => 'Session not found or expired',
            'detail' => 'Start a new session via POST /api/session/start',
        ], 404);
    }
}