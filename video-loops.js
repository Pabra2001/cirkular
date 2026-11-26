// Content endpoints checked against the last frames of the local portfolio masters.
const loopEnds = {
  "faith-case-study/media/cana-dry-clean.mp4": 87.85,
  "faith-case-study/media/eve.mp4": 28.06,
  "faith-case-study/media/plagues.mp4": 46.66,
  "faith-case-study/media/cana-dry-wedding.mp4": 49.76,
  "faith-case-study/media/cana-miracle.mp4": 55.86,
  "tab-case-study/media/goldfish-4k.mp4": 45.46,
  "tab-case-study/media/italy-boutique-hd.mp4": 46.93,
  "tab-case-study/media/culture-film-standard-1080-64f4a20c3192.mp4": 12.29,
  "tab-case-study/media/italy-boutique.mp4": 46.93,
  "tab-case-study/media/creative-film-standard-1080-8aa9720cbe76.mp4": 13.29,
  "tab-case-study/media/community-film-standard-1080-2a7abb94da8e.mp4": 12.29,
  "assets/night-to-remember.mp4": 17.36,
  "assets/tab-goldfish.mp4": 45.46,
  "assets/joyrider.mp4": 12.36,
  "assets/everyday-heels.mp4": 11.23,
  "assets/flik-tutorial-5.mp4": 30.79,
  "assets/clean-sweep.mp4": 13.16,
  "assets/good-sister-current.mp4": 12.29,
  "assets/negotiator.mp4": 12.36,
  "assets/unbothered.mp4": 12.36,
  "assets/deep-clean.mp4": 12.36,
  "assets/film-viewer/archive-mosquito.mp4": 12.97,
  "faith-case-study/media/archangels.mp4": 110.0,
  "faith-case-study/media/lucifer.mp4": 116.9
};
const base = new URL('.', import.meta.url).pathname;
const frameCallbacks = new WeakMap();

function endpoint(video) {
  const source = video.currentSrc || video.src;
  if (!source) return undefined;
  const path = decodeURIComponent(new URL(source, location.href).pathname);
  return path.startsWith(base) ? loopEnds[path.slice(base.length)] : undefined;
}

function restart(video, time) {
  if (!video.loop || video.seeking || video.paused) return;
  const end = endpoint(video);
  if (end && time >= end) video.currentTime = 0;
}

function watch(video) {
  if (!(video instanceof HTMLVideoElement) || !video.loop || !endpoint(video) ||
      !video.requestVideoFrameCallback || frameCallbacks.has(video)) return;
  const tick = (_, frame) => {
    restart(video, frame.mediaTime);
    if (!video.paused && video.isConnected) frameCallbacks.set(video, video.requestVideoFrameCallback(tick));
    else frameCallbacks.delete(video);
  };
  frameCallbacks.set(video, video.requestVideoFrameCallback(tick));
}

document.addEventListener('play', event => watch(event.target), true);
document.addEventListener('timeupdate', event => {
  if (event.target instanceof HTMLVideoElement) restart(event.target, event.target.currentTime);
}, true);
document.querySelectorAll('video').forEach(video => { if (!video.paused) watch(video); });
