// Keep horizontal trackpad gestures on the page, including at carousel boundaries.
window.addEventListener('wheel', event => {
  if (!event.cancelable || event.defaultPrevented || event.ctrlKey) return;
  const horizontal = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
  if (!horizontal || (!event.shiftKey && Math.abs(horizontal) <= Math.abs(event.deltaY))) return;

  // Let native thumbnail strips and other horizontal scrollers consume the gesture.
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement) || node === document.scrollingElement) continue;
    const range = node.scrollWidth - node.clientWidth;
    if (range <= 1 || !/^(auto|scroll)$/.test(getComputedStyle(node).overflowX)) continue;
    if (horizontal < 0 ? node.scrollLeft > 0 : node.scrollLeft < range - 1) return;
  }
  event.preventDefault();
}, {passive: false});
