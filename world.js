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
    'world-installation-1.mp4', 'world-body-2.mp4', 'world-body-3.mp4', 'world-body-4.mp4', 'world-body-5.mp4',
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
    location.replace('../cirkular-product/?from=world');
    return;
  }
  const route = scenes.some(scene => scene.dataset.scene === requested) ? requested : 'home';
  const entering = requested === 'catalog-intro' && !('embed' in document.body.dataset);
  const explicitCollection = Object.hasOwn(collections, requested);
  const activeRoute = explicitCollection || entering ? 'catalog' : route;
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
    if (activeRoute === 'catalog' && !entering) clip.play().catch(() => {});
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
    const moving = localArt.has(src) || src.endsWith('.mp4');
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
  const moving = localArt.has(src) || src.endsWith('.mp4');
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
  artwork.dataset.source = collection === 'history' ? src.replace(/(?:-lime)?\.webp$/, '-color.webp') : '';
  artwork.alt = `${collection} artwork ${itemIndex + 1}`;
  download.href = src;
  download.download = localArt.has(src) ? 'cirkular-compost.' + (src.endsWith('#mp4') ? 'mp4' : 'webm') : file;
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
let lastWheelEvent = -Infinity;
let lastWheelTurn = -Infinity;
let lastWheelDelta = 0;
let wheelTravel = 0;
let wheelConsumed = false;
let lastTouchSwipe = -Infinity;
const catalogReady = () => document.body.dataset.scene === 'catalog' && !strip.closest('.catalog').hidden && !dialog.open;
window.addEventListener('wheel', event => {
  if (!catalogReady() || event.ctrlKey) return;
  event.preventDefault();
  const axis = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  const delta = axis * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
  if (!delta || event.timeStamp - lastTouchSwipe < 320) return;

  const pause = event.timeStamp - lastWheelEvent;
  const sinceTurn = event.timeStamp - lastWheelTurn;
  const magnitude = Math.abs(delta);
  const previousMagnitude = Math.abs(lastWheelDelta);
  const renewed = sinceTurn > 65 && magnitude >= 36 &&
    (Math.sign(delta) !== Math.sign(lastWheelDelta) || magnitude > previousMagnitude * 1.55 ||
      (magnitude >= 100 && magnitude === previousMagnitude && pause >= 85));
  if (pause > 250 || renewed || event.deltaMode !== 0) {
    wheelTravel = 0;
    wheelConsumed = false;
  }
  lastWheelEvent = event.timeStamp;
  lastWheelDelta = delta;
  if (wheelConsumed) return;
  wheelTravel += delta;
  if (Math.abs(wheelTravel) < 18) return;
  wheelConsumed = true;
  lastWheelTurn = event.timeStamp;
  stepArtwork(Math.sign(wheelTravel));
}, {passive:false});
strip.addEventListener('keydown', event => {
  if (!catalogReady() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  if (event.repeat) return;
  stepArtwork(event.key === 'ArrowLeft' ? -1 : 1);
  if (event.target.matches('[data-catalog-item]')) catalogCards()[selectedIndex].focus({preventScroll: true});
});
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
