/* ═══════════════════════════════════════════════════
   PhotoBoothique — API Client
   Laravel backend + Firebase Auth (placeholder)
═══════════════════════════════════════════════════ */

const BoothAPI = (() => {

    // ── CSRF Setup ────────────────────────────────
    let csrfReady = false;

    async function initCsrf() {
        if (csrfReady) return;
        await fetch('/sanctum/csrf-cookie', {
            method: 'GET',
            credentials: 'same-origin',
        });
        csrfReady = true;
    }

    function getXsrfToken() {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    /**
     * Get Firebase ID token if user is logged in.
     *
     * PLACEHOLDER: returns whatever's stored in sessionStorage.
     * When temenmu setup Firebase, replace with:
     *
     *   const user = firebase.auth().currentUser;
     *   return user ? await user.getIdToken() : null;
     */
    function getFirebaseToken() {
        return sessionStorage.getItem('firebaseToken') || null;
    }

    // Build headers with optional Firebase Bearer token
    function buildHeaders(extra = {}) {
        const headers = {
            'Accept': 'application/json',
            'X-XSRF-TOKEN': getXsrfToken(),
            ...extra,
        };
        const token = getFirebaseToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    // ── Helpers ───────────────────────────────────
    async function post(url, body = {}) {
        await initCsrf();
        const res = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: buildHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        return res.json();
    }

    async function get(url) {
        const res = await fetch(url, {
            credentials: 'same-origin',
            headers: buildHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    async function del(url) {
        await initCsrf();
        const res = await fetch(url, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: buildHeaders(),
        });
        return res.ok;
    }

    /* ───────────────────────────────────────────────
       SESSION  (client-side stubs)
    _______________________________________________ */

    async function startSession(frameType, source = 'photobooth') {
        sessionStorage.setItem('boothFrameType', frameType);
        sessionStorage.setItem('boothSource',    source);
        return { token: null };
    }

    async function uploadPhotos(photos) {
        sessionStorage.setItem('boothPhotos', JSON.stringify(photos));
        return { stored: photos.length };
    }

    async function getSession()    { return null; }
    async function deleteSession() { return true; }

    /* ───────────────────────────────────────────────
       STRIP
    _______________________________________________ */

    async function saveStrip({ imageBase64, frameType, addDate = false, addTime = false }) {
        const data = await post('/strip/save', {
            image_base64: imageBase64,
            frame_type:   frameType,
            add_date:     addDate,
            add_time:     addTime,
        });
        sessionStorage.setItem('boothStripId', data.strip_id);
        return data;
    }

    async function getStrip(id) {
        const stripId = id || sessionStorage.getItem('boothStripId');
        if (!stripId) throw new Error('No strip id');
        return get(`/strip/${stripId}`);
    }

    function downloadStrip(downloadUrl) {
        if (!downloadUrl) throw new Error('No download URL');
        window.open(downloadUrl, '_blank');
    }

    async function deleteStrip(id) {
        return del(`/strip/${id}`);
    }

    /* ───────────────────────────────────────────────
       GALLERY
    _______________________________________________ */

    async function getGallery({ page = 1, frame = '' } = {}) {
        const params = new URLSearchParams({ page });
        if (frame) params.set('frame', frame);
        return get(`/gallery-data?${params}`);
    }

    async function getMyStrips({ page = 1 } = {}) {
        return get(`/my-strips?page=${page}`);
    }

    /* ───────────────────────────────────────────────
       AUTH HELPERS (placeholders for temenmu's Firebase setup)
    _______________________________________________ */

    function setFirebaseToken(token) {
        if (token) sessionStorage.setItem('firebaseToken', token);
        else sessionStorage.removeItem('firebaseToken');
    }

    function isLoggedIn() {
        return !!getFirebaseToken();
    }

    function logout() {
        sessionStorage.removeItem('firebaseToken');
        // Temenmu's code akan tambahkan: firebase.auth().signOut();
    }

    /* ───────────────────────────────────────────────
       PUBLIC API
    _______________________________________________ */
    return {
        // Session
        startSession,
        uploadPhotos,
        getSession,
        deleteSession,

        // Strip
        saveStrip,
        getStrip,
        downloadStrip,
        deleteStrip,

        // Gallery
        getGallery,
        getMyStrips,

        // Auth
        setFirebaseToken,
        isLoggedIn,
        logout,
    };

})();