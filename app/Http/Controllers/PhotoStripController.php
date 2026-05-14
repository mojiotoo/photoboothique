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
     * Save a finished photo strip.
     * Called by the frontend after the strip image is finalized.
     *
     * Expects: multipart/form-data with field "strip_image"
     */
    public function store(Request $request)
    {
        $request->validate([
            'strip_image' => 'required|image|max:10240', // 10 MB
        ]);

        $file = $request->file('strip_image');

        // 1. upload to Cloudinary
        $result = $this->cloudinary->uploadStrip($file->getRealPath());

        // 2. save a DB record
        $strip = PhotoStrip::create([
            'user_id'              => auth()->id(),
            'cloudinary_public_id' => $result['public_id'],
            'image_url'            => $result['url'],
            'download_token'       => Str::random(40),
            'token_expires_at'     => now()->addMinutes(30),
        ]);

        // 3. return the QR target + image url to the frontend
        return response()->json([
            'strip_id'  => $strip->id,
            'qr_url'    => route('strip.qr', $strip->download_token),
            'image_url' => $strip->image_url,
        ]);
    }

    /**
     * Returns the QR code PNG itself.
     * Use as <img src="/qr/{token}">
     *
     * Uses the free goqr.me API — no package needed.
     */
    public function qrCode(string $token)
    {
        $downloadUrl = route('strip.download', $token);

        $qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='
            . urlencode($downloadUrl);

        $qrImage = file_get_contents($qrApiUrl);

        return response($qrImage)->header('Content-Type', 'image/png');
    }

    /**
     * The page the QR code opens on the phone.
     * Checks expiry, marks as downloaded, sends the image.
     */
    public function download(string $token)
    {
        $strip = PhotoStrip::where('download_token', $token)->firstOrFail();

        if ($strip->token_expires_at && now()->greaterThan($strip->token_expires_at)) {
            abort(410, 'This QR code has expired. Please generate a new one.');
        }

        $strip->update(['downloaded' => true]);

        // redirect straight to the Cloudinary image
        return redirect($strip->image_url);
    }

    /**
     * Gallery page — shows all of this user's strips.
     */
    public function gallery()
    {
        $strips = PhotoStrip::where('user_id', auth()->id())
            ->latest()
            ->get();

        return view('gallery', compact('strips'));
    }

    /**
     * Delete a strip (from gallery + from Cloudinary).
     */
    public function destroy(int $id)
    {
        $strip = PhotoStrip::where('user_id', auth()->id())->findOrFail($id);

        $this->cloudinary->deleteStrip($strip->cloudinary_public_id);
        $strip->delete();

        return response()->json(['success' => true]);
    }
}