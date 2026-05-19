// Prefer explicit `#nav-login-btn`, fall back to the navbar button.
const navLoginBtn = document.getElementById('nav-login-btn')
    || document.querySelector('#navbar .nav-right .login-btn')
    || document.querySelector('.login-btn');

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
        const label = sessionStorage.getItem('firebaseUserName') || user.displayName || user.email || 'My Account';
        navLoginBtn.textContent = label;
        navLoginBtn.onclick = () => window.location.href = '/gallery';
        navLoginBtn.title = 'Open your gallery';
        ensureAccountMenu();
    } else {
        navLoginBtn.textContent = 'Login';
        navLoginBtn.onclick = () => window.location.href = '/login';
        navLoginBtn.title = 'Login or register';
        removeAccountMenu();
    }
}

// Create a small hover menu with a Logout action when user is logged in
let accountMenuEl = null;
function ensureAccountMenu() {
    if (!navLoginBtn || accountMenuEl) return;
    const parent = navLoginBtn.parentElement || document.body;

    accountMenuEl = document.createElement('div');
    accountMenuEl.className = 'account-menu';
    accountMenuEl.style.position = 'absolute';
    accountMenuEl.style.display = 'none';
    accountMenuEl.style.minWidth = '140px';
    accountMenuEl.style.background = '#FFAFD5';
    accountMenuEl.style.border = '1px solid rgba(142, 142, 142, 0.52)';
    accountMenuEl.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
    accountMenuEl.style.padding = '6px 0';
    accountMenuEl.style.borderRadius = '6px';
    accountMenuEl.style.zIndex = 9999;

    const logout = document.createElement('button');
    logout.textContent = 'Logout';
    logout.style.color = '#FFFF';
    logout.style.display = 'block';
    logout.style.width = '100%';
    logout.style.padding = '5px 8px';
    logout.style.border = 'none';
    logout.style.background = 'transparent';
    logout.style.textAlign = 'center';
    logout.style.cursor = 'pointer';

    logout.addEventListener('click', async (e) => {
        e.stopPropagation();
        try { if (window.firebase && firebase.auth) await firebase.auth().signOut(); } catch (err) { }
        if (window.BoothAPI?.logout) BoothAPI.logout();
        sessionStorage.removeItem('firebaseUserName');
        // Ensure token cleared
        sessionStorage.removeItem('firebaseToken');
        window.location.href = '/';
    });

    accountMenuEl.appendChild(logout);
    document.body.appendChild(accountMenuEl);

    function showMenu() {
        const rect = navLoginBtn.getBoundingClientRect();
        accountMenuEl.style.left = (rect.left) + 'px';
        accountMenuEl.style.top = (rect.bottom + 8 + window.scrollY) + 'px';
        accountMenuEl.style.display = 'block';
    }

    function hideMenu() {
        accountMenuEl.style.display = 'none';
    }

    navLoginBtn.addEventListener('mouseenter', showMenu);
    navLoginBtn.addEventListener('mouseleave', () => setTimeout(() => { if (!accountMenuEl.matches(':hover')) hideMenu(); }, 150));
    accountMenuEl.addEventListener('mouseleave', hideMenu);
    accountMenuEl.addEventListener('mouseenter', () => accountMenuEl.style.display = 'block');
}

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