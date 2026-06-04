const emailInput = document.getElementById('forgot-email');
const emailError = document.getElementById('email-error');
const sendBtn = document.getElementById('send-code-btn');
const stepsContainer = document.getElementById('forgot-steps');

function showError(msg) {
    if (!emailError) return;
    emailError.textContent = msg;
    emailError.style.color = '#E7329B';
    emailError.style.display = msg ? 'block' : 'none';
}

function showSuccess(msg) {
    if (!emailError) return;
    emailError.textContent = msg;
    emailError.style.color = '#5990FE';
    emailError.style.display = msg ? 'block' : 'none';
}

// ── Resend state ──────────────────────────────────────────────────────────────
let resendCount = 0;
const MAX_RESENDS = 3;
const RESEND_DELAY = 60;
let resendInterval = null;

function createResendUI(email) {
    if (document.getElementById('resend-row')) return; // already exists

    const row = document.createElement('p');
    row.id = 'resend-row';
    row.style.cssText = 'font-size:12px;color:#aaa;margin:8px 0 0;text-align:center;';

    const link = document.createElement('span');
    link.id = 'resend-link';
    link.style.cssText = 'cursor:pointer;color:#aaa;text-decoration:underline;';
    link.textContent = 'Resend link';

    const timer = document.createElement('span');
    timer.id = 'resend-timer';
    timer.style.display = 'none';

    const exhausted = document.createElement('span');
    exhausted.id = 'resend-exhausted';
    exhausted.style.display = 'none';
    exhausted.textContent = 'No more resends available';

    row.appendChild(link);
    row.appendChild(timer);
    row.appendChild(exhausted);

    // Insert after the error/success message element
    emailError.insertAdjacentElement('afterend', row);

    link.addEventListener('click', async () => {
        if (resendCount >= MAX_RESENDS) return;
        link.style.pointerEvents = 'none';
        showError('');
        try {
            await firebase.auth().sendPasswordResetEmail(email);
            resendCount++;
            showSuccess('Reset link sent again! Check your inbox.');
            startResendCooldown(link, timer, exhausted);
        } catch (err) {
            link.style.pointerEvents = 'auto';
            showError('Could not resend. Please try again.');
        }
    });

    startResendCooldown(link, timer, exhausted);
}

function startResendCooldown(link, timer, exhausted) {
    let secs = RESEND_DELAY;
    link.style.display = 'none';
    link.style.pointerEvents = 'none';
    timer.style.display = 'inline';
    timer.textContent = ` (resend in ${secs}s)`;

    clearInterval(resendInterval);
    resendInterval = setInterval(() => {
        secs--;
        timer.textContent = ` (resend in ${secs}s)`;
        if (secs <= 0) {
            clearInterval(resendInterval);
            timer.style.display = 'none';
            if (resendCount >= MAX_RESENDS) {
                exhausted.style.display = 'inline';
            } else {
                link.style.display = 'inline';
                link.style.pointerEvents = 'auto';
            }
        }
    }, 1000);
}

// ── Send reset link button ────────────────────────────────────────────────────

sendBtn.addEventListener('click', async () => {
    showError('');
    const email = (emailInput.value || '').trim();
    if (!email) { showError('Please enter your email.'); return; }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Checking…';

    try {
        const auth = firebase.auth();
        const methods = await auth.fetchSignInMethodsForEmail(email);
        if (!methods || !methods.length) {
            throw { code: 'auth/user-not-found' };
        }

        sendBtn.textContent = 'Sending…';
        await auth.sendPasswordResetEmail(email);

        // Success — lock email field, show confirmation, show resend UI
        emailInput.disabled = true;
        showSuccess('Reset link sent! Check your inbox and click the link to set a new password.');
        sendBtn.textContent = 'Go to Login';
        sendBtn.disabled = false;
        sendBtn.onclick = () => window.location.href = '/login';

        createResendUI(email);

    } catch (err) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Reset Link';

        const code = err?.code || '';
        if (code === 'auth/user-not-found') showError('No account found with that email address.');
        else if (code === 'auth/invalid-email') showError('Please enter a valid email address.');
        else if (code === 'auth/too-many-requests') showError('Too many attempts. Please try again later.');
        else if (code === 'auth/network-request-failed') showError('Network error. Please check your connection.');
        else showError('Could not send reset email. Please try again.');
    }
});


// ── Handle deep link from Firebase email (oobCode in URL) ────────────────────
// When the user clicks the link in the Firebase email, they land here with
// ?mode=resetPassword&oobCode=... in the URL → jump straight to new password.

(function handleActionLink() {
    try {
        const params = new URLSearchParams(window.location.search);
        const oobCode = params.get('oobCode');
        const mode = params.get('mode');
        if (!oobCode || mode !== 'resetPassword') return;

        firebase.auth().verifyPasswordResetCode(oobCode)
            .then(email => {
                // Pre-fill email and show the password reset form
                if (emailInput) { emailInput.value = email; emailInput.disabled = true; }
                sendBtn.style.display = 'none';
                showPasswordStep(oobCode);
            })
            .catch(() => showError('This reset link is invalid or has expired. Please request a new one.'));
    } catch (e) {
        console.error('handleActionLink error', e);
    }
})();

// ── New password step (reached via Firebase email link) ───────────────────────

function showPasswordStep(oobCode) {
    stepsContainer.innerHTML = '';

    const info = document.createElement('p');
    info.textContent = 'Enter your new password.';
    info.style.cssText = 'font-size:13px;color:#444;margin-bottom:8px;';

    const pw1 = document.createElement('input');
    pw1.type = 'password'; pw1.placeholder = 'New password';
    pw1.className = 'input-field'; pw1.style.cssText = 'display:block;margin-top:8px;';

    const pw2 = document.createElement('input');
    pw2.type = 'password'; pw2.placeholder = 'Confirm password';
    pw2.className = 'input-field'; pw2.style.cssText = 'display:block;margin-top:8px;';

    const pwError = document.createElement('p');
    pwError.style.cssText = 'font-size:13px;display:none;margin-top:6px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save New Password';
    saveBtn.className = 'sendverificationcode-btn';
    saveBtn.style.marginTop = '8px';

    saveBtn.addEventListener('click', async () => {
        pwError.style.display = 'none';
        const a = pw1.value || '';
        const b = pw2.value || '';
        if (a.length < 8 || a.length > 16) { pwError.style.color = '#E7329B'; pwError.textContent = 'Password must be 8-16 characters long.'; pwError.style.display = 'block'; return; }
        if (a !== b) { pwError.style.color = '#E7329B'; pwError.textContent = 'Passwords do not match.'; pwError.style.display = 'block'; return; }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
            await firebase.auth().confirmPasswordReset(oobCode, a);
            pwError.style.color = '#0a8a0a';
            pwError.textContent = '✅ Password updated! Redirecting to login…';
            pwError.style.display = 'block';
            setTimeout(() => window.location.href = '/login', 1500);
        } catch (err) {
            pwError.style.color = '#E7329B';
            pwError.textContent = err?.message || 'Could not update password. Please request a new reset link.';
            pwError.style.display = 'block';
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save New Password';
        }
    });

    stepsContainer.appendChild(info);
    stepsContainer.appendChild(pw1);
    stepsContainer.appendChild(pw2);
    stepsContainer.appendChild(pwError);
    stepsContainer.appendChild(saveBtn);
}
