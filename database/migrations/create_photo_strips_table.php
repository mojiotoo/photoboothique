<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photo_strips', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Firebase UID (nullable for now — guest users supported)
            // When user is logged in via Firebase, their UID is stored here.
            $table->string('firebase_uid', 128)->nullable()->index();

            $table->string('frame_type', 64);
            $table->string('cloudinary_url');
            $table->string('cloudinary_id');
            $table->string('qr_url');
            $table->boolean('has_date')->default(false);
            $table->boolean('has_time')->default(false);
            $table->boolean('is_public')->default(false);
            $table->unsignedInteger('likes')->default(0);
            $table->unsignedInteger('download_count')->default(0);
            $table->timestamps();

            $table->index(['is_public', 'created_at']);
            $table->index('frame_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photo_strips');
    }
};