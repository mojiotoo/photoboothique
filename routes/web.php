<?php
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PhotoStripController;

Route::middleware('auth')->group(function () {
    Route::get('/preview', fn() => view('photoPreview'))->name('preview');
    Route::get('/qrcode', fn() => view('qrcode'))->name('qrcode');
    Route::post('/strip/save', [PhotoStripController::class, 'store'])->name('strip.store');
    Route::get('/gallery', [PhotoStripController::class, 'gallery'])->name('gallery');
    Route::delete('/strip/{id}', [PhotoStripController::class, 'destroy'])->name('strip.destroy');
});

Route::get('/qr/{token}', [PhotoStripController::class, 'qrCode'])->name('strip.qr');
Route::get('/download/{token}', [PhotoStripController::class, 'download'])->name('strip.download');

Route::get('/', function () {
    return file_get_contents(resource_path('views/home.html'));
});

Route::get('/login', function () {
    return file_get_contents(resource_path('views/login.html'));
})->name('login');

Route::get('/register', function () {
    return file_get_contents(resource_path('views/register.html'));
})->name('register');

Route::get('/choose-session', function () {
    return file_get_contents(resource_path('views/chooseSession.html'));
});

Route::get('/choose-frame', function () {
    return file_get_contents(resource_path('views/chooseframe.html'));
});

Route::get('/edit-frame', function () {
    return file_get_contents(resource_path('views/editFrame.html'));
});

Route::get('/photobooth', function () {
    return file_get_contents(resource_path('views/photobooth.html'));
});

Route::get('/upload-photo', function () {
    return file_get_contents(resource_path('views/uploadphoto.html'));
});

Route::get('/preview', function () {
    return file_get_contents(resource_path('views/preview.html'));
});

Route::get('/qrcode', function () {
    return file_get_contents(resource_path('views/qrcode.html'));
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});
