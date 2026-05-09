/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
const MAX_PHOTOS    = 4;
let photos          = [];        // { original: dataURL, filtered: dataURL }[]
let activeSlotIndex = 0;         // which slot is currently previewed

// /* CSS filter strings keyed by button label */
// const FILTERS = {
//     'none':                                         'none',
//     'grayscale(100%)':                              'grayscale(100%)',
//     'sepia(60%) contrast(110%) brightness(88%)':    'sepia(60%) contrast(110%) brightness(88%)',
//     'brightness(112%) blur(0.4px) saturate(75%)':   'brightness(112%) saturate(75%)',
//     'hue-rotate(28deg) saturate(125%) brightness(106%)': 'hue-rotate(28deg) saturate(125%) brightness(106%)',
//     'sepia(35%) saturate(145%) brightness(106%)':   'sepia(35%) saturate(145%) brightness(106%)',
// };

/* ═══════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════ */
const previewImg     = document.getElementById('previewImg');
const dropZone       = document.getElementById('dropZone');
const fileInput      = document.getElementById('fileInput');
const canvas         = document.getElementById('captureCanvas');
const ctx            = canvas.getContext('2d');
const stripCountEl   = document.getElementById('stripCount');
const counterBadge   = document.getElementById('counterBadge');
const nextBtn        = document.getElementById('nextBtn');
const addPhotoBtn    = document.getElementById('addPhotoBtn');
const prevNavBtn     = document.getElementById('prevNav');
const nextNavBtn     = document.getElementById('nextNav');
const slotDotsEl     = document.getElementById('slotDots');

/* ═══════════════════════════════════════════════════
   FILE INPUT — open picker
═══════════════════════════════════════════════════ */
function openFilePicker() {
    if (photos.length >= MAX_PHOTOS) return;
    fileInput.click();
}

fileInput.addEventListener('change', e => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    fileInput.value = '';   // reset so same file can be re-picked
});

/* ═══════════════════════════════════════════════════
   DRAG & DROP
═══════════════════════════════════════════════════ */
dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
});

dropZone.addEventListener('click', openFilePicker);

/* ═══════════════════════════════════════════════════
   HANDLE UPLOADED FILES
═══════════════════════════════════════════════════ */
function handleFiles(files) {
    const available = MAX_PHOTOS - photos.length;
    const toLoad    = files.slice(0, available);

    toLoad.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => addPhoto(e.target.result);
        reader.readAsDataURL(file);
    });
}

/* ═══════════════════════════════════════════════════
   ADD PHOTO TO STATE + STRIP
═══════════════════════════════════════════════════ */
function addPhoto(dataURL) {
    const index = photos.length;
    photos.push({ original: dataURL, filtered: dataURL });

    // Render into the strip slot
    const slot = document.querySelector(`.strip-slot[data-index="${index}"]`);
    if (!slot) return;

    slot.innerHTML = '';

    const img = document.createElement('img');
    img.src = dataURL;
    img.id  = `strip-img-${index}`;
    slot.appendChild(img);

    const removeBtn = document.createElement('div');
    removeBtn.className   = 'remove-btn';
    removeBtn.textContent = '✕ Remove';
    removeBtn.addEventListener('click', e => { e.stopPropagation(); removePhoto(index); });
    slot.appendChild(removeBtn);

    slot.classList.add('filled', 'pop-in');
    setTimeout(() => slot.classList.remove('pop-in'), 400);

    slot.addEventListener('click', () => setActiveSlot(index));

    // Show this photo in preview
    setActiveSlot(index);
    updateUI();
}

/* ═══════════════════════════════════════════════════
   REMOVE PHOTO
═══════════════════════════════════════════════════ */
function removePhoto(index) {
    photos.splice(index, 1);

    // Rebuild all slots
    rebuildStrip();
    updateUI();

    // Show adjacent slot or empty state
    const newActive = Math.min(activeSlotIndex, photos.length - 1);
    if (photos.length > 0) {
        setActiveSlot(newActive);
    } else {
        showEmptyState();
    }
}

/* ═══════════════════════════════════════════════════
   REBUILD STRIP after removal
═══════════════════════════════════════════════════ */
function rebuildStrip() {
    for (let i = 0; i < MAX_PHOTOS; i++) {
        const slot = document.querySelector(`.strip-slot[data-index="${i}"]`);
        slot.innerHTML = '';
        slot.className = 'strip-slot';
        slot.replaceWith(slot.cloneNode(false));  // remove old listeners
    }

    // Re-query and re-attach
    photos.forEach((p, i) => {
        const slot = document.querySelector(`.strip-slot[data-index="${i}"]`);
        slot.innerHTML = '';

        const img = document.createElement('img');
        img.src = p.filtered;
        img.id  = `strip-img-${i}`;
        slot.appendChild(img);

        const removeBtn = document.createElement('div');
        removeBtn.className   = 'remove-btn';
        removeBtn.textContent = '✕ Remove';
        removeBtn.addEventListener('click', e => { e.stopPropagation(); removePhoto(i); });
        slot.appendChild(removeBtn);

        slot.classList.add('filled');
        slot.addEventListener('click', () => setActiveSlot(i));
    });

    // Empty slots
    for (let i = photos.length; i < MAX_PHOTOS; i++) {
        const slot = document.querySelector(`.strip-slot[data-index="${i}"]`);
        slot.innerHTML = '<span class="slot-plus">+</span>';
        slot.addEventListener('click', openFilePicker);
    }
}

/* ═══════════════════════════════════════════════════
   SET ACTIVE SLOT (preview + highlight)
═══════════════════════════════════════════════════ */
function setActiveSlot(index) {
    if (index < 0 || index >= photos.length) return;
    activeSlotIndex = index;

    // Update preview image
    dropZone.style.display   = 'none';
    previewImg.style.display = 'block';
    previewImg.src           = photos[index].filtered;
    previewImg.style.filter  = 'none';   // filter already baked into src

    // Sync filter buttons to THIS photo's saved filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === photos[index].filter);
    });

    // Highlight strip slot
    document.querySelectorAll('.strip-slot').forEach((s, i) => {
        s.classList.toggle('active-slot', i === index);
    });

    // Show/hide nav arrows
    const hasMultiple = photos.length > 1;
    prevNavBtn.classList.toggle('visible', hasMultiple && index > 0);
    nextNavBtn.classList.toggle('visible', hasMultiple && index < photos.length - 1);

    // Update dots
    updateDots();
}

/* ═══════════════════════════════════════════════════
   PREVIEW NAVIGATION
═══════════════════════════════════════════════════ */
prevNavBtn.addEventListener('click', () => setActiveSlot(activeSlotIndex - 1));
nextNavBtn.addEventListener('click', () => setActiveSlot(activeSlotIndex + 1));

/* ═══════════════════════════════════════════════════
   SLOT INDICATOR DOTS
═══════════════════════════════════════════════════ */
function updateDots() {
    slotDotsEl.innerHTML = '';

    if (photos.length <= 1) {
        slotDotsEl.classList.remove('visible');
        return;
    }

    slotDotsEl.classList.add('visible');
    photos.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'slot-dot' +
            (photos[i] ? ' filled' : '') +
            (i === activeSlotIndex ? ' active' : '');
        dot.addEventListener('click', () => setActiveSlot(i));
        slotDotsEl.appendChild(dot);
    });
}

/* ═══════════════════════════════════════════════════
   SHOW EMPTY STATE
═══════════════════════════════════════════════════ */
function showEmptyState() {
    previewImg.style.display = 'none';
    dropZone.style.display   = 'flex';
    slotDotsEl.classList.remove('visible');
    prevNavBtn.classList.remove('visible');
    nextNavBtn.classList.remove('visible');

    // Reset filter buttons to Normal
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'none');
    });
}
/* ═══════════════════════════════════════════════════
   FILTERS
═══════════════════════════════════════════════════ */
document.getElementById('filtersRow').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn || photos.length === 0) return;

    const filterValue = btn.dataset.filter;
    const photo       = photos[activeSlotIndex];

    // No-op if this filter is already applied to this photo
    if (photo.filter === filterValue) return;

    // Update button highlight
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Save this filter on this specific photo only
    photo.filter = filterValue;

    // Bake the filter into a new dataURL for this photo only
    applyFilterToPhoto(activeSlotIndex, filterValue, () => {
        previewImg.src = photos[activeSlotIndex].filtered;

        const stripImg = document.getElementById(`strip-img-${activeSlotIndex}`);
        if (stripImg) stripImg.src = photos[activeSlotIndex].filtered;
    });
});

/* ═══════════════════════════════════════════════════
   APPLY FILTER TO ONE PHOTO via Canvas
   Always renders from .original so filters never compound
═══════════════════════════════════════════════════ */
function applyFilterToPhoto(index, filterValue, callback) {
    const photo = photos[index];
    const image = new Image();

    image.onload = () => {
        canvas.width  = image.naturalWidth;
        canvas.height = image.naturalHeight;

        ctx.filter = filterValue === 'none' ? 'none' : filterValue;
        ctx.drawImage(image, 0, 0);
        ctx.filter = 'none';   // always reset after draw

        photo.filtered = canvas.toDataURL('image/jpeg', 0.92);
        if (callback) callback();
    };

    // Always start from the original — never from filtered
    image.src = photo.original;
}

/* ═══════════════════════════════════════════════════
   UPDATE UI STATE
═══════════════════════════════════════════════════ */
function updateUI() {
    const count = photos.length;

    // Counter badge
    counterBadge.textContent = `${count} / ${MAX_PHOTOS}`;
    stripCountEl.textContent = `${count} / ${MAX_PHOTOS}`;

    // Add photo button
    addPhotoBtn.disabled = count >= MAX_PHOTOS;
    addPhotoBtn.textContent = count >= MAX_PHOTOS
        ? '✓ All Photos Added'
        : `+ Add Photo (${count}/${MAX_PHOTOS})`;

    // Next button
    nextBtn.classList.toggle('ready', count === MAX_PHOTOS);
}

/* ═══════════════════════════════════════════════════
   NEXT — pass filtered photos to result page
═══════════════════════════════════════════════════ */
function goNext() {
    if (photos.length < MAX_PHOTOS) return;

    const filteredURLs = photos.map(p => p.filtered);
    sessionStorage.setItem('boothPhotos', JSON.stringify(filteredURLs));

    const params = new URLSearchParams(window.location.search);
    const frame  = params.get('frame') || 'classic-baby-pink';
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
// Wire up empty slot clicks to open file picker
document.querySelectorAll('.strip-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        const index = parseInt(slot.dataset.index);
        if (photos[index]) {
            setActiveSlot(index);
        } else {
            openFilePicker();
        }
    });
});

updateUI();
