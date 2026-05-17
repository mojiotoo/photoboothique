/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
const MAX_PHOTOS    = 4;
let photos          = [];        // { original: dataURL, filtered: dataURL, filter: string }[]
let activeSlotIndex = 0;

/* ═══════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════ */
const previewImg   = document.getElementById('previewImg');
const dropZone     = document.getElementById('dropZone');
const fileInput    = document.getElementById('fileInput');
const canvas       = document.getElementById('captureCanvas');
const ctx          = canvas.getContext('2d');
const stripCountEl = document.getElementById('stripCount');
const counterBadge = document.getElementById('counterBadge');
const nextBtn      = document.getElementById('nextBtn');
const addPhotoBtn  = document.getElementById('addPhotoBtn');
const prevNavBtn   = document.getElementById('prevNav');
const nextNavBtn   = document.getElementById('nextNav');
const slotDotsEl   = document.getElementById('slotDots');
const filtersRow   = document.getElementById('filtersRow');

/* ═══════════════════════════════════════════════════
   FILE INPUT
═══════════════════════════════════════════════════ */
function openFilePicker() {
    if (photos.length >= MAX_PHOTOS) return;
    fileInput.click();
}

fileInput.addEventListener('change', e => {
    handleFiles(Array.from(e.target.files));
    fileInput.value = '';
});

/* ═══════════════════════════════════════════════════
   DRAG & DROP
═══════════════════════════════════════════════════ */
dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
});
dropZone.addEventListener('click', openFilePicker);

/* ═══════════════════════════════════════════════════
   HANDLE FILES
═══════════════════════════════════════════════════ */
function handleFiles(files) {
    const slots = MAX_PHOTOS - photos.length;
    files.slice(0, slots).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => addPhoto(e.target.result);
        reader.readAsDataURL(file);
    });
}

/* ═══════════════════════════════════════════════════
   ADD PHOTO
═══════════════════════════════════════════════════ */
function addPhoto(dataURL) {
    const index = photos.length;
    photos.push({ original: dataURL, filtered: dataURL, filter: 'none' });
    renderSlot(index);
    setActiveSlot(index);
    updateUI();
}

/* ═══════════════════════════════════════════════════
   RENDER STRIP SLOT
═══════════════════════════════════════════════════ */
function renderSlot(index) {
    const photo = photos[index];
    const slot  = document.querySelector(`.strip-slot[data-index="${index}"]`);
    if (!slot) return;

    const fresh = slot.cloneNode(false);
    slot.parentNode.replaceChild(fresh, slot);

    fresh.innerHTML = '';
    fresh.classList.add('filled', 'pop-in');
    setTimeout(() => fresh.classList.remove('pop-in'), 400);

    const img = document.createElement('img');
    img.src   = photo.filtered;
    img.id    = `strip-img-${index}`;
    fresh.appendChild(img);

    const removeBtn       = document.createElement('div');
    removeBtn.className   = 'remove-btn';
    removeBtn.textContent = '✕ Remove';
    removeBtn.addEventListener('click', e => { e.stopPropagation(); removePhoto(index); });
    fresh.appendChild(removeBtn);

    fresh.addEventListener('click', () => setActiveSlot(index));
}

/* ═══════════════════════════════════════════════════
   REMOVE PHOTO
═══════════════════════════════════════════════════ */
function removePhoto(index) {
    photos.splice(index, 1);
    rebuildAllSlots();
    updateUI();

    if (photos.length === 0) {
        showEmptyState();
    } else {
        setActiveSlot(Math.min(activeSlotIndex, photos.length - 1));
    }
}

function rebuildAllSlots() {
    photos.forEach((_, i) => renderSlot(i));

    for (let i = photos.length; i < MAX_PHOTOS; i++) {
        const slot  = document.querySelector(`.strip-slot[data-index="${i}"]`);
        if (!slot) continue;
        const fresh = slot.cloneNode(false);
        slot.parentNode.replaceChild(fresh, slot);
        fresh.innerHTML = '<span class="slot-plus">+</span>';
        fresh.addEventListener('click', openFilePicker);
    }
}

/* ═══════════════════════════════════════════════════
   SET ACTIVE SLOT
═══════════════════════════════════════════════════ */
function setActiveSlot(index) {
    if (index < 0 || index >= photos.length) return;
    activeSlotIndex = index;

    const photo = photos[index];
    dropZone.style.display   = 'none';
    previewImg.style.display = 'block';
    previewImg.src           = photo.filtered;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === photo.filter);
    });

    document.querySelectorAll('.strip-slot').forEach((s, i) => {
        s.classList.toggle('active-slot', i === index);
    });

    const multi = photos.length > 1;
    prevNavBtn.classList.toggle('visible', multi && index > 0);
    nextNavBtn.classList.toggle('visible', multi && index < photos.length - 1);

    updateDots();
}

prevNavBtn.addEventListener('click', () => setActiveSlot(activeSlotIndex - 1));
nextNavBtn.addEventListener('click', () => setActiveSlot(activeSlotIndex + 1));

/* ═══════════════════════════════════════════════════
   DOTS
═══════════════════════════════════════════════════ */
function updateDots() {
    slotDotsEl.innerHTML = '';
    if (photos.length <= 1) { slotDotsEl.classList.remove('visible'); return; }
    slotDotsEl.classList.add('visible');
    photos.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = `slot-dot filled${i === activeSlotIndex ? ' active' : ''}`;
        dot.addEventListener('click', () => setActiveSlot(i));
        slotDotsEl.appendChild(dot);
    });
}

/* ═══════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════ */
function showEmptyState() {
    previewImg.style.display = 'none';
    dropZone.style.display   = 'flex';
    slotDotsEl.classList.remove('visible');
    prevNavBtn.classList.remove('visible');
    nextNavBtn.classList.remove('visible');
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'none');
    });
}

/* ═══════════════════════════════════════════════════
   FILTERS — only affect the active photo
═══════════════════════════════════════════════════ */
filtersRow.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn || photos.length === 0) return;

    const filterValue = btn.dataset.filter;
    const photo       = photos[activeSlotIndex];
    if (photo.filter === filterValue) return;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    photo.filter = filterValue;

    applyFilterToPhoto(activeSlotIndex, filterValue, () => {
        previewImg.src = photos[activeSlotIndex].filtered;
        const stripImg = document.getElementById(`strip-img-${activeSlotIndex}`);
        if (stripImg) stripImg.src = photos[activeSlotIndex].filtered;
    });
});

function applyFilterToPhoto(index, filterValue, callback) {
    const photo = photos[index];
    const image = new Image();
    image.onload = () => {
        canvas.width  = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.filter = filterValue === 'none' ? 'none' : filterValue;
        ctx.drawImage(image, 0, 0);
        ctx.filter = 'none';
        photo.filtered = canvas.toDataURL('image/jpeg', 0.92);
        if (callback) callback();
    };
    image.src = photo.original;
}

/* ═══════════════════════════════════════════════════
   UPDATE UI
═══════════════════════════════════════════════════ */
function updateUI() {
    const count = photos.length;
    counterBadge.textContent = `${count} / ${MAX_PHOTOS}`;
    stripCountEl.textContent = `${count} / ${MAX_PHOTOS}`;
    addPhotoBtn.disabled    = count >= MAX_PHOTOS;
    addPhotoBtn.textContent = count >= MAX_PHOTOS
        ? '✓ All Photos Added'
        : `+ Add Photo (${count}/${MAX_PHOTOS})`;
    nextBtn.classList.toggle('ready', count === MAX_PHOTOS);
}

/* ═══════════════════════════════════════════════════
   NEXT — upload photos to server then navigate
═══════════════════════════════════════════════════ */
async function goNext() {
    if (photos.length < MAX_PHOTOS) return;

    nextBtn.disabled    = true;
    nextBtn.textContent = 'Uploading…';

    const filteredURLs = photos.map(p => p.filtered);

    // Keep in sessionStorage as fallback for editframe
    sessionStorage.setItem('boothPhotos', JSON.stringify(filteredURLs));

    try {
        await BoothAPI.uploadPhotos(filteredURLs);
    } catch (err) {
        console.warn('Photo upload failed (offline mode):', err);
    }

    const frame = new URLSearchParams(window.location.search).get('frame')
        || sessionStorage.getItem('boothFrameType')
        || 'classic-baby-pink';

    window.location.href = `editFrame.html?frame=${frame}`;
}

/* ═══════════════════════════════════════════════════
   NAV TOGGLE
═══════════════════════════════════════════════════ */
function toggleMenu() {
    document.getElementById('nav-menu').classList.toggle('open');
}

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
document.querySelectorAll('.strip-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        const index = parseInt(slot.dataset.index);
        photos[index] ? setActiveSlot(index) : openFilePicker();
    });
});

updateUI();

// Start backend session
(async () => {
    const frame = new URLSearchParams(window.location.search).get('frame')
        || 'classic-baby-pink';
    try {
        await BoothAPI.startSession(frame, 'upload');
    } catch (err) {
        console.warn('Session start failed (offline mode):', err);
        sessionStorage.setItem('boothFrameType', frame);
    }
})();
