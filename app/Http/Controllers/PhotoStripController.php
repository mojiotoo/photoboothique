<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PhotoStrip;
use App\Services\CloudinaryService;
use Illuminate\Support\Str;

class PhotoStripController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    /**
     * Save a finished photo strip from base64 JSON.
     * Body: { image_base64, frame_type, add_date, add_time }
     *
     * If user is logged in (via firebase.auth middleware), firebase_uid is saved.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'image_base64' => 'required|string',
            'frame_type'   => 'required|string|max:64',
            'add_date'     => 'sometimes|boolean',
            'add_time'     => 'sometimes|boolean',
        ]);

        // Strip the data URL prefix if present
        $base64 = preg_replace('#^data:image/\w+;base64,#i', '', $data['image_base64']);
        $binary = base64_decode($base64, true);

        if ($binary === false) {
            return response()->json(['message' => 'Invalid base64 image'], 422);
        }

        // Write to temp file for Cloudinary uploader
        $tmp = tempnam(sys_get_temp_dir(), 'strip_') . '.jpg';
        file_put_contents($tmp, $binary);

        try {
            $result = $this->cloudinary->uploadStrip($tmp);
        } finally {
            @unlink($tmp);
        }

        // Build download token + QR URL
        $downloadToken = Str::random(40);
        $downloadUrl   = route('strip.download', $downloadToken);
        $qrUrl         = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='
            . urlencode($downloadUrl);

        // Pull firebase_uid from middleware (null if guest)
        $firebaseUid = $request->attributes->get('firebase_uid');

        $strip = PhotoStrip::create([
            'firebase_uid'   => $firebaseUid,
            'frame_type'     => $data['frame_type'],
            'cloudinary_url' => $result['url'],
            'cloudinary_id'  => $result['public_id'],
            'qr_url'         => $qrUrl,
            'has_date'       => $data['add_date'] ?? false,
            'has_time'       => $data['add_time'] ?? false,
            'is_public'      => false,
            'likes'          => 0,
            'download_count' => 0,
        ]);

        cache()->put("strip_token:{$downloadToken}", $strip->id, now()->addMinutes(30));

        return response()->json([
            'strip_id'       => $strip->id,
            'cloudinary_url' => $strip->cloudinary_url,
            'qr_url'         => $strip->qr_url,
            'download_url'   => $downloadUrl,
        ]);
    }

    /**
     * Show a single strip (used by preview.html via ?strip_id=...).
     */
    public function show(string $id)
    {
        $strip = PhotoStrip::findOrFail($id);

        return response()->json([
            'strip_id'       => $strip->id,
            'frame_type'     => $strip->frame_type,
            'cloudinary_url' => $strip->cloudinary_url,
            'qr_url'         => $strip->qr_url,
            'has_date'       => $strip->has_date,
            'has_time'       => $strip->has_time,
        ]);
    }

    /**
     * Returns the QR code PNG.
     */
    public function qrCode(string $token)
    {
        $downloadUrl = route('strip.download', $token);
        $qrApiUrl    = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='
            . urlencode($downloadUrl);

        $qrImage = @file_get_contents($qrApiUrl);
        if ($qrImage === false) abort(502, 'QR service unavailable');

        return response($qrImage)->header('Content-Type', 'image/png');
    }

    /**
     * Download endpoint — QR opens this on phone.
     */
    public function download(string $token)
    {
        $stripId = cache()->get("strip_token:{$token}");
        if (!$stripId) abort(410, 'This QR code has expired. Please generate a new one.');

        $strip = PhotoStrip::findOrFail($stripId);
        $strip->increment('download_count');

        return redirect($strip->cloudinary_url);
    }

    /**
     * Gallery — public strips, paginated.
     */
    public function gallery(Request $request)
    {
        $query = PhotoStrip::public()->latest();

        if ($frame = $request->query('frame')) {
            $query->forFrame($frame);
        }

        return response()->json($query->paginate(12));
    }

    /**
     * Logged-in user's own strips (requires firebase.auth:required).
     */
    public function myStrips(Request $request)
    {
        $uid = $request->attributes->get('firebase_uid');

        $strips = PhotoStrip::where('firebase_uid', $uid)
            ->latest()
            ->paginate(20);

        return response()->json($strips);
    }

    /**
     * Delete a strip (requires firebase.auth:required + ownership).
     */
    public function destroy(Request $request, string $id)
    {
        $uid   = $request->attributes->get('firebase_uid');
        $strip = PhotoStrip::findOrFail($id);

        // Only owner can delete
        if ($strip->firebase_uid !== $uid) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->cloudinary->deleteStrip($strip->cloudinary_id);
        $strip->delete();

        return response()->json(['success' => true]);
    }
}