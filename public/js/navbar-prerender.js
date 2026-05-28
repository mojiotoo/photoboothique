// ── NAVBAR INSTANT PRE-RENDER ────────────────────────────────────────────────
// This script must be loaded SYNCHRONOUSLY (no defer/async) in <head> so it
// runs before the browser paints anything, eliminating the Login→username flash.
(function () {
    var name = sessionStorage.getItem('firebaseUserName');
    var token = sessionStorage.getItem('firebaseToken');
    if (!name && !token) return; // not logged in, nothing to do

    // Inject a <style> that hides the login button text while we wait for the
    // real DOM to be ready, then override it once we've set the right text.
    var label = name || 'My Account';

    // Use a MutationObserver / DOMContentLoaded to set the text as early as possible.
    function applyLabel() {
        var btn = document.getElementById('nav-login-btn')
            || document.querySelector('#navbar .nav-right .login-btn')
            || document.querySelector('.login-btn');
        if (btn && btn.textContent.trim() === 'Login') {
            btn.textContent = label;
            btn.title = 'Click to log out';
        }
    }

    // Try immediately (in case script is at bottom of body)
    applyLabel();

    // Also hook DOMContentLoaded for scripts in <head>
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyLabel);
    }
})();
