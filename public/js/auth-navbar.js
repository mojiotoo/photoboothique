// Prefer explicit `#nav-login-btn`, fall back to the navbar button.
const navLoginBtn = document.getElementById('nav-login-btn')
    || document.querySelector('#navbar .nav-right .login-btn')
    || document.querySelector('.login-btn');

// Store the current user label so we can restore it on mouseleave
let currentUserLabel = sessionStorage.getItem('firebaseUserName') || '';

// ── Instant pre-render from sessionStorage (no async delay) ──────────────────
// Runs synchronously at parse time so the button is correct before any
// Firebase async call fires, eliminating the Login→username flash.
(function preRenderNavBtn() {
    if (!navLoginBtn) return;
    const saved = sessionStorage.getItem('firebaseUserName')
               || (sessionStorage.getItem('firebaseToken') ? 'My Account' : null);
    if (saved) {
        currentUserLabel = saved;
        navLoginBtn.textContent = saved;
        navLoginBtn.title = 'Click to log out';
    }
    // If nothing in sessionStorage, keep the default "Login" from HTML
})();
async function syncFirebaseToken(user) {
    if (!user) {
        sessionStorage.removeItem('firebaseToken');
        return;
    }

    try {
        const token = await user.getIdToken(true);
        sessionStorage.setItem('firebaseToken', token);
        if (window.BoothAPI?.setFirebaseToken) {
            BoothAPI.setFirebaseToken(token);
        }
    } catch (err) {
        console.warn('Could not refresh Firebase token', err);
    }
}

function updateNavButton(user) {
    if (!navLoginBtn) return;

    if (user) {
        // Prefer an explicit name stored at registration, then Firebase displayName, then email
        currentUserLabel = sessionStorage.getItem('firebaseUserName') || user.displayName || user.email || 'My Account';
        navLoginBtn.textContent = currentUserLabel;
        navLoginBtn.title = 'Click to log out';

        // Remove old click listener and add logout-aware one
        navLoginBtn.onclick = null;
        navLoginBtn._authClickHandler && navLoginBtn.removeEventListener('click', navLoginBtn._authClickHandler);

        navLoginBtn._authClickHandler = async () => {
            try { if (window.firebase && firebase.auth) await firebase.auth().signOut(); } catch (err) { }
            if (window.BoothAPI?.logout) BoothAPI.logout();
            sessionStorage.removeItem('firebaseUserName');
            sessionStorage.removeItem('firebaseToken');
            window.location.href = '/';
        };
        navLoginBtn.addEventListener('click', navLoginBtn._authClickHandler);

        // Hover: swap text to "Log Out" with a short delay for a natural feel
        navLoginBtn._hoverEnter && navLoginBtn.removeEventListener('mouseenter', navLoginBtn._hoverEnter);
        navLoginBtn._hoverLeave && navLoginBtn.removeEventListener('mouseleave', navLoginBtn._hoverLeave);

        let hoverTimeout = null;

        navLoginBtn._hoverEnter = () => {
            hoverTimeout = setTimeout(() => {
                navLoginBtn.textContent = 'Log Out';
            }, 100);
        };
        navLoginBtn._hoverLeave = () => {
            clearTimeout(hoverTimeout);
            navLoginBtn.textContent = currentUserLabel;
        };

        navLoginBtn.addEventListener('mouseenter', navLoginBtn._hoverEnter);
        navLoginBtn.addEventListener('mouseleave', navLoginBtn._hoverLeave);

        removeAccountMenu();
    } else {
        currentUserLabel = '';
        navLoginBtn.textContent = 'Login';
        navLoginBtn.title = 'Login or register';

        // Remove logout click handler
        navLoginBtn._authClickHandler && navLoginBtn.removeEventListener('click', navLoginBtn._authClickHandler);
        navLoginBtn._authClickHandler = null;

        // Remove hover handlers
        navLoginBtn._hoverEnter && navLoginBtn.removeEventListener('mouseenter', navLoginBtn._hoverEnter);
        navLoginBtn._hoverLeave && navLoginBtn.removeEventListener('mouseleave', navLoginBtn._hoverLeave);
        navLoginBtn._hoverEnter = null;
        navLoginBtn._hoverLeave = null;

        navLoginBtn.onclick = () => window.location.href = '/login';

        removeAccountMenu();
    }
}

// Kept for cleanup compatibility (no longer creates a menu)
let accountMenuEl = null;

function removeAccountMenu() {
    if (!accountMenuEl) return;
    accountMenuEl.remove();
    accountMenuEl = null;
}

firebase.auth().onAuthStateChanged(async (user) => {
    // Persist displayName to sessionStorage so non-auth pages can still show the name
    if (user && user.displayName) sessionStorage.setItem('firebaseUserName', user.displayName);
    updateNavButton(user);
    await syncFirebaseToken(user);
});

window.addEventListener('load', async () => {
    const user = firebase.auth().currentUser;
    updateNavButton(user);
    if (user) await syncFirebaseToken(user);
});