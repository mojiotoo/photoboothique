<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gallery</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/gallery.css">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
    <script src="/js/navbar-prerender.js"></script>
</head>
<body>
    <div class="background">
        <img src="/assets/flower1.png" alt="Background Image" class="flower1-image">
        <img src="/assets/flower2.png" alt="Background Image" class="flower2-image">
    </div>

    <nav id="navbar">
        <img src="/assets/logo.png" alt="Logo" class="logo-image">
        <ul id="nav-menu">
            <li><a href="/">Home</a></li>
            <li><a href="/choose-frame">Photobooth</a></li>
            <li><a href="/gallery" class="active">Gallery</a></li>
        </ul>
        <div class="nav-right">
            <button id="nav-login-btn" class="login-btn" onclick="window.location.href='/login'">Login</button>
            <button class="hamburger" onclick="toggleMenu()">&#9776;</button>
        </div>
    </nav>

    <main class="gallery-main">
        <div class="gallery-container">

            <div class="gallery-header">
                <div class="gallery-title-group">
                    <h1 class="gallery-title">My Gallery</h1>
                </div>
                <p class="gallery-subtitle" id="photo-count">Loading your gallery…</p>
                <button class="select-all-btn" onclick="toggleSelectAll()">Select All</button>
            </div>

            <div class="gallery-carousel">
                <button class="carousel-btn left" onclick="scrollGallery(-1)">&#8249;</button>
                <div class="gallery-grid" id="gallery-grid"></div>
                <button class="carousel-btn right" onclick="scrollGallery(1)">&#8250;</button>
            </div>

            <div id="gallery-loader" style="display:none;text-align:center;margin:20px 0;font-size:16px;color:#8BB1FF;">Loading your strips…</div>

            <div class="gallery-actions">
                <button class="download-btn" onclick="downloadSelected()">Download Selected</button>
                <button class="delete-btn" onclick="showDeleteModal()">Delete Selected</button>
            </div>

        </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <div class="modal-overlay" id="modal-overlay" style="display:none;">
        <div class="modal">
            <div class="modal-icon">!</div>
            <h2 class="modal-title">Are you sure?</h2>
            <p class="modal-subtitle">This action cannot be undone</p>
            <button class="modal-delete-btn" onclick="confirmDelete()">Delete</button>
            <button class="modal-cancel-btn" onclick="hideDeleteModal()">Cancel</button>
        </div>
    </div>

    <footer>
        <div class="footer-top">
            <div class="footer-brand">
                <img src="/assets/footer.png" alt="Logo" class="footer-logo">
                <p>Your online photobooth bestie<br>p.boothique@gmail.com<br>+62 1234 5678 9012</p>
            </div>
            <div class="footer-col">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="/">Home</a></li>
                    <li><a href="/choose-frame">Photobooth</a></li>
                    <li><a href="/gallery">Gallery</a></li>
                    <li><a href="/login">Login/Register</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Support</h4>
                <ul>
                    <li><a href="#">FAQs</a></li>
                    <li><a href="#">Whatsapp</a></li>
                    <li><a href="#">Help Center</a></li>
                    <li><a href="#">Forum</a></li>
                </ul>
            </div>
            <img src="/assets/stars-footer.png" alt="stars" class="stars-footer">
        </div>
        <hr class="footer-divider">
        <p class="footer-copy">&copy; 2026 PhotoBoothique. All rights reserved.</p>
    </footer>

    <script>
        function toggleMenu() {
            document.getElementById('nav-menu').classList.toggle('open');
        }

        // ── Select / deselect a card ────────────────────────────
        function toggleCard(card) {
            card.classList.toggle('selected');
        }

        function toggleSelectAll() {
            const cards = document.querySelectorAll('.gallery-card');
            const allSelected = [...cards].every(c => c.classList.contains('selected'));
            cards.forEach(c => allSelected ? c.classList.remove('selected') : c.classList.add('selected'));
            document.querySelector('.select-all-btn').textContent = allSelected ? 'Select All' : 'Deselect All';
        }

        function scrollGallery(dir) {
            document.getElementById('gallery-grid').scrollBy({ left: dir * 300, behavior: 'smooth' });
        }

        // ── Download every selected strip ───────────────────────
        async function downloadSelected() {
            const selected = document.querySelectorAll('.gallery-card.selected');
            if (selected.length === 0) return alert('Please select at least one photo strip.');

            if (selected.length === 1) {
                // Single file — langsung download
                const url = selected[0].querySelector('img').src;
                const link = document.createElement('a');
                link.href = url;
                link.download = 'photoboothique-strip.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }

            // Multiple files — zip semuanya
            const zip = new JSZip();
            const folder = zip.folder('photoboothique-strips');

            const fetchPromises = [...selected].map(async (card, index) => {
                const url = card.querySelector('img').src;
                const response = await fetch(url);
                const blob = await response.blob();
                folder.file('strip-' + (index + 1) + '.jpg', blob);
            });

            await Promise.all(fetchPromises);

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, 'photoboothique-strips.zip');
        }

        // ── Delete modal ────────────────────────────────────────
        function showDeleteModal() {
            const selected = document.querySelectorAll('.gallery-card.selected');
            if (selected.length === 0) return alert('Please select at least one photo strip.');
            document.getElementById('modal-overlay').style.display = 'flex';
        }

        function hideDeleteModal() {
            document.getElementById('modal-overlay').style.display = 'none';
        }

        // ── Actually delete: hit the Laravel route for each ─────
        async function confirmDelete() {
            const selected = document.querySelectorAll('.gallery-card.selected');
            const token = document.querySelector('meta[name="csrf-token"]').content;

            for (const card of selected) {
                const id = card.dataset.id;
                try {
                    const res = await fetch('/strip/' + id, {
                        method: 'DELETE',
                        headers: { 'X-CSRF-TOKEN': token },
                    });
                    if (res.ok) {
                        card.remove();
                    }
                } catch (err) {
                    console.error('Delete failed for strip ' + id, err);
                }
            }

            updateCount();
            hideDeleteModal();
        }

        function updateCount() {
            const count = document.querySelectorAll('.gallery-card').length;
            document.getElementById('photo-count').textContent =
                count + ' photo strip' + (count !== 1 ? 's' : '') + ' saved';

            const grid = document.getElementById('gallery-grid');
            if (count === 0 && !document.getElementById('empty-state')) {
                grid.innerHTML =
                    '<div class="empty-state" id="empty-state">' +
                    '<p>&#10024; No photo strips yet!</p>' +
                    '<p>Start a session to create your first one.</p>' +
                    '<button class="start-btn" onclick="window.location.href=\'/choose-frame\'">Start your session!</button>' +
                    '</div>';
            }
        }
    </script>

    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
    <script src="/js/firebase-init.js"></script>
    <script src="/js/api.js"></script>
    <script src="/js/auth-navbar.js"></script>
    <script src="/js/gallery-static.js"></script>
</body>
</html>