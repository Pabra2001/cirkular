import { installCatalogUpload } from './catalog-upload.js?rev=floyd-video';

const scenes = [...document.querySelectorAll('[data-scene]')];
const video = document.querySelector('.opening video');
if (new URLSearchParams(location.search).has('embed')) document.body.dataset.embed = '';
const entry = document.querySelector('.catalog-entry');
const strip = document.querySelector('#catalog-strip');
const focusVideo = document.createElement('video');
focusVideo.className = 'catalog-focus-video';
focusVideo.defaultMuted = focusVideo.muted = focusVideo.loop = focusVideo.playsInline = true;
focusVideo.hidden = true;
focusVideo.setAttribute('aria-hidden', 'true');
focusVideo.addEventListener('playing', () => { focusVideo.hidden = false; });
const dialog = document.querySelector('.art-dialog');
const artwork = dialog.querySelector('img');
const artVideo = dialog.querySelector('video');
const download = dialog.querySelector('[download]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const collections = {
  world: [
    'world-1.mp4', 'world-2.mp4', 'world-3-dance.mp4', 'world-4.mp4', 'world-5.mp4',
  ],
  history: [
    ...Array.from({length: 5}, (_, index) => `catalog-${index + 1}.webp`),
    ...[12110, 488927, 485537, 436532, 438817].map(id => `history-${id}-lime.webp`),
  ],
};
for (const file of collections.history) new Image().src = `https://prnce.pages.dev/cirkular-world/media/${file}`;
let requestedContribution = false;
let collection = 'world';
const localArt = new Set();
const localColor = new Map();
const localSourceUrl = new Map();

async function ditherMuseumImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const w = Math.max(32, Math.round((img.naturalWidth || 300) * scale));
        const h = Math.max(32, Math.round((img.naturalHeight || 300) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const srcData = ctx.getImageData(0, 0, w, h);

        // 1. Floyd-Steinberg Green Dither (#060705 obsidian + #bbff29 acid lime)
        const limeImg = ctx.createImageData(w, h);
        const ld = limeImg.data;
        const luma = new Float32Array(w * h);
        for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
          luma[i] = 0.299 * srcData.data[p] + 0.587 * srcData.data[p + 1] + 0.114 * srcData.data[p + 2];
        }
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const old = luma[idx];
            const val = old >= 122 ? 255 : 0;
            const err = old - val;
            if (x + 1 < w) luma[idx + 1] += err * 7 / 16;
            if (y + 1 < h) {
              if (x > 0) luma[idx + w - 1] += err * 3 / 16;
              luma[idx + w] += err * 5 / 16;
              if (x + 1 < w) luma[idx + w + 1] += err * 1 / 16;
            }
            const p = idx * 4;
            if (val > 0) {
              ld[p] = 187; ld[p + 1] = 255; ld[p + 2] = 41; ld[p + 3] = 255;
            } else {
              ld[p] = 6; ld[p + 1] = 7; ld[p + 2] = 5; ld[p + 3] = 255;
            }
          }
        }
        ctx.putImageData(limeImg, 0, 0);
        const limeUrl = canvas.toDataURL('image/webp', 0.86);

        // 2. Floyd-Steinberg Color Dither (quantized 4-level RGB, never raw undithered image)
        const colorImg = ctx.createImageData(w, h);
        const cd = colorImg.data;
        const rgb = new Float32Array(w * h * 3);
        for (let i = 0, p = 0, q = 0; i < w * h; i++, p += 4, q += 3) {
          rgb[q] = srcData.data[p];
          rgb[q + 1] = srcData.data[p + 1];
          rgb[q + 2] = srcData.data[p + 2];
        }
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const q = (y * w + x) * 3;
            const p = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              const old = rgb[q + c];
              const val = Math.round(Math.max(0, Math.min(255, old)) / 85) * 85;
              const err = old - val;
              cd[p + c] = val;
              if (x + 1 < w) rgb[q + 3 + c] += err * 7 / 16;
              if (y + 1 < h) {
                const rowBelow = ((y + 1) * w + x) * 3;
                if (x > 0) rgb[rowBelow - 3 + c] += err * 3 / 16;
                rgb[rowBelow + c] += err * 5 / 16;
                if (x + 1 < w) rgb[rowBelow + 3 + c] += err * 1 / 16;
              }
            }
            cd[p + 3] = 255;
          }
        }
        ctx.putImageData(colorImg, 0, 0);
        const colorUrl = canvas.toDataURL('image/webp', 0.86);

        resolve({ limeUrl, colorUrl });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

(async function loadFreshMuseumHistory() {
  try {
    const res = await fetch(`/api/history?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items.slice(0, 20) : [];
    const results = await Promise.all(
      items.map(async (item) => {
        const pair = await ditherMuseumImage(item.src);
        if (!pair) return null;
        localArt.add(pair.limeUrl);
        localColor.set(pair.limeUrl, pair.colorUrl);
        if (item.url) localSourceUrl.set(pair.limeUrl, item.url);
        return pair.limeUrl;
      })
    );
    const dithered = results.filter(Boolean);
    if (dithered.length) {
      // Replace old static history images completely with 20 fresh dithered museum works
      collections.history = dithered;
      if (document.body.dataset.scene === 'catalog' && collection === 'history') {
        renderCollection();
        centerSlide(Math.min(2, dithered.length - 1), 'instant');
      }
    }
  } catch {
    // Keep fallback if museum API is unreachable
  }
})();
const backLink = document.querySelector('.cirkular-back');
let uploadReturn = '#world';
let uploadReturnIndex = 2;



let navigating = false;

async function blurThen(control, action) {
  if (navigating) return;
  navigating = true;
  let animation;
  try {
    if (!reducedMotion.matches) {
      animation = control.animate([{filter: getComputedStyle(control).filter}, {filter: 'blur(7px)'}],
        {duration: 180, easing: 'ease-in', fill: 'forwards'});
      await animation.finished;
    }
    action();
  } finally {
    navigating = false;
    animation?.cancel();
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('.opening-nav a, .cirkular-back');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (link.matches('.opening-nav a[href="#manifesto"], .opening-nav a[href*="cirkular-product"], .opening-nav a[href*="cirkular-plugin"]')) {
    if (link.target === '_top') window.top.location.href = link.href;
    else location.href = link.href;
    return;
  }
  blurThen(link, () => {
    if (link.target === '_top') window.top.location.href = link.href;
    else location.href = link.href;
  });
});

function showRoute() {
  const requested = location.hash.slice(1);
  if (requested === 'marketplace') {
    location.replace('./marketplace/');
    return;
  }
  const route = scenes.some(scene => scene.dataset.scene === requested) ? requested : 'home';
  const entering = requested === 'catalog-intro' && !('embed' in document.body.dataset);
  const explicitCollection = Object.hasOwn(collections, requested);
  const activeRoute = explicitCollection || entering ? 'catalog' : route;
  if (activeRoute === 'home') {
    location.replace('./');
    return;
  }
  scenes.forEach(scene => { scene.hidden = scene.dataset.scene !== activeRoute || entering; });
  entry.hidden = !entering;
  if (activeRoute === 'catalog' && !entering) {
    const returningFromUpload = document.body.dataset.scene === 'upload' && location.hash === uploadReturn;
    selectCollection(explicitCollection ? requested : 'world', returningFromUpload ? uploadReturnIndex : 2);
  }
  document.body.dataset.scene = activeRoute;
  backLink.href = activeRoute === 'upload' ? uploadReturn : './';
  backLink.target = '_self';
  backLink.setAttribute('aria-label', activeRoute === 'upload' ? 'Back to Catalog' : 'Back to Cirkular');
  if (dialog.open) dialog.close();
  if (activeRoute !== 'catalog' || entering) focusVideo.pause();
  for (const clip of strip.querySelectorAll('video')) {
    const card = clip.closest('[data-catalog-item]');
    const isCenter = card && card.getAttribute('aria-current') === 'true';
    if (activeRoute === 'catalog' && !entering && isCenter) clip.play().catch(() => {});
    else clip.pause();
  }
  if (activeRoute === 'home') video.play().catch(() => {});
  else video.pause();
  window.scrollTo(0, 0);
}

function renderCollection() {
  const items = collections[collection];
  strip.dataset.collection = collection;
  const positions = [-2, -1, ...items.keys(), items.length, items.length + 1];
  strip.replaceChildren(...positions.map(position => {
    const itemIndex = (position + items.length) % items.length;
    const isEdge = position < 0 || position >= items.length;
    const src = localArt.has(items[itemIndex]) ? items[itemIndex] : `https://prnce.pages.dev/cirkular-world/media/${items[itemIndex]}`;
    const moving = (localArt.has(src) && !src.startsWith('data:image/')) || src.endsWith('.mp4');
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    if (!isEdge) button.dataset.catalogItem = '';
    button.setAttribute('aria-label', `Inspect ${collection} artwork ${itemIndex + 1}`);
    if (collection === 'world' && !localArt.has(src) && !isEdge) button.dataset.focusSrc = src.replace('.mp4', '-full.mp4');
    const media = moving ? document.createElement('video') : new Image();
    media.src = src;
    if (moving) {
      media.defaultMuted = media.muted = media.loop = media.playsInline = true;
      media.autoplay = document.body.dataset.scene === 'catalog';
      media.preload = 'metadata';
    } else media.alt = '';
    button.append(media);
    button.addEventListener('click', () => blurThen(button, () => inspect(itemIndex)));
    return button;
  }));
}

let viewerReturnIndex;
function inspect(itemIndex) {
  viewerReturnIndex = itemIndex;
  const items = collections[collection];
  const file = collection === 'world'
    ? items[itemIndex].replace('.mp4', '-full.mp4')
    : items[itemIndex];
  const src = localArt.has(file) ? file : `https://prnce.pages.dev/cirkular-world/media/${file}`;
  const moving = (localArt.has(src) && !src.startsWith('data:image/')) || src.endsWith('.mp4');
  artVideo.pause();
  artwork.hidden = moving;
  artVideo.hidden = !moving;
  if (moving) {
    artVideo.src = src;
    artVideo.dataset.treated = src;
    artVideo.dataset.color = localArt.has(src) ? localColor.get(src) || '' : src.replace('-full.mp4', '-color.mp4');
    artVideo.play().catch(() => {});
  } else artwork.src = src;
  artwork.dataset.treated = src;
  artwork.dataset.source = localColor.get(src) || (collection === 'history' ? src.replace(/(?:-lime)?\.webp$/, '-color.webp') : '');
  artwork.alt = `${collection} artwork ${itemIndex + 1}`;
  download.href = src;
  download.download = localArt.has(src) ? 'cirkular-compost.' + (src.endsWith('#mp4') ? 'mp4' : 'webm') : file;

  // Wire clickable binary number -> direct artwork source URL + 3-dot fullscreen carousel indicator
  const captionSpan = dialog.querySelector('.art-caption span');
  if (captionSpan) {
    const sourceUrl = localSourceUrl.get(src);
    captionSpan.dataset.clickable = sourceUrl ? 'true' : 'false';
    captionSpan.style.cursor = sourceUrl ? 'pointer' : '';
    captionSpan.title = sourceUrl ? 'Open artwork source' : '';
    captionSpan.onclick = sourceUrl ? () => window.open(sourceUrl, '_blank', 'noopener,noreferrer') : null;
  }
  const fsDots = dialog.querySelectorAll('.fs-dot');
  if (fsDots.length === 3) {
    const bucket = Math.round(itemIndex * 2 / Math.max(1, items.length - 1));
    fsDots.forEach((d, idx) => d.setAttribute('aria-current', String(idx === bucket)));
  }
  for (const control of dialog.querySelectorAll('[aria-pressed]')) {
    control.setAttribute('aria-pressed', 'false');
    dialog.dataset[control.dataset.art] = 'false';
  }
  if (!dialog.open) dialog.showModal();
}
function selectCollection(next, startIndex = 2) {
  collection = next;

  document.querySelectorAll('button[data-collection]').forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.collection === next)));
  renderCollection();
  const start = next === 'world' && requestedContribution ? collections.world.length - 1 : startIndex;
  requestAnimationFrame(() => centerSlide(start, 'instant'));
  requestedContribution = false;
}

document.querySelectorAll('[data-enter-collection]').forEach(button => button.addEventListener('click', () => {
  blurThen(button, () => { location.hash = button.dataset.enterCollection; });
}));
document.querySelectorAll('[data-collection]').forEach(button => button.addEventListener('click', () => {
  blurThen(button, () => {
    if ('embed' in document.body.dataset) selectCollection(button.dataset.collection);
    else location.hash = button.dataset.collection;
  });
}));
const pagination = document.querySelectorAll('[data-slide]');
new ResizeObserver(() => {
  if (strip.clientWidth && strip.querySelector('[data-centered]')) centerSlide(selectedIndex, 'instant');
}).observe(strip);
let selectedIndex = 2;
const catalogCards = () => [...strip.querySelectorAll('[data-catalog-item]')];
function centerSlide(index, behavior) {
  const card = catalogCards()[index];
  if (!card || !strip.clientWidth) return;
  const offset = card.getBoundingClientRect().left - strip.getBoundingClientRect().left;
  selectedIndex = index;
  strip.scrollTo({left: strip.scrollLeft + offset + (card.offsetWidth - strip.clientWidth) / 2, behavior});
  updateGalleryFocus(card);
}
function updateGalleryFocus(active) {
  const cards = catalogCards();
  cards.forEach(card => {
    card.toggleAttribute('data-centered', card === active);
    card.tabIndex = card === active ? 0 : -1;
  });
  if (!active.dataset.focusSrc) {
    focusVideo.pause();
    focusVideo.remove();
  } else if (focusVideo.parentElement !== active) {
    focusVideo.hidden = true;
    focusVideo.src = active.dataset.focusSrc;
    active.append(focusVideo);
    focusVideo.play().catch(() => {});
  } else if (focusVideo.paused) {
    focusVideo.play().catch(() => {});
  }
  pagination.forEach(dot => dot.setAttribute('aria-current', String(Number(dot.dataset.slide) === Math.round(cards.indexOf(active) * 2 / (cards.length - 1)) * 2)));
}
function stepArtwork(direction) {
  const count = collections[collection].length;
  const next = (selectedIndex + direction + count) % count;
  const wrap = Math.abs(next - selectedIndex) > 1;
  centerSlide(next, wrap || reducedMotion.matches ? 'instant' : 'smooth');
}
// Inject 3-dot carousel indicator directly above the binary number in fullscreen dialog
(() => {
  const cap = dialog.querySelector('.art-caption');
  if (!cap || dialog.querySelector('.fs-dots')) return;
  const dots = document.createElement('div');
  dots.className = 'fs-dots';
  dots.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:8px;';
  [0, 1, 2].forEach((bucket) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fs-dot';
    b.setAttribute('aria-label', `Jump to position ${bucket + 1}`);
    b.style.cssText = 'width:8px;height:8px;border-radius:999px;border:0;padding:0;background:rgba(187,255,41,.35);cursor:pointer;transition:width .18s ease,background .18s ease;';
    b.addEventListener('click', () => {
      const len = collections[collection].length;
      const target = Math.round(bucket * (len - 1) / 2);
      inspect(target);
    });
    dots.appendChild(b);
  });
  const style = document.createElement('style');
  style.textContent = '.fs-dot[aria-current="true"]{width:22px!important;background:#bbff29!important;}.art-caption span[data-clickable="true"]:hover{text-decoration:underline;text-underline-offset:4px;}';
  dialog.appendChild(style);
  cap.prepend(dots);
})();

let lastWheelTurn = -Infinity;
let lastTouchSwipe = -Infinity;
const catalogReady = () => document.body.dataset.scene === 'catalog' && !strip.closest('.catalog').hidden && !dialog.open;

window.addEventListener('wheel', event => {
  if (event.ctrlKey) return;
  const inCatalog = catalogReady();
  const inDialog = dialog.open;
  if (!inCatalog && !inDialog) return;
  event.preventDefault();
  const axis = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(axis) < 12) return;
  if (event.timeStamp - lastWheelTurn < 260 || event.timeStamp - lastTouchSwipe < 320) return;
  lastWheelTurn = event.timeStamp;
  const dir = Math.sign(axis);
  if (inDialog) {
    const len = collections[collection].length;
    inspect((viewerReturnIndex + dir + len) % len);
  } else {
    stepArtwork(dir);
  }
}, {passive:false});

window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const dir = event.key === 'ArrowLeft' ? -1 : 1;
  if (dialog.open) {
    event.preventDefault();
    const len = collections[collection].length;
    inspect((viewerReturnIndex + dir + len) % len);
    return;
  }
  if (!catalogReady()) return;
  event.preventDefault();
  stepArtwork(dir);
});

// Swipe left/right inside fullscreen dialog to cycle artworks without closing
let fsTouchX = null;
dialog.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) fsTouchX = e.touches[0].clientX;
}, {passive: true});
dialog.addEventListener('touchend', (e) => {
  if (fsTouchX === null || !e.changedTouches.length) return;
  const dx = e.changedTouches[0].clientX - fsTouchX;
  fsTouchX = null;
  if (Math.abs(dx) >= 42) {
    lastTouchSwipe = performance.now();
    const len = collections[collection].length;
    inspect((viewerReturnIndex + (dx < 0 ? 1 : -1) + len) % len);
  }
}, {passive: true});
pagination.forEach(dot => dot.addEventListener('click', () => centerSlide(Math.round(Number(dot.dataset.slide) * (collections[collection].length - 1) / 4), reducedMotion.matches ? 'instant' : 'smooth')));
dialog.querySelectorAll('button[data-art]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.art === 'close') {
    dialog.close();
    return;
  }
  if (button.dataset.art === 'upload') {
    uploadReturn = `#${collection}`;
    uploadReturnIndex = viewerReturnIndex;
    dialog.close();
    location.hash = 'upload';
    return;
  }
  const enabled = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(enabled));
  if (button.dataset.art === 'invert' && !artVideo.hidden && artVideo.dataset.color) {
    const position = artVideo.currentTime;
    const src = enabled ? artVideo.dataset.color : artVideo.dataset.treated;
    artVideo.src = src;
    artVideo.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(artVideo.duration) && artVideo.duration > 0) artVideo.currentTime = position % artVideo.duration;
    }, {once:true});
    artVideo.play().catch(() => {});
    download.href = src;
    const filename = src.startsWith('blob:') ? `cirkular-compost${enabled ? '-color' : ''}.${src.endsWith('#mp4') ? 'mp4' : 'webm'}` : src.split('/').pop();
    download.download = filename;
    return;
  }
  if (button.dataset.art === 'invert' && artwork.dataset.source) {
    artwork.src = enabled ? artwork.dataset.source : artwork.dataset.treated;
    download.href = artwork.src;
    download.download = new URL(artwork.src).pathname.split('/').pop();
    return;
  }
  dialog.dataset[button.dataset.art] = String(enabled);
}));
dialog.addEventListener('close', () => {
  artVideo.pause();
  if (document.body.dataset.scene !== 'catalog' || strip.closest('.catalog').hidden) return;
  const index = viewerReturnIndex;
  centerSlide(index, 'instant');
  catalogCards()[index]?.focus({preventScroll: true});
});
let touchStart;
window.addEventListener('touchstart', event => {
  touchStart = document.body.dataset.scene === 'catalog' && !strip.closest('.catalog').hidden && !dialog.open && event.touches.length === 1
    ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
window.addEventListener('touchend', event => {
  if (!touchStart || !event.changedTouches.length) return;
  const touch = event.changedTouches[0];
  const vertical = touchStart.y - touch.clientY;
  const horizontal = touchStart.x - touch.clientX;
  touchStart = null;
  const delta = Math.abs(horizontal) > Math.abs(vertical) ? horizontal : vertical;
  if (Math.abs(delta) < 36) return;
  lastTouchSwipe = event.timeStamp;
  stepArtwork(Math.sign(delta));
}, { passive: true });
window.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
addEventListener('hashchange', showRoute);
renderCollection();
showRoute();
installCatalogUpload((src, color) => {
  localArt.add(src);
  if (color) localColor.set(src, color);
  collections.world.push(src);
  if (document.body.dataset.scene === 'upload') requestedContribution = true;
  if (document.body.dataset.scene === 'catalog' && collection === 'world') {
    const current = catalogCards().findIndex(card => card.hasAttribute('data-centered'));
    renderCollection();
    centerSlide(Math.max(0, current), 'instant');
  }
});
