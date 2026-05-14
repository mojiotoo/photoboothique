<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PhotoStrip extends Model
{
    protected $fillable = [
        'user_id',
        'firebase_path',
        'image_url',
        'download_token',
        'token_expires_at',
        'downloaded',
    ];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'downloaded'       => 'boolean',
    ];
}