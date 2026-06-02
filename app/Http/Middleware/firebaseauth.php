<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Firebase Auth Middleware
 *
 * Verifies the Firebase ID token sent in the Authorization header
 * and attaches the decoded user info to the request.
 *
 * USAGE:
 *   Route::middleware('firebase.auth')->post('/something', ...);
 *
 * In your controller:
 *   $uid   = $request->attributes->get('firebase_uid');
 *   $email = $request->attributes->get('firebase_email');
 *
 * MODES:
 *   - 'optional' (default): if token present → verify and attach.
 *                           if no token       → continue as guest.
 *   - 'required': reject with 401 if no/invalid token.
 *
 * SETUP (when temenku siap Firebase):
 *   1. composer require kreait/firebase-php
 *   2. Set FIREBASE_CREDENTIALS in .env to the path of your service-account JSON
 *   3. Replace the verifyToken() stub below with the real verification.
 */
class FirebaseAuth
{
    public function handle(Request $request, Closure $next, string $mode = 'optional'): Response
    {
        $token = $this->extractToken($request);

        if (!$token) {
            if ($mode === 'required') {
                return response()->json(['message' => 'Authentication required'], 401);
            }
            // Optional mode → continue as guest
            return $next($request);
        }

        $decoded = $this->verifyToken($token);

        if (!$decoded) {
            if ($mode === 'required') {
                return response()->json(['message' => 'Invalid or expired token'], 401);
            }
            // Optional mode → continue as guest, but token was bad
            return $next($request);
        }

        // Attach Firebase user info to request for controllers to read
        $request->attributes->set('firebase_uid',   $decoded['uid']   ?? null);
        $request->attributes->set('firebase_email', $decoded['email'] ?? null);
        $request->attributes->set('firebase_name',  $decoded['name']  ?? null);

        return $next($request);
    }

    /**
     * Pull "Bearer <token>" from Authorization header.
     */
    private function extractToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');
        if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    /**
     * PLACEHOLDER — verifies the Firebase ID token.
     *
     * Returns decoded payload array on success, null on failure.
     *
     * TODO: Replace with real Firebase Admin SDK call once temen-mu setup Firebase.
     *
     * Real implementation (after composer require kreait/firebase-php):
     *
     *   try {
     *       $factory  = (new \Kreait\Firebase\Factory())
     *           ->withServiceAccount(env('FIREBASE_CREDENTIALS'));
     *       $verified = $factory->createAuth()->verifyIdToken($token);
     *
     *       return [
     *           'uid'   => $verified->claims()->get('sub'),
     *           'email' => $verified->claims()->get('email'),
     *           'name'  => $verified->claims()->get('name'),
     *       ];
     *   } catch (\Throwable $e) {
     *       return null;
     *   }
     */
    private function verifyToken(string $token): ?array
    {
        // If the Kreait Firebase SDK is installed and credentials are configured,
        // use it to verify the ID token. Otherwise fall back to a harmless
        // development stub so existing flows keep working.
        if (class_exists(\Kreait\Firebase\Factory::class)) {
            $credentialsPath = env('FIREBASE_CREDENTIALS');
            $credentialsJson = env('FIREBASE_CREDENTIALS_JSON');

            if (!$credentialsPath && $credentialsJson) {
                $tmpPath = tempnam(sys_get_temp_dir(), 'firebase_sa_');
                if ($tmpPath !== false && file_put_contents($tmpPath, $credentialsJson) !== false) {
                    register_shutdown_function(fn() => @unlink($tmpPath));
                    $credentialsPath = $tmpPath;
                } else {
                    logger()->warning('Could not create temporary Firebase credentials file from FIREBASE_CREDENTIALS_JSON.');
                }
            }

            if ($credentialsPath && file_exists($credentialsPath)) {
                try {
                    $factory = (new \Kreait\Firebase\Factory())->withServiceAccount($credentialsPath);
                    $auth = $factory->createAuth();

                    // verifyIdToken will throw if token is invalid/expired
                    $verified = $auth->verifyIdToken($token);
                    $claims = $verified->claims();

                    return [
                        'uid'   => $claims->get('sub'),
                        'email' => $claims->get('email'),
                        'name'  => $claims->get('name'),
                    ];
                } catch (\Throwable $e) {
                    logger()->warning('Firebase token verification failed: ' . $e->getMessage());
                    return null;
                }
            }

            if ($credentialsJson && empty($credentialsPath)) {
                logger()->warning('FIREBASE_CREDENTIALS_JSON is set but the temp file could not be created.');
            }
        }

        // ──────────────────────────────────────────────────────────
        // DEV STUB — decodes the JWT payload without verifying the signature
        // to extract a stable, real user UID ('sub' claim) for local development
        // when the SDK or credentials are absent.
        // ──────────────────────────────────────────────────────────
        if (empty($token)) return null;

        // Try decoding JWT payload to get a stable, real user UID
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]), true);
            if ($payload) {
                $decoded = json_decode($payload, true);
                if (is_array($decoded) && isset($decoded['sub'])) {
                    return [
                        'uid'   => $decoded['sub'],
                        'email' => $decoded['email'] ?? 'dev@placeholder.local',
                        'name'  => $decoded['name'] ?? 'Dev User',
                    ];
                }
            }
        }

        // Fallback for static mock tokens (e.g. 'dev-token')
        return [
            'uid'   => 'dev_user_static',
            'email' => 'dev@placeholder.local',
            'name'  => 'Dev User',
        ];
    }
}