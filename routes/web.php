<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PhotoStripController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Static HTML page routes (views served as raw HTML — no Blade)
|--------------------------------------------------------------------------
*/
Route::get('/',               fn() => file_get_contents(resource_path('views/home.html')));
Route::get('/login',          fn() => file_get_contents(resource_path('views/login.html')))->name('login');
Route::get('/register',       fn() => file_get_contents(resource_path('views/register.html')))->name('register');
Route::get('/choose-session', fn() => file_get_contents(resource_path('views/chooseSession.html')));
Route::get('/choose-frame',   fn() => file_get_contents(resource_path('views/chooseframe.html')));
Route::get('/edit-frame',     fn() => file_get_contents(resource_path('views/editFrame.html')));
Route::get('/photobooth',     fn() => file_get_contents(resource_path('views/photobooth.html')));
Route::get('/upload-photo',   fn() => file_get_contents(resource_path('views/uploadphoto.html')));
Route::get('/preview',        fn() => file_get_contents(resource_path('views/preview.html')))->name('preview');
Route::get('/qrcode',         fn() => file_get_contents(resource_path('views/qrcode.html')))->name('qrcode');
Route::get('/gallery',        fn() => file_get_contents(resource_path('views/gallery.html')));

/*
|--------------------------------------------------------------------------
| Photo Strip API
| firebase.auth:optional → guest OK; if token present, user attached.
|--------------------------------------------------------------------------
*/
Route::middleware('firebase.auth:optional')->group(function () {
    Route::post('/strip/save',  [PhotoStripController::class, 'store'])->name('strip.store');
    Route::get('/strip/{id}',   [PhotoStripController::class, 'show'])->name('strip.show');
    Route::get('/gallery-data', [PhotoStripController::class, 'gallery'])->name('gallery.data');
});

// These require login (token must be valid)
Route::middleware('firebase.auth:required')->group(function () {
    Route::delete('/strip/{id}',  [PhotoStripController::class, 'destroy'])->name('strip.destroy');
    Route::get('/my-strips',      [PhotoStripController::class, 'myStrips'])->name('strip.mine');
});

// Public QR + download (no auth — anyone with the token can download)
Route::get('/qr/{token}',       [PhotoStripController::class, 'qrCode'])->name('strip.qr');
Route::get('/download/{token}', [PhotoStripController::class, 'download'])->name('strip.download');

/*
|--------------------------------------------------------------------------
| Profile (Laravel native auth — separate from Firebase, for later cleanup)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::get('/profile',    [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile',  [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});