/**
 * PhotoBoothique — Frontend API Helper
 * Talks to the Laravel backend at /api/*
 *
 * Include on every page that needs backend calls:
 *   <script src="/js/api.js"></script>
 */

const BoothAPI = (() => {

    const BASE = '/api';

    // ── Low-level fetch ───────────────────────────────────────
    async function req(method, path, body = null) {
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept':       'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
            },
        };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(BASE + path, opts);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || err.message || `HTTP ${res.status}`);
        }
        return res.json();
    }

    // ─────────────────────────────────────────────────────────
    // 1. Start session
    //    Call on photobooth.html / uploadphoto.html load.
    //    Stores session_token in sessionStorage.
    //
    //    mode:       'photobooth' | 'upload'
    //    frameType:  'classic-baby-pink' | 'everyday-white' | 'shimmer-pink' | 'og-black'
    // ─────────────────────────────────────────────────────────
    async function startSession(frameType, mode = 'photobooth') {
        const data = await req('POST', '/session/start', { frame_type: frameType, mode });
        sessionStorage.setItem('boothToken',     data.session_token);
        sessionStorage.setItem('boothFrameType', frameType);
        sessionStorage.setItem('boothMode',      mode);
        return data;
    }

    // ─────────────────────────────────────────────────────────
    // 2. Upload all 4 photos to the server (batch)
    //    photos: array of base64 dataURL strings (length 1-4)
    // ─────────────────────────────────────────────────────────
    async function uploadPhotos(photos) {
        const token = sessionStorage.getItem('boothToken');
        if (!token) throw new Error('No active session token');
        return req('POST', `/session/${token}/photos`, { photos });
    }

    // ─────────────────────────────────────────────────────────
    // 3. Check session is still alive (editframe uses this)
    // ─────────────────────────────────────────────────────────
    async function getSession() {
        const token = sessionStorage.getItem('boothToken');
        if (!token) throw new Error('No active session token');
        return req('GET', `/session/${token}`);
    }

    // ─────────────────────────────────────────────────────────
    // 4. Destroy session + temp files (cleanup on navigation away)
    // ─────────────────────────────────────────────────────────
    async function destroySession() {
        const token = sessionStorage.getItem('boothToken');
        if (!token) return;
        try {
            await req('DELETE', `/session/${token}`);
        } catch (_) { /* best-effort */ }
        sessionStorage.removeItem('boothToken');
    }

    // ─────────────────────────────────────────────────────────
    // 5. Save final photostrip to Cloudinary
    //    finalImageDataUrl: base64 dataURL from canvas export
    //    Returns: { strip_id, cloudinary_url, qr_url, ... }
    // ─────────────────────────────────────────────────────────
    async function saveStrip(finalImageDataUrl, { isPublic = false, hasDate = false, hasTime = false } = {}) {
        const token     = sessionStorage.getItem('boothToken');
        const frameType = sessionStorage.getItem('boothFrameType') || 'classic-baby-pink';
        if (!token) throw new Error('No active session token');

        const data = await req('POST', '/strip/save', {
            session_token: token,
            image_base64:  finalImageDataUrl,
            frame_type:    frameType,
            is_public:     isPublic,
            has_date:      hasDate,
            has_time:      hasTime,
        });

        // Store for preview page
        sessionStorage.setItem('boothStripId',       data.strip_id);
        sessionStorage.setItem('boothStripUrl',      data.cloudinary_url);
        sessionStorage.setItem('boothStripQrUrl',    data.qr_url ?? '');

        // Token is spent — session + temp files deleted server-side
        sessionStorage.removeItem('boothToken');

        return data;
    }

    // ─────────────────────────────────────────────────────────
    // 6. Get strip (preview / QR page)
    // ─────────────────────────────────────────────────────────
    async function getStrip(stripId) {
        return req('GET', `/strip/${stripId}`);
    }

    // ─────────────────────────────────────────────────────────
    // 7. Gallery
    // ─────────────────────────────────────────────────────────
    async function getGallery({ page = 1, frame = null, sort = 'newest' } = {}) {
        let path = `/gallery?page=${page}&sort=${sort}`;
        if (frame) path += `&frame=${encodeURIComponent(frame)}`;
        return req('GET', path);
    }

    // ─────────────────────────────────────────────────────────
    // 8. Like a strip
    // ─────────────────────────────────────────────────────────
    async function likeStrip(stripId) {
        return req('POST', `/gallery/${stripId}/like`);
    }

    return {
        startSession,
        uploadPhotos,
        getSession,
        destroySession,
        saveStrip,
        getStrip,
        getGallery,
        likeStrip,
    };

})();

// Make available globally for plain <script> includes
if (typeof window !== 'undefined') window.BoothAPI = BoothAPI;
