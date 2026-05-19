// Modal for login prompt
function showLoginPrompt() {
    const modal = document.createElement('div');
    modal.className = 'login-prompt-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    const content = document.createElement('div');
    content.style.background = '#fff';
    content.style.padding = '30px';
    content.style.borderRadius = '12px';
    content.style.textAlign = 'center';
    content.style.maxWidth = '400px';
    content.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';

    const title = document.createElement('h2');
    title.textContent = 'Login Required';
    title.style.margin = '0 0 12px 0';
    title.style.color = '#333';

    const message = document.createElement('p');
    message.textContent = 'You need to login to access your gallery.';
    message.style.margin = '0 0 24px 0';
    message.style.color = '#666';
    message.style.fontSize = '14px';

    const button = document.createElement('button');
    button.textContent = 'Go to Login';
    button.style.padding = '10px 24px';
    button.style.background = '#8BB1FF';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '6px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.fontWeight = '500';
    button.onclick = () => window.location.href = '/login';

    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(button);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

async function renderGalleryStrips() {
    const galleryGrid = document.getElementById('gallery-grid');
    const photoCount = document.getElementById('photo-count');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('gallery-loader');

    if (loader) loader.style.display = 'block';

    try {
        const response = await BoothAPI.getMyStrips();
        const strips = response.data || [];

        if (loader) loader.style.display = 'none';
        if (photoCount) photoCount.textContent = `${strips.length} photo strip${strips.length !== 1 ? 's' : ''} saved`;

        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';

        if (strips.length === 0) {
            galleryGrid.innerHTML = `
                <div class="empty-state" id="empty-state">
                    <p>&#10024; No photo strips yet!</p>
                    <p>Start a session to create your first one.</p>
                    <button class="start-btn" onclick="window.location.href='/choose-frame'">Start your session!</button>
                </div>
            `;
            return;
        }

        strips.forEach(strip => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.dataset.id = strip.id;
            card.dataset.url = strip.cloudinary_url;
            card.onclick = () => card.classList.toggle('selected');

            card.innerHTML = `
                <img src="${strip.cloudinary_url}" alt="Photo strip">
                <div class="checkmark">&#10003;</div>
                <a class="download-icon" href="${strip.cloudinary_url}" download="photoboothique-strip.jpg" target="_blank" onclick="event.stopPropagation()">
                    &#8595;
                </a>
            `;

            galleryGrid.appendChild(card);
        });
    } catch (error) {
        if (loader) loader.style.display = 'none';
        console.error('Could not load gallery', error);
        // If API fails, check if user is still authenticated
        if (!firebase.auth().currentUser) {
            showLoginPrompt();
        }
    }
}

// Wait for Firebase to initialize and check auth state
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        // Not logged in — show popup but don't auto-redirect
        showLoginPrompt();
    } else {
        // Logged in — ensure token is in sessionStorage and load strips
        user.getIdToken().then(token => {
            sessionStorage.setItem('firebaseToken', token);
            renderGalleryStrips();
        }).catch(err => {
            console.error('Could not get token', err);
            showLoginPrompt();
        });
    }
});