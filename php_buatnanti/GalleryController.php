<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\PhotoStrip;

/**
 * GalleryController
 *
 * Returns paginated, publicly-shared photostrips so gallery.html
 * can display a feed of all saved strips.
 */
class GalleryController extends Controller
{
    // ──────────────────────────────────────────────────────────
    //  GET /api/gallery
    // ──────────────────────────────────────────────────────────
    /**
     * Query params:
     *   page       – integer, default 1
     *   per_page   – integer 1–48, default 20
     *   frame      – filter by frame_type slug (optional)
     *   sort       – "newest" | "most_liked" | "most_downloaded"  (default: newest)
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page'     => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:48',
            'frame'    => 'sometimes|string|max:64',
            'sort'     => 'sometimes|string|in:newest,most_liked,most_downloaded',
        ]);

        $perPage = $validated['per_page'] ?? 20;
        $sort    = $validated['sort']     ?? 'newest';

        $query = PhotoStrip::where('is_public', true);

        // Optional frame filter
        if (! empty($validated['frame'])) {
            $query->where('frame_type', $validated['frame']);
        }

        // Sorting
        $query->orderBy(match ($sort) {
            'most_liked'      => 'likes',
            'most_downloaded' => 'download_count',
            default           => 'created_at',
        }, 'desc');

        $paginated = $query->paginate($perPage, [
            'id', 'frame_type', 'cloudinary_url', 'likes', 'download_count', 'created_at',
        ]);

        // Shape the response so gallery.html doesn't need to know DB internals
        $items = $paginated->map(fn ($strip) => [
            'strip_id'       => $strip->id,
            'frame_type'     => $strip->frame_type,
            'thumbnail_url'  => $this->thumbnailUrl($strip->cloudinary_url),
            'full_url'       => $strip->cloudinary_url,
            'share_url'      => url("/strip/{$strip->id}"),
            'download_url'   => url("/api/strip/{$strip->id}/download"),
            'likes'          => $strip->likes,
            'download_count' => $strip->download_count,
            'created_at'     => $strip->created_at->toIso8601String(),
        ]);

        return response()->json([
            'data'  => $items,
            'meta'  => [
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
                'per_page'     => $paginated->perPage(),
                'total'        => $paginated->total(),
            ],
        ]);
    }

    // ──────────────────────────────────────────────────────────
    //  POST /api/gallery/{id}/like
    // ──────────────────────────────────────────────────────────
    /**
     * Increment the like counter for a strip.
     * Simple atomic increment — no user auth required.
     */
    public function like(string $id): JsonResponse
    {
        $strip = PhotoStrip::where('is_public', true)->findOrFail($id);
        $strip->increment('likes');

        return response()->json(['likes' => $strip->fresh()->likes]);
    }

    // ──────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────

    /**
     * Build a Cloudinary URL with a small thumbnail transformation
     * so gallery.html loads quickly even on mobile.
     *
     * Inserts "w_400,h_600,c_fill,q_auto,f_auto" into the URL path.
     */
    private function thumbnailUrl(string $cloudinaryUrl): string
    {
        return str_replace(
            '/upload/',
            '/upload/w_400,h_600,c_fill,q_auto,f_auto/',
            $cloudinaryUrl
        );
    }
}