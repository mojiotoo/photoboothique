// resources/js/lib/useFirebaseAuth.js
//
// All Firebase auth actions live here.
// Each function:
//   1. Calls Firebase (client side) → gets an ID token
//   2. POSTs that token to Laravel   → Laravel verifies + creates session
//   3. Inertia router.visit() handles the redirect
//
import { router } from '@inertiajs/react';
import {
    auth,
    googleProvider,
    firebaseErrorMessage,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail,
    signOut,
} from './firebase';

// POST token to Laravel and let Inertia handle the redirect/response
async function sendTokenToLaravel(endpoint, idToken, extraData = {}) {
    return new Promise((resolve, reject) => {
        router.post(
            endpoint,
            { id_token: idToken, ...extraData },
            {
                onSuccess: () => resolve(),
                onError:   (errors) => reject(errors),
                preserveScroll: true,
            },
        );
    });
}

// ── Login with email + password ───────────────────────────────────────────────
export async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await cred.user.getIdToken();
    await sendTokenToLaravel(route('firebase.login'), idToken);
}

// ── Register with email + password ───────────────────────────────────────────
export async function registerWithEmail(email, password, extraData) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await cred.user.getIdToken();
    await sendTokenToLaravel(route('firebase.register'), idToken, extraData);
}

// ── Google sign-in ────────────────────────────────────────────────────────────
export async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const idToken = await cred.user.getIdToken();
    await sendTokenToLaravel(route('firebase.login'), idToken);
}

// ── Forgot password (send reset email via Firebase) ───────────────────────────
export async function sendReset(email) {
    await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
    });
}

// ── Logout (sign out Firebase + destroy Laravel session) ─────────────────────
export async function logout() {
    await signOut(auth);
    router.post(route('firebase.logout'));
}

// Re-export for convenience
export { firebaseErrorMessage };