const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');

function showRegisterError(message) {
    if (!registerError) return;
    registerError.textContent = message;
    registerError.style.display = message ? 'block' : 'none';
}

function getFriendlyRegisterError(error) {
    const code = error?.code || '';
    const friendlyMessages = {
        'auth/email-already-in-use':      'An account with this email already exists.',
        'auth/invalid-email':             'Please enter a valid email address.',
        'auth/weak-password':             'Password must be at least 6 characters.',
        'auth/operation-not-allowed':     'Registration is currently disabled. Please contact support.',
        'auth/network-request-failed':    'Network error. Please check your connection and try again.',
        'auth/too-many-requests':         'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user':      'Sign-in was cancelled.',
    };
    return friendlyMessages[code] || 'Registration failed. Please try again.';
}

if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        showRegisterError('');

        const name = registerForm.name.value.trim();
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value;
        const passwordConfirmation = registerForm.password_confirmation.value;

        if (!name || !email || !password || !passwordConfirmation) {
            showRegisterError('All fields are required.');
            return;
        }

        if (password !== passwordConfirmation) {
            showRegisterError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            showRegisterError('Password must be at least 6 characters.');
            return;
        }

        try {
            const auth = firebase.auth();
            const credentials = await auth.createUserWithEmailAndPassword(email, password);
            await credentials.user.updateProfile({ displayName: name });
            const token = await credentials.user.getIdToken();
            if (window.BoothAPI?.setFirebaseToken) {
                BoothAPI.setFirebaseToken(token);
            } else {
                sessionStorage.setItem('firebaseToken', token);
            }
            sessionStorage.setItem('firebaseUserName', name);
            window.location.href = '/';
        } catch (error) {
            showRegisterError(getFriendlyRegisterError(error));
        }
    });
}
