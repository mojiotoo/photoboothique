/* ═══════════════════════════════════════════════════════════
   STICKER LIST  (3 columns × 10 rows = 30 slots)
   Replace each path with your own PNG file.
   Put your files in:  /images/stickers/
═══════════════════════════════════════════════════════════ */
const STICKER_SRCS = [
    // Row 1
    '../assets/stickers/1.png',
    '/assets/stickers/2.png',
    '/assets/stickers/3.png',
    // Row 2
    '/assets/stickers/4.png',
    '/assets/stickers/5.png',
    '/assets/stickers/6.png',
    // Row 3
    '/assets/stickers/7.png',
    '/assets/stickers/8.png',
    '/assets/stickers/9.png',
    // Row 4
    '/assets/stickers/10.png',
    '/assets/stickers/11.png',
    '/assets/stickers/12.png',
    // Row 5
    '/assets/stickers/13.png',
    '/assets/stickers/14.png',
    '/assets/stickers/15.png',
    // Row 6
    '/assets/stickers/16.png',
    '/assets/stickers/17.png',
    '/assets/stickers/18.png',
    // Row 7
    '/assets/stickers/19.png',
    '/assets/stickers/20.png',
    '/assets/stickers/21.png',
    // Row 8
    '/assets/stickers/22.png',
    '/assets/stickers/23.png',
    '/assets/stickers/24.png',
    // Row 9
    '/assets/stickers/25.png',
    '/assets/stickers/26.png',
    '/assets/stickers/27.png',
    // Row 10
    '/assets/stickers/28.png',
    '/assets/stickers/29.png',
    '/assets/stickers/30.png',
];

/* ═══════════════════════════════════════════════════════════
   FRAME CONFIGS
═══════════════════════════════════════════════════════════ */
const FRAME_CONFIGS = {
    /*
     * pngSrc  → path to your frame PNG in /assets/frames/
     *           The PNG must have TRANSPARENT holes where photos will show through.
     * bgColor → background color visible behind/around the PNG
     * pad     → pixels from edge to the first photo slot — tune to match your PNG's holes
     * gap     → pixels between photo slots — tune to match your PNG's dividers
     */
    'classic-baby-pink': { pngSrc: '/assets/frames/classicbabypink.png', bgColor: '#fce8f0', layout: 'grid-2x2', frameW: 300, frameH: 393, footerH: 22, gap: 4,  pad: 7  },
    'everyday-white':    { pngSrc: '/assets/frames/everydaywhite.png',   bgColor: '#fff',    layout: 'strip-4',  frameW: 280, frameH: 500, footerH: 50, gap: 4,  pad: 6  },
    'shimmer-pink':      { pngSrc: '/assets/frames/shimmer-pink.png',    bgColor: '#f0d4fa', layout: 'instax',   frameW: 280, frameH: 380, footerH: 50, gap: 0,  pad: 10 },
    'og-black':          { pngSrc: '/assets/frames/ogblack.png',         bgColor: '#111',    layout: 'grid-2x2', frameW: 360, frameH: 400, footerH: 48, gap: 5,  pad: 8  },
};

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */
const st = {
    photos:      [],          // dataURL[] from sessionStorage
    frameType:   '',
    cfg:         null,
    slots:       [],          // { photoIndex, rotation, scale, panX, panY }[]
    stickers:    [],          // { id, src, x, y, rotation, scale, el }[]
    nextId:      0,
    selPhoto:    null,        // selected thumbnail index
    selSlot:     null,        // selected slot index
    selSticker:  null,        // selected sticker id
    addDate:     false,
    addTime:     false,
};

/* ═══════════════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════════════ */
const frameOuter    = document.getElementById('frameOuter');
const frameSlots    = document.getElementById('frameSlots');
const stickersLayer = document.getElementById('stickersLayer');
const frameDatetime = document.getElementById('frameDatetime');
const rotateBtn     = document.getElementById('rotateBtn');
const scaleSlider   = document.getElementById('scaleSlider');
const scaleVal      = document.getElementById('scaleVal');

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
(function init() {
    const raw = sessionStorage.getItem('boothPhotos');
    st.photos  = raw ? JSON.parse(raw).slice(0, 4) : [];

    const params  = new URLSearchParams(window.location.search);
    st.frameType  = params.get('frame') || 'og-black';
    st.cfg        = FRAME_CONFIGS[st.frameType] || FRAME_CONFIGS['og-black'];

    buildFrame();
    buildThumbnails();
    buildStickerPanel();
    setInterval(renderDateTime, 1000);

    // Scale frame to fit available space — called after layout settles
    requestAnimationFrame(() => requestAnimationFrame(scaleFrameToFit));
    window.addEventListener('resize', scaleFrameToFit);
})();

/* ═══════════════════════════════════════════════════════════
   SCALE FRAME TO FIT CENTER COLUMN (no scroll, no clip)
═══════════════════════════════════════════════════════════ */
function scaleFrameToFit() {
    const area  = document.querySelector('.frame-area');
    if (!area) return;
    const availH = area.clientHeight - 12;
    const availW = area.clientWidth  - 12;
    if (!availH || !availW) return;

    const scaleH = availH / st.cfg.frameH;
    const scaleW = availW / st.cfg.frameW;
    const scale  = Math.min(scaleH, scaleW, 1); // never scale up, only down

    frameOuter.style.transform = scale < 1 ? `scale(${scale})` : '';

    // Match left and right panel heights to the frame's exact visual height
    const visH = Math.round(st.cfg.frameH * scale);
    const leftCol      = document.querySelector('.left-col');
    const stickersCard = document.querySelector('.stickers-card');
    if (leftCol)      leftCol.style.height      = visH + 'px';
    if (stickersCard) stickersCard.style.height  = visH + 'px';
}

/* ═══════════════════════════════════════════════════════════
   BUILD FRAME
═══════════════════════════════════════════════════════════ */
function buildFrame() {
    const cfg = st.cfg;

    // Reset — clear old PNG overlay if re-building
    const old = frameOuter.querySelector('.frame-png-overlay');
    if (old) old.remove();
    frameSlots.innerHTML = '';

    frameOuter.className          = 'frame-outer';
    frameOuter.style.width        = cfg.frameW + 'px';
    frameOuter.style.height       = cfg.frameH + 'px';
    frameOuter.style.overflow     = 'hidden';
    frameOuter.style.background   = cfg.bgColor || '#fff';  // fallback colour

    // Slot layout
    let slotCount, cols, rows;
    if      (cfg.layout === 'strip-4')  { slotCount = 4; cols = 1; rows = 4; }
    else if (cfg.layout === 'grid-2x2') { slotCount = 4; cols = 2; rows = 2; }
    else                                { slotCount = 1; cols = 1; rows = 1; }

    st.slots = Array.from({ length: slotCount }, () =>
        ({ photoIndex: null, rotation: 0, scale: 1, panX: 0, panY: 0 })
    );

    const contentH = cfg.frameH - cfg.footerH;
    frameSlots.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: ${contentH}px;
        display: grid;
        grid-template-columns: repeat(${cols}, 1fr);
        grid-template-rows: repeat(${rows}, 1fr);
        gap: ${cfg.gap}px;
        padding: ${cfg.pad}px;
        z-index: 1;
    `;

    for (let i = 0; i < slotCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'frame-slot';
        slot.dataset.i = i;

        const ph = document.createElement('div');
        ph.className   = 'slot-ph';
        ph.textContent = '+';
        slot.appendChild(ph);

        const wrap = document.createElement('div');
        wrap.className = 'slot-img-wrap';
        slot.appendChild(wrap);

        // Click → place selected photo or select slot
        slot.addEventListener('click', () => onSlotClick(i));

        // Drag photo in slot (pan)
        slot.addEventListener('mousedown', e => startPan(e, i));

        // HTML5 drop target
        slot.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
        slot.addEventListener('drop', e => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            const idx = parseInt(e.dataTransfer.getData('photoIndex'));
            if (!isNaN(idx) && st.photos[idx]) {
                placePhoto(i, idx);
                selectSlot(i);
            }
        });

        frameSlots.appendChild(slot);
    }

    // Footer
    const footer = document.getElementById('frameFooter');
    footer.style.height   = cfg.footerH + 'px';
    footer.style.position = 'absolute';
    footer.style.bottom   = '0';
    footer.style.left     = '0';
    footer.style.width    = '100%';
    footer.style.zIndex   = '6';  // above PNG overlay

    // ── PNG frame background ───────────────────────────────────
    // The PNG has solid black photo-slot areas. It goes BENEATH the slots
    // (z-index 0) so placed photos visually cover those black squares.
    const framePng       = document.createElement('img');
    framePng.src         = cfg.pngSrc;
    framePng.alt         = '';
    framePng.className   = 'frame-png-overlay';
    framePng.draggable   = false;
    framePng.onerror     = () => console.warn(`Frame PNG not found: ${cfg.pngSrc}`);
    // Insert BEFORE frameSlots so it sits underneath everything
    frameOuter.insertBefore(framePng, frameSlots);

    // Stickers above everything
    stickersLayer.style.zIndex = '10';

    // Click outside stickers to deselect
    frameOuter.addEventListener('click', e => {
        if (!e.target.closest('.placed-sticker')) deselectSticker();
    });
}

/* ═══════════════════════════════════════════════════════════
   BUILD THUMBNAILS
═══════════════════════════════════════════════════════════ */
function buildThumbnails() {
    const container = document.getElementById('photoThumbs');
    container.innerHTML = '';

    for (let i = 0; i < 4; i++) {
        const thumb = document.createElement('div');
        thumb.className  = 'photo-thumb';
        thumb.dataset.i  = i;

        const num = document.createElement('span');
        num.className   = 'thumb-num';
        num.textContent = i + 1;
        thumb.appendChild(num);

        if (st.photos[i]) {
            const img   = document.createElement('img');
            img.src     = st.photos[i];
            img.alt     = `Photo ${i + 1}`;
            img.draggable = false;
            thumb.appendChild(img);

            // Click to select
            thumb.addEventListener('click', () => selectThumbnail(i));

            // HTML5 drag start
            thumb.draggable = true;
            thumb.addEventListener('dragstart', e => {
                e.dataTransfer.setData('photoIndex', i);
                e.dataTransfer.effectAllowed = 'copy';
                thumb.classList.add('dragging');
            });
            thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
        } else {
            thumb.classList.add('empty');
            const dash = document.createElement('span');
            dash.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(212,80,192,0.35);font-size:1.1rem;';
            dash.textContent = '—';
            thumb.appendChild(dash);
        }

        container.appendChild(thumb);
    }
}

function selectThumbnail(index) {
    st.selPhoto = index;
    document.querySelectorAll('.photo-thumb').forEach((t, i) =>
        t.classList.toggle('selected', i === index)
    );
}

/* ═══════════════════════════════════════════════════════════
   SLOT INTERACTIONS
═══════════════════════════════════════════════════════════ */
function onSlotClick(i) {
    // Place selected photo if one is picked
    if (st.selPhoto !== null && st.photos[st.selPhoto]) {
        placePhoto(i, st.selPhoto);
        st.selPhoto = null;
        document.querySelectorAll('.photo-thumb').forEach(t => t.classList.remove('selected'));
    }
    selectSlot(i);
}

function placePhoto(slotIdx, photoIdx) {
    st.slots[slotIdx] = { photoIndex: photoIdx, rotation: 0, scale: 1, panX: 0, panY: 0 };
    renderSlot(slotIdx);
}

function renderSlot(i) {
    const slotEl = frameSlots.children[i];
    const wrap   = slotEl.querySelector('.slot-img-wrap');
    const s      = st.slots[i];

    wrap.innerHTML = '';

    if (s.photoIndex === null || !st.photos[s.photoIndex]) {
        slotEl.classList.remove('has-photo');
        return;
    }

    slotEl.classList.add('has-photo');

    const img     = document.createElement('img');
    img.src       = st.photos[s.photoIndex];
    img.draggable = false;

    applyTransform(img, s);
    wrap.appendChild(img);
}

function applyTransform(img, s) {
    // scale(1) = image fits slot with contain (no crop)
    // scale > 1 = intentional zoom-in (overflow clipped by slot's overflow:hidden)
    img.style.transform = `rotate(${s.rotation}deg) scale(${s.scale}) translate(${s.panX}px, ${s.panY}px)`;
}

function selectSlot(i) {
    st.selSlot = i;

    document.querySelectorAll('.frame-slot').forEach((el, idx) =>
        el.classList.toggle('active-slot', idx === i)
    );

    const has = st.slots[i]?.photoIndex !== null;
    rotateBtn.disabled   = !has;
    scaleSlider.disabled = !has;
    if (has) {
        scaleSlider.value = Math.round(st.slots[i].scale * 100);
        scaleVal.textContent = scaleSlider.value + '%';
    }
}

/* ═══════════════════════════════════════════════════════════
   PAN — drag photo within slot after it's placed
═══════════════════════════════════════════════════════════ */
let pan = null;

function startPan(e, slotIdx) {
    if (st.slots[slotIdx]?.photoIndex === null) return;
    if (e.button !== 0) return;
    e.preventDefault();
    pan = {
        slotIdx,
        x0: e.clientX, y0: e.clientY,
        px0: st.slots[slotIdx].panX,
        py0: st.slots[slotIdx].panY,
    };
}

document.addEventListener('mousemove', e => {
    if (!pan) return;
    const s = st.slots[pan.slotIdx];
    s.panX  = pan.px0 + (e.clientX - pan.x0);
    s.panY  = pan.py0 + (e.clientY - pan.y0);
    const img = frameSlots.children[pan.slotIdx]?.querySelector('.slot-img-wrap img');
    if (img) applyTransform(img, s);
});

document.addEventListener('mouseup', () => { pan = null; });

/* ═══════════════════════════════════════════════════════════
   ROTATE & SCALE
═══════════════════════════════════════════════════════════ */
function rotateSelected() {
    if (st.selSlot === null) return;
    const s = st.slots[st.selSlot];
    if (s.photoIndex === null) return;
    s.rotation = (s.rotation + 90) % 360;
    const img = frameSlots.children[st.selSlot]?.querySelector('.slot-img-wrap img');
    if (img) applyTransform(img, s);
}

function onScaleChange(val) {
    if (st.selSlot === null) return;
    const s = st.slots[st.selSlot];
    if (s.photoIndex === null) return;
    s.scale = val / 100;
    scaleVal.textContent = val + '%';
    const img = frameSlots.children[st.selSlot]?.querySelector('.slot-img-wrap img');
    if (img) applyTransform(img, s);
}

/* ═══════════════════════════════════════════════════════════
   STICKER PANEL
═══════════════════════════════════════════════════════════ */
function buildStickerPanel() {
    const grid = document.getElementById('stickersGrid');
    grid.innerHTML = '';

    STICKER_SRCS.forEach((src, idx) => {
        const item = document.createElement('div');
        item.className = 'sticker-item';

        const img   = document.createElement('img');
        img.src     = src;
        img.alt     = '';

        // Show a labelled placeholder when the image file is missing
        img.onerror = () => {
            img.remove();
            const ph = document.createElement('div');
            ph.className = 'sticker-placeholder';

            const icon = document.createElement('span');
            icon.className   = 'ph-icon';
            icon.textContent = '🖼';

            const name = document.createElement('span');
            name.className   = 'ph-name';
            // Show just the filename so user knows which path to replace
            name.textContent = src.split('/').pop();

            ph.appendChild(icon);
            ph.appendChild(name);
            item.appendChild(ph);
        };

        item.appendChild(img);
        item.addEventListener('click', () => {
            // Only add sticker if image actually loaded
            if (item.querySelector('img')) addSticker(src);
        });
        grid.appendChild(item);
    });
}

/* ═══════════════════════════════════════════════════════════
   ADD & MOVE STICKERS
═══════════════════════════════════════════════════════════ */
function addSticker(src) {
    const cfg = st.cfg;
    const id  = st.nextId++;
    const data = {
        id, src,
        x: cfg.frameW / 2 - 36,
        y: (cfg.frameH - cfg.footerH) / 2 - 36,
        rotation: 0, scale: 1, el: null,
    };
    st.stickers.push(data);
    renderSticker(data);
}

function renderSticker(data) {
    const el = document.createElement('div');
    el.className    = 'placed-sticker';
    el.dataset.id   = data.id;
    el.style.cssText = `width:68px;height:68px;left:${data.x}px;top:${data.y}px;transform:rotate(${data.rotation}deg) scale(${data.scale});`;

    const img     = document.createElement('img');
    img.src       = data.src;
    img.draggable = false;
    el.appendChild(img);

    const del       = document.createElement('div');
    del.className   = 'sticker-del';
    del.textContent = '×';
    del.addEventListener('click', e => { e.stopPropagation(); removeSticker(data.id); });
    el.appendChild(del);

    el.addEventListener('mousedown', e => startStickerDrag(e, data.id));
    el.addEventListener('click',     e => { e.stopPropagation(); selectSticker(data.id); });

    data.el = el;
    stickersLayer.appendChild(el);
    selectSticker(data.id);
}

function selectSticker(id) {
    st.selSticker = id;
    document.querySelectorAll('.placed-sticker').forEach(el =>
        el.classList.toggle('sticker-sel', Number(el.dataset.id) === id)
    );
    // Deselect slot
    st.selSlot = null;
    document.querySelectorAll('.frame-slot').forEach(el => el.classList.remove('active-slot'));
    rotateBtn.disabled   = true;
    scaleSlider.disabled = true;
}

function deselectSticker() {
    st.selSticker = null;
    document.querySelectorAll('.placed-sticker').forEach(el => el.classList.remove('sticker-sel'));
}

function removeSticker(id) {
    const idx = st.stickers.findIndex(s => s.id === id);
    if (idx === -1) return;
    st.stickers[idx].el?.remove();
    st.stickers.splice(idx, 1);
    if (st.selSticker === id) deselectSticker();
}

let stickerDrag = null;

function startStickerDrag(e, id) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const data = st.stickers.find(s => s.id === id);
    if (!data) return;
    stickerDrag = { id, x0: e.clientX, y0: e.clientY, ox: data.x, oy: data.y };
    selectSticker(id);
}

document.addEventListener('mousemove', e => {
    if (!stickerDrag) return;
    const data = st.stickers.find(s => s.id === stickerDrag.id);
    if (!data) return;
    data.x = stickerDrag.ox + (e.clientX - stickerDrag.x0);
    data.y = stickerDrag.oy + (e.clientY - stickerDrag.y0);
    if (data.el) { data.el.style.left = data.x + 'px'; data.el.style.top = data.y + 'px'; }
});

document.addEventListener('mouseup', () => { stickerDrag = null; });

/* ═══════════════════════════════════════════════════════════
   DATE / TIME
═══════════════════════════════════════════════════════════ */
function updateDateTime() {
    st.addDate = document.getElementById('toggleDate').checked;
    st.addTime = document.getElementById('toggleTime').checked;
    renderDateTime();
}

function renderDateTime() {
    if (!st.addDate && !st.addTime) { frameDatetime.textContent = ''; return; }
    const now   = new Date();
    const parts = [];
    if (st.addDate) parts.push(now.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }));
    if (st.addTime) parts.push(now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }));
    frameDatetime.textContent = parts.join('  ');
}

/* ═══════════════════════════════════════════════════════════
   EXPORT TO CANVAS
═══════════════════════════════════════════════════════════ */
async function exportFrame() {
    const cfg    = st.cfg;
    const canvas = document.getElementById('exportCanvas');
    const ctx    = canvas.getContext('2d');
    const S      = 2; // retina scale

    canvas.width  = cfg.frameW * S;
    canvas.height = cfg.frameH * S;
    ctx.scale(S, S);

    // Background
    const bgColors = { 'classic-baby-pink':'#fff', 'everyday-white':'#fff', 'og-black':'#111' };
    if (st.frameType === 'shimmer-pink') {
        const g = ctx.createLinearGradient(0, 0, cfg.frameW, cfg.frameH);
        g.addColorStop(0, '#fce4f6'); g.addColorStop(1, '#f0d4fa');
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = bgColors[st.frameType] || '#fff';
    }
    ctx.fillRect(0, 0, cfg.frameW, cfg.frameH);

    // Border
    const borders = {
        'classic-baby-pink': { c:'#f5c6df', w:6 },
        'everyday-white':    { c:'#e0e0e0', w:6 },
        'shimmer-pink':      { c:'#e4b8f0', w:10 },
        'og-black':          { c:'#111',    w:8 },
    };
    const brd = borders[st.frameType];
    if (brd) { ctx.strokeStyle = brd.c; ctx.lineWidth = brd.w; ctx.strokeRect(brd.w/2, brd.w/2, cfg.frameW-brd.w, cfg.frameH-brd.w); }

    // Footer bg
    const footerBg = { 'classic-baby-pink':'#f9afd4', 'everyday-white':'#f0f0f0', 'og-black':'#111' };
    if (footerBg[st.frameType]) {
        ctx.fillStyle = footerBg[st.frameType];
        ctx.fillRect(0, cfg.frameH - cfg.footerH, cfg.frameW, cfg.footerH);
    }

    // Slot rects
    const contentH = cfg.frameH - cfg.footerH;
    const { pad, gap, layout } = cfg;
    let rects = [];
    if (layout === 'strip-4') {
        const h = (contentH - pad*2 - gap*3) / 4, w = cfg.frameW - pad*2;
        for (let i=0;i<4;i++) rects.push({ x:pad, y:pad+i*(h+gap), w, h });
    } else if (layout === 'grid-2x2') {
        const w=(cfg.frameW-pad*2-gap)/2, h=(contentH-pad*2-gap)/2;
        for (let r=0;r<2;r++) for (let c=0;c<2;c++) rects.push({ x:pad+c*(w+gap), y:pad+r*(h+gap), w, h });
    } else {
        rects.push({ x:pad, y:pad, w:cfg.frameW-pad*2, h:contentH-pad*2 });
    }

    // Draw photos
    for (let i=0; i<st.slots.length; i++) {
        const s=st.slots[i], r=rects[i];
        if (!r || s.photoIndex===null || !st.photos[s.photoIndex]) continue;
        await new Promise(res => {
            const img=new Image();
            img.onload=()=>{
                ctx.save();
                ctx.beginPath(); ctx.rect(r.x,r.y,r.w,r.h); ctx.clip();
                const cx=r.x+r.w/2, cy=r.y+r.h/2;
                ctx.translate(cx+s.panX, cy+s.panY);
                ctx.rotate(s.rotation*Math.PI/180);
                // contain: scale to fit
                const ar=img.naturalWidth/img.naturalHeight, sr=r.w/r.h;
                let dw,dh;
                if(ar>sr){ dw=r.w*s.scale; dh=dw/ar; } else { dh=r.h*s.scale; dw=dh*ar; }
                ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
                ctx.restore(); res();
            };
            img.onerror=res; img.src=st.photos[s.photoIndex];
        });
    }

    // Logo
    await new Promise(res=>{
        const logo=new Image();
        logo.onload=()=>{
            const lh=18, lw=logo.naturalWidth*(lh/logo.naturalHeight);
            const ly=cfg.frameH-cfg.footerH+(cfg.footerH-lh)/2;
            if(st.frameType==='og-black') ctx.filter='invert(1)';
            ctx.drawImage(logo,10,ly,lw,lh);
            ctx.filter='none'; res();
        };
        logo.onerror=res; logo.src='/assets/footer.png';
    });

    // Date/time
    if (st.addDate || st.addTime) {
        const dtColors = { 'classic-baby-pink':'#7a3050','everyday-white':'#555','shimmer-pink':'#6a1a85','og-black':'rgba(255,255,255,0.65)' };
        ctx.fillStyle   = dtColors[st.frameType] || '#555';
        ctx.font        = '8px Poppins,sans-serif';
        ctx.textAlign   = 'right';
        ctx.textBaseline= 'middle';
        ctx.fillText(frameDatetime.textContent, cfg.frameW-10, cfg.frameH-cfg.footerH+cfg.footerH/2);
        ctx.textAlign   = 'left';
    }

    // Stickers
    const fr=frameOuter.getBoundingClientRect();
    for (const st2 of st.stickers) {
        await new Promise(res=>{
            const img=new Image();
            img.onload=()=>{
                const el=st2.el; if(!el){res();return;}
                const er=el.getBoundingClientRect();
                const rx=(er.left-fr.left)/fr.width*cfg.frameW;
                const ry=(er.top-fr.top)/fr.height*cfg.frameH;
                const rw=er.width/fr.width*cfg.frameW;
                const rh=er.height/fr.height*cfg.frameH;
                ctx.save();
                ctx.translate(rx+rw/2,ry+rh/2);
                ctx.rotate(st2.rotation*Math.PI/180);
                ctx.drawImage(img,-rw/2,-rh/2,rw,rh);
                ctx.restore(); res();
            };
            img.onerror=res; img.src=st2.src;
        });
    }

    return canvas.toDataURL('image/jpeg', 0.93);
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function goBack() {
    const params = new URLSearchParams(window.location.search);
    const mode   = params.get('mode') || 'photobooth';
    window.location.href = mode === 'upload' ? 'uploadphoto.html' : 'session.html';
}

async function goPreview() {
    const btn = document.querySelector('.btn-preview');
    if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }

    try {
        const dataURL = await exportFrame();

        // Store locally as fallback (preview.html can use this if API call fails)
        sessionStorage.setItem('previewImage', dataURL);
        sessionStorage.setItem('previewFrame', st.frameType);

        // Upload final strip to Cloudinary, delete 4 temp photos server-side
        const strip = await BoothAPI.saveStrip(dataURL, {
            isPublic: false,
            hasDate:  st.addDate,
            hasTime:  st.addTime,
        });

        // Navigate to preview with strip ID so friend's QR/download feature works
        window.location.href = `preview.html?strip_id=${strip.strip_id}`;

    } catch (err) {
        console.error('Export/upload failed:', err);

        // Fallback: use sessionStorage if backend unavailable
        const fallback = sessionStorage.getItem('previewImage');
        if (fallback) {
            window.location.href = 'preview.html';
        } else {
            alert('Could not generate preview. Please try again.');
            if (btn) { btn.disabled = false; btn.textContent = 'See Preview →'; }
        }
    }
}