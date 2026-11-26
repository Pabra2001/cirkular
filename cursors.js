const root = document.documentElement;
const enabled = matchMedia('(any-pointer: fine) and (forced-colors: none) and (prefers-contrast: no-preference)');
let point;
let frame;

function updateCursor() {
  frame = undefined;
  if (!point) return;

  // Use the backing surface so crossing letters or a moving image doesn't recolor the square.
  const layers = [];
  for (let element = document.elementFromPoint(point.x, point.y); element; element = element.parentElement) {
    const style = getComputedStyle(element);
    if (element.matches('img, video, canvas, iframe') || style.backgroundImage !== 'none') {
      root.removeAttribute('data-square-tone');
      return;
    }
    const channels = style.backgroundColor.match(/^rgba?\((.*)\)$/)?.[1].split(',').map(Number);
    if (!channels) continue;
    const [red, green, blue, alpha = 1] = channels;
    if (alpha) layers.push([.213 * red + .715 * green + .072 * blue, alpha]);
    if (alpha === 1) break;
  }

  const brightness = layers.reduceRight((under, [value, alpha]) => under * (1 - alpha) + value * alpha, 255);
  root.dataset.squareTone = brightness < 112 ? 'light' : 'dark';
}

function schedule() {
  if (point && frame === undefined) frame = requestAnimationFrame(updateCursor);
}

function clear() {
  point = undefined;
  root.removeAttribute('data-square-tone');
}

document.addEventListener('pointermove', event => {
  if (!enabled.matches || event.pointerType !== 'mouse') return;
  point = {x: event.clientX, y: event.clientY};
  schedule();
}, {capture: true, passive: true});
document.addEventListener('pointerout', event => {
  if (event.pointerType === 'mouse' && !event.relatedTarget) clear();
}, {passive: true});
document.addEventListener('scroll', schedule, {capture: true, passive: true});
document.addEventListener('click', schedule, {passive: true});
window.addEventListener('resize', schedule);
window.addEventListener('blur', clear);
enabled.addEventListener('change', clear);
