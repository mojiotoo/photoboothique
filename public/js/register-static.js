const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');

function showRegisterError(message) {
    if (!registerError) return;
    registerError.textContent = message;
    registerError.style.display = message ? 'block' : 'none';
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
            const message = error?.message || 'Registration failed. Please try again.';
            showRegisterError(message);
        }
    });
}
