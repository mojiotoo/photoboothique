import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { registerWithEmail, firebaseErrorMessage } from '@/lib/useFirebaseAuth';

export default function Register() {
    const [form, setForm] = useState({
        name: '', email: '', password: '', password_confirmation: '',
    });
    const [error, setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email || !form.name || !form.password) {
            setError('Email, name, and password are required.'); return;
        }
        if (form.password.length < 8 && form.password.length > 12) {
            setError('Password must be at 8-12 characters.'); return;
        }
        if (form.password !== form.password_confirmation) {
            setError('Passwords do not match.'); return;
        }

        setLoading(true);
        try {
            await registerWithEmail(form.email, form.password, {
                name: form.name,
            });
        } catch (err) {
            setError(err?.code ? firebaseErrorMessage(err.code) : 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout showPic={false}>
            <Head title="Register" />

            <div className="auth-bow">🎀</div>
            <h1 className="auth-title">Welcome!</h1>
            <p className="auth-subtitle">Login now to save your strips to our cloud gallery</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleRegister}>
                <p className="auth-section">Your Information &gt;_&lt;</p>
                <div className="auth-grid" style={{ marginBottom: 14 }}>
                    <div className="auth-input-wrap">
                        <span className="ico">✉️</span>
                        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} autoComplete="username" />
                    </div>
                    <div className="auth-input-wrap">
                        <span className="ico">👤</span>
                        <input type="text" placeholder="Name" value={form.name} onChange={set('name')} autoComplete="name" />
                    </div>
                    <div className="auth-input-wrap">
                        <span className="ico">🔒</span>
                        <input type="password" placeholder="Password" value={form.password} onChange={set('password')} autoComplete="new-password" />
                    </div>
                    <div className="auth-input-wrap">
                        <span className="ico">📞</span>
                        <input type="tel" placeholder="Phone Number" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                    </div>
                </div>

                <p className="auth-section">Additional Information :)</p>
                <p className="auth-section-sub">Add your country of origin</p>
                <div className="auth-country-wrap" style={{ marginBottom: 28 }}>
                    <div className="auth-country-label">Country</div>
                    <div className="auth-country-row">
                        <span style={{ fontSize: '1.1rem' }}>{flag}</span>
                        <select value={form.country} onChange={handleCountry}>
                            {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="auth-reg-footer">
                    <Link href={route('login')} className="auth-link">Already have account</Link>
                    <button
                        type="submit"
                        className="btn-pink"
                        style={{ flex: 'unset', padding: '13px 36px' }}
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register Now'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}