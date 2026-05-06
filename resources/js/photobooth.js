/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
const MAX_PHOTOS = 4;
let photos       = [];       // array of dataURL strings
let activeFilter = 'none';
let stream       = null;
let isCounting   = false;

/* ═══════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════ */
const video        = document.getElementById('cameraFeed');
const canvas       = document.getElementById('captureCanvas');
const ctx          = canvas.getContext('2d');
const countdownEl  = document.getElementById('countdownOverlay');
const flashEl      = document.getElementById('flashOverlay');
const noCameraMsg  = document.getElementById('noCameraMsg');
const cameraStatus = document.getElementById('cameraStatus');
const statusText   = document.getElementById('statusText');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const nextBtn      = document.getElementById('nextBtn');
const stripCountEl = document.getElementById('stripCount');
const stripTitleEl = document.getElementById('stripTitle');

/* ═══════════════════════════════════════════════════
   CAMERA
═══════════════════════════════════════════════════ */
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
            audio: false
        });

        video.srcObject = stream;
        video.style.display = 'block';
        noCameraMsg.style.display = 'none';

        cameraStatus.classList.remove('off');
        statusText.textContent = 'Camera On';

        takePhotoBtn.disabled = false;

    } catch (err) {
        console.error('Camera error:', err);
        statusText.textContent = 'Camera Off';
        cameraStatus.classList.add('off');
    }
}

/* ═══════════════════════════════════════════════════
   FILTERS
═══════════════════════════════════════════════════ */
document.getElementById('filtersRow').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    activeFilter = btn.dataset.filter;
    video.style.filter = activeFilter;
});

/* ═══════════════════════════════════════════════════
   COUNTDOWN → CAPTURE
═══════════════════════════════════════════════════ */
function startCountdown() {
    if (isCounting || photos.length >= MAX_PHOTOS) return;

    isCounting = true;
    takePhotoBtn.disabled = true;

    let count = 3;
    countdownEl.textContent = count;
    countdownEl.classList.add('visible');

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownEl.textContent = count;
        } else {
            clearInterval(interval);
            countdownEl.classList.remove('visible');
            capturePhoto();
        }
    }, 1000);
}

/* ═══════════════════════════════════════════════════
   CAPTURE PHOTO
═══════════════════════════════════════════════════ */
function capturePhoto() {
    // Flash effect
    flashEl.classList.add('flash');
    setTimeout(() => flashEl.classList.remove('flash'), 150);

    // Size canvas to video resolution
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    // Apply same filter to canvas and mirror to match preview
    ctx.filter = activeFilter === 'none' ? 'none' : activeFilter;
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataURL = canvas.toDataURL('image/jpeg', 0.92);
    addPhotoToStrip(dataURL);

    isCounting = false;

    if (photos.length < MAX_PHOTOS) {
        takePhotoBtn.disabled = false;
    }
}

/* ═══════════════════════════════════════════════════
   STRIP MANAGEMENT
═══════════════════════════════════════════════════ */
function addPhotoToStrip(dataURL) {
    const index = photos.length;
    photos.push(dataURL);

    const slot = document.querySelector(`.strip-slot[data-index="${index}"]`);
    if (!slot) return;

    // Clear placeholder
    slot.innerHTML = '';

    // Photo thumbnail
    const img = document.createElement('img');
    img.src = dataURL;
    img.alt = `Photo ${index + 1}`;
    slot.appendChild(img);

    // Retake button (appears on hover via CSS)
    const retakeBtn = document.createElement('div');
    retakeBtn.className = 'retake-btn';
    retakeBtn.textContent = '✕ Retake';
    retakeBtn.addEventListener('click', e => {
        e.stopPropagation();
        retakePhoto(index);
    });
    slot.appendChild(retakeBtn);

    slot.classList.add('filled', 'latest');
    setTimeout(() => slot.classList.remove('latest'), 600);

    // Update counter
    stripCountEl.textContent = `${photos.length} / ${MAX_PHOTOS}`;

    // Update strip title from URL param
    const params = new URLSearchParams(window.location.search);
    const frame  = params.get('frame') || 'strip';
    stripTitleEl.textContent = frame
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    // All photos taken — enable Next
    if (photos.length === MAX_PHOTOS) {
        takePhotoBtn.disabled = true;
        takePhotoBtn.textContent = '✓ All Done!';
        nextBtn.classList.add('ready');
    }
}

function retakePhoto(index) {
    if (isCounting) return;

    // Remove this photo and all taken after it
    for (let i = index; i < photos.length; i++) {
        const slot = document.querySelector(`.strip-slot[data-index="${i}"]`);
        slot.innerHTML = '<span class="slot-plus">+</span>';
        slot.classList.remove('filled', 'latest');
    }

    photos.splice(index);   // remove from index onwards

    stripCountEl.textContent = `${photos.length} / ${MAX_PHOTOS}`;
    takePhotoBtn.disabled    = false;
    takePhotoBtn.textContent = 'Take Photo';
    nextBtn.classList.remove('ready');
}

/* ═══════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════ */
function goNext() {
    if (photos.length < MAX_PHOTOS) return;

    sessionStorage.setItem('boothPhotos', JSON.stringify(photos));

    const params = new URLSearchParams(window.location.search);
    const frame  = params.get('frame') || 'classic-baby-pink';
    window.location.href = `editFrame.html?frame=${frame}`;
}

function toggleMenu() {
    document.getElementById('nav-menu').classList.toggle('open');
}

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
video.style.display = 'none';   // hide until camera is ready
startCamera();

window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
});
