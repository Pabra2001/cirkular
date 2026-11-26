export function loopRecommendations(preview, root, openRecommendations, {blocked = () => false, showReducedPreview = false} = {}) {
  const mark = root.querySelector('.mark');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let elapsed = 0;
  let lastFrame;
  let frame;
  let step = 0;
  let running = false;
  let manual = false;
  const listingCount = root.querySelectorAll('.thumb').length;
  const returnAt = 1650 + listingCount * 2700;
  const beats = [
    [0, () => openRecommendations()],
    ...Array.from({length: listingCount}, (_, index) => [
      1650 + index * 2700, () => openRecommendations(index),
    ]),
    [returnAt, () => {
      const picked = root.querySelector('.thumb[data-picked]');
      mark.style.setProperty('--return-offset', `${picked.offsetTop - mark.offsetTop}px`);
      mark.classList.add('demo-return');
    }],
    [returnAt + 390, () => {
      mark.classList.remove('demo-return');
      if (mark.getAttribute('aria-expanded') === 'true') mark.click();
      mark.classList.add('demo-complete');
    }],
    [returnAt + 1190, () => {
      mark.hidden = true;
    }],
    [returnAt + 1750, () => {
      elapsed = 0;
      step = 0;
      mark.hidden = false;
      mark.classList.remove('demo-complete');
    }],
  ];

  function tick(now) {
    frame = undefined;
    if (!running || !visible || document.hidden || blocked()) return;
    if (lastFrame !== undefined) elapsed += Math.min(now - lastFrame, 100);
    lastFrame = now;
    while (step < beats.length && elapsed >= beats[step][0]) beats[step++][1]();
    if (running) frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = undefined;
    lastFrame = undefined;
    if (running && visible && !document.hidden && !blocked()) frame = requestAnimationFrame(tick);
  }

  function start() {
    if (reduced.matches) {
      if (showReducedPreview) openRecommendations(0);
      return;
    }
    if (mark.getAttribute('aria-expanded') === 'true') mark.click();
    elapsed = 0;
    step = 0;
    running = true;
    mark.hidden = false;
    mark.classList.remove('demo-complete', 'demo-return');
    sync();
  }

  function takeControl(event) {
    if (!event.isTrusted || !running) return;
    running = false;
    manual = true;
    mark.classList.remove('demo-complete', 'demo-return');
    sync();
  }

  root.addEventListener('pointerdown', takeControl);
  root.addEventListener('focusin', takeControl);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      running = false;
      mark.hidden = false;
      mark.classList.remove('demo-complete', 'demo-return');
      if (showReducedPreview && visible && !blocked() && !manual) openRecommendations(0);
      sync();
    } else if (visible && !manual) start();
  });

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) manual = false;
    if (visible && !running && !manual) start();
    else sync();
  }, {threshold: .15});
  observer.observe(preview);
  return sync;
}
