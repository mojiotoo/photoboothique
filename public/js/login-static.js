const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const googleButton = document.getElementById('google-login-btn');

function showLoginError(message) {
    if (!loginError) return;
    loginError.textContent = message;
    loginError.style.display = message ? 'block' : 'none';
}

async function setAuthToken(token) {
    if (window.BoothAPI?.setFirebaseToken) {
        BoothAPI.setFirebaseToken(token);
    } else {
        sessionStorage.setItem('firebaseToken', token);
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showLoginError('');

        const email = loginForm.email.value.trim();
        const password = loginForm.password.value;

        if (!email || !password) {
            showLoginError('Email and password are required.');
            return;
        }

        try {
            const auth = firebase.auth();
            // Respect "Remember Me" checkbox: session vs local persistence
            const remember = document.getElementById('remember')?.checked;
            try {
                await auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
            } catch (e) {
                // ignore persistence errors and continue
            }

            const credentials = await auth.signInWithEmailAndPassword(email, password);
            const token = await credentials.user.getIdToken();
            await setAuthToken(token);
            // store displayName for navbar label preference
            if (credentials.user?.displayName) sessionStorage.setItem('firebaseUserName', credentials.user.displayName);
            window.location.href = '/';
        } catch (error) {
            showLoginError(error?.message || 'Login failed. Please try again.');
        }
    });
}

if (googleButton) {
    googleButton.addEventListener('click', async () => {
        showLoginError('');
        try {
            const auth = firebase.auth();
            // For popup sign-in, also set persistence according to Remember Me
            const remember = document.getElementById('remember')?.checked;
            try {
                await auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
            } catch (e) {}

            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            const token = await result.user.getIdToken();
            await setAuthToken(token);
            if (result.user?.displayName) sessionStorage.setItem('firebaseUserName', result.user.displayName);
            window.location.href = '/';
        } catch (error) {
            showLoginError(error?.message || 'Google login failed. Please try again.');
        }
    });
}
