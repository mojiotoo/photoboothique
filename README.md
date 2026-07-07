# PhotoBoothique

PhotoBoothique adalah aplikasi photobooth berbasis web yang memungkinkan pengguna mengambil foto bersama teman dan keluarga kapan saja dan di mana saja. Foto dapat langsung diambil melalui kamera atau diunggah dari galeri, lalu dipercantik dengan frame, filter, dan stiker sebelum disimpan otomatis ke galeri cloud dan dibagikan lewat QR code.

## Fitur Utama

- **Sesi Foto Langsung:** Ambil foto langsung dari kamera perangkat menggunakan Webcam API
- **Upload Foto**: Unggah foto yang sudah ada dari galeri sebagai alternatif sesi foto langsung
- **Edit dengan Stiker & Filter:** Kustomisasi hasil foto dengan frame, filter, dan stiker lucu sebelum disimpan
- **Galeri Foto Tersinkronisasi:** Semua hasil foto tersimpan otomatis ke akun pengguna dan dapat diakses kapan saja
- **Download via QR Code:** Bagikan dan unduh foto strip dengan cepat cukup dengan memindai QR code

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React.js, Tailwind CSS v4 |
| Backend | Laravel |
| Media Storage | Cloudinary |
| Autentikasi | Firebase Auth |
| Database | MySQL |

## Cara Menjalankan 
### Prerequisites

- PHP >= 8.2 & laravel/framework >= 12.0
- Composer
- Node.js >= 18 & npm
- MySQL

### Install & Run

```bash
git clone https://github.com/your-org/photoboothique.git
cd photoboothique
composer install
php artisan key:generate

npm install
npm run build
php artisan migrate
php artisan serve
```
App akan berjalan di `http://localhost:8000`
