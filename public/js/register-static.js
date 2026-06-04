const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');

function showRegisterError(message) {
    if (!registerError) return;
    registerError.textContent = message;
    registerError.style.display = message ? 'block' : 'none';
}

function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach((toggle) => {
        const group = toggle.closest('.password-input-group');
        const input = group?.querySelector('input[type="password"]');
        if (!input) return;

        toggle.addEventListener('click', () => {
            const isVisible = input.type === 'text';
            input.type = isVisible ? 'password' : 'text';
            toggle.textContent = isVisible ? '👁️' : '🙈';
            toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
        });
    });
}

function getFriendlyRegisterError(error) {
    const code = error?.code || '';
    const friendlyMessages = {
        'auth/email-already-in-use':      'An account with this email already exists.',
        'auth/invalid-email':             'Please enter a valid email address.',
        'auth/weak-password':             'Password must be 8-16 characters long and include uppercase, lowercase, number, and special character.',
        'auth/operation-not-allowed':     'Registration is currently disabled. Please contact support.',
        'auth/network-request-failed':    'Network error. Please check your connection and try again.',
        'auth/too-many-requests':         'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user':      'Sign-in was cancelled.',
    };
    return friendlyMessages[code] || 'Registration failed. Please try again.';
}

function validateName(name) {
    if (!/^[A-Za-z]{3,8}$/.test(name)) {
        return 'Name must be 3-8 letters (A-Z or a-z) with no spaces or symbols.';
    }
    return null;
}

function getPasswordValidationErrors(password) {
    const missing = [];

    if (password.length < 8 || password.length > 16) {
        missing.push('be 8-16 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        missing.push('include at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        missing.push('include at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        missing.push('include at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        missing.push('include at least one special character');
    }

    if (!missing.length) {
        return null;
    }

    const last = missing.pop();
    const message = missing.length
        ? `Password must ${missing.join(', ')}, and ${last}.`
        : `Password must ${last}.`;

    return message;
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

        const nameError = validateName(name);
        if (nameError) {
            showRegisterError(nameError);
            return;
        }

        if (password !== passwordConfirmation) {
            showRegisterError('Passwords do not match.');
            return;
        }

        const passwordError = getPasswordValidationErrors(password);
        if (passwordError) {
            showRegisterError(passwordError);
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
            // Log full error for debugging
            console.error('Firebase register error', error);
            // Show friendly message when possible, otherwise display raw code/message for diagnosis
            const friendly = getFriendlyRegisterError(error);
            const raw = error?.code || error?.message || null;
            showRegisterError(friendly + (raw ? ` (detail: ${raw})` : ''));
        }
    });
}

setupPasswordToggles();
