const emailInput = document.getElementById('forgot-email');
const emailError = document.getElementById('email-error');
const sendCodeBtn = document.getElementById('send-code-btn');
const stepsContainer = document.getElementById('forgot-steps');

let currentOobCode = null;
let targetEmail = null;

function showError(msg) {
    if (!emailError) return;
    emailError.textContent = msg;
    emailError.style.display = msg ? 'block' : 'none';
}

function clearSteps() {
    stepsContainer.innerHTML = '';
}

function showCodeStep() {
    clearSteps();

    const info = document.createElement('p');
    info.textContent = 'A verification email has been sent. Please open the email and copy the verification code (oobCode) from the link, then paste it below.';
    info.style.fontSize = '13px';
    info.style.color = '#444';

    const codeInput = document.createElement('input');
    codeInput.id = 'reset-code';
    codeInput.placeholder = 'Paste verification code here';
    codeInput.className = 'input-field';
    codeInput.style.display = 'block';
    codeInput.style.marginTop = '8px';

    const codeError = document.createElement('p');
    codeError.id = 'code-error';
    codeError.style.color = '#E7329B';
    codeError.style.fontSize = '13px';
    codeError.style.display = 'none';

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'sendverificationcode-btn';
    nextBtn.style.marginTop = '8px';

    nextBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        codeError.style.display = 'none';
        if (!code) { codeError.textContent = 'Please paste the verification code.'; codeError.style.display = 'block'; return; }

        try {
            const email = await firebase.auth().verifyPasswordResetCode(code);
            // code valid
            currentOobCode = code;
            // ensure the code corresponds to the requested email
            if (targetEmail && email.toLowerCase() !== targetEmail.toLowerCase()) {
                codeError.textContent = 'This code does not match the email you entered.';
                codeError.style.display = 'block';
                return;
            }
            showPasswordStep();
        } catch (err) {
            codeError.textContent = err?.message || 'Invalid or expired code.';
            codeError.style.display = 'block';
        }
    });

    stepsContainer.appendChild(info);
    stepsContainer.appendChild(codeInput);
    stepsContainer.appendChild(codeError);
    stepsContainer.appendChild(nextBtn);
}

function showPasswordStep() {
    clearSteps();

    const info = document.createElement('p');
    info.textContent = 'Enter your new password.';
    info.style.fontSize = '13px';
    info.style.color = '#444';

    const pw1 = document.createElement('input');
    pw1.id = 'new-password';
    pw1.type = 'password';
    pw1.placeholder = 'New password';
    pw1.className = 'input-field';
    pw1.style.display = 'block';
    pw1.style.marginTop = '8px';

    const pw2 = document.createElement('input');
    pw2.id = 'confirm-password';
    pw2.type = 'password';
    pw2.placeholder = 'Confirm password';
    pw2.className = 'input-field';
    pw2.style.display = 'block';
    pw2.style.marginTop = '8px';

    const pwError = document.createElement('p');
    pwError.id = 'pw-error';
    pwError.style.color = '#E7329B';
    pwError.style.fontSize = '13px';
    pwError.style.display = 'none';

    const createBtn = document.createElement('button');
    createBtn.textContent = 'Create New Password';
    createBtn.className = 'sendverificationcode-btn';
    createBtn.style.marginTop = '8px';

    createBtn.addEventListener('click', async () => {
        pwError.style.display = 'none';
        const a = pw1.value || '';
        const b = pw2.value || '';
        if (a.length < 6) { pwError.textContent = 'Password must be at least 6 characters.'; pwError.style.display = 'block'; return; }
        if (a !== b) { pwError.textContent = 'Passwords do not match.'; pwError.style.display = 'block'; return; }
        if (!currentOobCode) { pwError.textContent = 'Missing verification code.'; pwError.style.display = 'block'; return; }

        try {
            await firebase.auth().confirmPasswordReset(currentOobCode, a);
            // success
            pwError.style.color = '#0a8a0a';
            pwError.textContent = 'Password updated. Redirecting to login...';
            pwError.style.display = 'block';
            setTimeout(() => window.location.href = '/login', 1400);
        } catch (err) {
            pwError.style.color = '#E7329B';
            pwError.textContent = err?.message || 'Could not update password.';
            pwError.style.display = 'block';
        }
    });

    stepsContainer.appendChild(info);
    stepsContainer.appendChild(pw1);
    stepsContainer.appendChild(pw2);
    stepsContainer.appendChild(pwError);
    stepsContainer.appendChild(createBtn);
}

sendCodeBtn.addEventListener('click', async () => {
    showError('');
    clearSteps();
    const email = (emailInput.value || '').trim();
    if (!email) { showError('Please enter your email.'); return; }

    try {
        // Check which sign-in methods exist for this email
        const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
        console.log('fetchSignInMethodsForEmail ->', email, methods);
        if (!methods || methods.length === 0) {
            showError('No Firebase account found for this email. Did you register via the site or use Google sign-in?');
            return;
        }

        // If account uses Google-only, instruct the user to use Google login
        if (methods.includes('google.com') && !methods.includes('password')) {
            showError('This account uses Google Sign-In. Please sign in with Google instead.');
            return;
        }

        // Send password reset email (Firebase will send an oobCode inside the link)
        await firebase.auth().sendPasswordResetEmail(email);
        targetEmail = email;
        sessionStorage.setItem('forgotEmail', email);
        showCodeStep();
    } catch (err) {
        console.error('sendCode error', err);
        showError(err?.message || 'Could not send verification email. Check console for details.');
    }
});

// Optionally auto-fill if browser restored value
window.addEventListener('load', () => {
    const saved = sessionStorage.getItem('forgotEmail');
    if (saved && emailInput) emailInput.value = saved;
});

// Handle deep link from Firebase email (oobCode)
(function handleActionLink() {
    try {
        const params = new URLSearchParams(window.location.search);
        const oobCode = params.get('oobCode');
        const mode = params.get('mode');
        if (!oobCode) return;

        // If this is a resetPassword action, verify code and go straight to password step
        if (mode === 'resetPassword') {
            firebase.auth().verifyPasswordResetCode(oobCode)
                .then(email => {
                    // remember target email and code
                    targetEmail = email;
                    currentOobCode = oobCode;
                    if (emailInput) emailInput.value = email;
                    // show password form directly
                    showPasswordStep();
                })
                .catch(err => {
                    console.error('oobCode verify failed', err);
                    showError('Invalid or expired password reset link.');
                });
        }
    } catch (e) {
        console.error('handleActionLink error', e);
    }
})();
