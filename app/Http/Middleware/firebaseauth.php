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
        // ──────────────────────────────────────────────────────────
        // DEV STUB — accepts any non-empty token and returns a fake user.
        // Remove/replace this before going to production.
        // ──────────────────────────────────────────────────────────
        if (empty($token)) return null;

        return [
            'uid'   => 'dev_' . substr(md5($token), 0, 12),
            'email' => 'dev@placeholder.local',
            'name'  => 'Dev User',
        ];
    }
}