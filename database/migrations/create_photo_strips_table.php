<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photo_strips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('cloudinary_public_id');         // id of the image in Cloudinary
            $table->string('image_url', 1000);              // public Cloudinary URL
            $table->string('download_token', 64)->unique(); // token used by the QR code
            $table->timestamp('token_expires_at')->nullable();
            $table->boolean('downloaded')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photo_strips');
    }
};