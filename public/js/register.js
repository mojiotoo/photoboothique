document.getElementById('register-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;
    const data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
        password_confirmation: form.password_confirmation.value,
    };

    try {
        await BoothAPI.post('/register', data);
        window.location.href = '/login';
    } catch (err) {
        alert(err.message || 'Registration failed');
    }
});