<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PhotoboothSessionController;
use App\Http\Controllers\PhotoStripController;
use App\Http\Controllers\GalleryController;

/*
|--------------------------------------------------------------------------
| PhotoBoothique API Routes
|--------------------------------------------------------------------------
|
| All routes are stateless and use CORS middleware.
| The frontend JS calls these after the user is done editing.
|
*/

// ── Session (temporary photo storage during editing) ──────────────────────
Route::prefix('session')->group(function () {

    // POST /api/session/start
    // Called when user lands on photobooth.html or uploadphoto.html.
    // Returns a session_token the JS stores in sessionStorage.
    Route::post('/start', [PhotoboothSessionController::class, 'start']);

    // POST /api/session/{token}/photos
    // Called by photobooth.js or uploadphoto.js to save interim photos
    // (base64 array). Photos are stored temporarily and auto-deleted after 2 hrs.
    Route::post('/{token}/photos', [PhotoboothSessionController::class, 'storePhotos']);

    // GET  /api/session/{token}
    // Lets editframe.js verify a session is still alive before export.
    Route::get('/{token}', [PhotoboothSessionController::class, 'show']);

    // DELETE /api/session/{token}
    // Called by the frontend beforeunload handler so temp files are cleaned up
    // immediately on tab close (best-effort — the cron job is the safety net).
    Route::delete('/{token}', [PhotoboothSessionController::class, 'destroy']);
});

// ── PhotoStrip — the final export ────────────────────────────────────────
Route::prefix('strip')->group(function () {

    // POST /api/strip/save
    // Body: { session_token, image_base64, frame_type, add_date, add_time }
    // Saves the finished strip, uploads to Cloudinary, returns:
    //   { strip_id, cloudinary_url, qr_url, download_url }
    Route::post('/save', [PhotoStripController::class, 'save']);

    // GET  /api/strip/{id}
    // Public — used by the QR code landing page / preview.html
    Route::get('/{id}', [PhotoStripController::class, 'show']);

    // GET  /api/strip/{id}/download
    // Streams the JPEG directly so the browser triggers a save dialog.
    Route::get('/{id}/download', [PhotoStripController::class, 'download']);
});

// ── Gallery ───────────────────────────────────────────────────────────────
Route::prefix('gallery')->group(function () {

    // GET  /api/gallery?page=1&frame=classic-baby-pink
    // Returns paginated list of public photostrips.
    Route::get('/', [GalleryController::class, 'index']);

    // POST /api/gallery/{id}/like
    Route::post('/{id}/like', [GalleryController::class, 'like']);
});