import { drawDithered } from './catalog-dither.js?rev=floyd-video';

function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cirkular-catalog', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('videos', { autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function installCatalogUpload(addArtwork) {
  const page = document.querySelector('.catalog-upload');
  const input = page.querySelector('input');
  const canvas = page.querySelector('canvas');
  const colorCanvas = document.createElement('canvas');
  const status = page.querySelector('[role="status"]');
  const save = page.querySelector('.upload-save');
  const source = document.createElement('video');
  source.muted = source.playsInline = source.loop = true;
  let sourceUrl;
  let frame;
  let recorders = [];
  const library = openLibrary();
  const videoUrl = blob => URL.createObjectURL(blob) + (blob.type.includes('mp4') ? '#mp4' : '');
  const publish = entry => {
    const lime = entry.lime || entry;
    addArtwork(videoUrl(lime), entry.color ? videoUrl(entry.color) : undefined);
  };
  library.then(db => {
    const request = db.transaction('videos').objectStore('videos').getAll();
    request.onsuccess = () => request.result.forEach(publish);
  }).catch(() => { status.textContent = 'Browser storage is unavailable.'; });

  const draw = () => {
    if (source.readyState >= 2) {
      const scale = Math.min(1, 480 / Math.max(source.videoWidth, source.videoHeight));
      const options = {
        width: Math.round(source.videoWidth * scale),
        height: Math.round(source.videoHeight * scale),
        algo: 'floyd',
      };
      drawDithered(canvas, source, null, options);
      if (recorders.length) drawDithered(colorCanvas, source, null, {...options, color: true});
    }
    frame = requestAnimationFrame(draw);
  };

  function reset() {
    cancelAnimationFrame(frame);
    source.pause();
    source.removeAttribute('src');
    source.load();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = undefined;
    canvas.hidden = true;
    save.hidden = save.disabled = true;
  }

  input.addEventListener('change', () => {
    reset();
    const file = input.files[0];
    if (!file) return;
    sourceUrl = URL.createObjectURL(file);
    source.src = sourceUrl;
    status.textContent = 'Opening video…';
    source.play().then(() => {
      canvas.hidden = false;
      draw();
      save.hidden = save.disabled = false;
      status.textContent = '';
    }).catch(() => {
      if (sourceUrl) status.textContent = 'This video could not play. Try an MP4 or WebM.';
    });
  });

  save.addEventListener('click', async () => {
    save.disabled = input.disabled = true;
    const streams = [];
    const stopRecording = () => {
      for (const recorder of recorders) if (recorder.state === 'recording') recorder.stop();
    };
    try {
      const db = await library;
      const duration = source.duration;
      if (!Number.isFinite(duration) || duration > 60) throw new Error('Choose a video up to 60 seconds to add it.');
      const mimeType = ['video/webm;codecs=vp8', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      colorCanvas.width = canvas.width;
      colorCanvas.height = canvas.height;
      const output = [canvas, colorCanvas].map(treatment => {
        const stream = treatment.captureStream(24);
        streams.push(stream);
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorders.push(recorder);
        const chunks = [];
        return new Promise((resolve, reject) => {
          recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
          recorder.onerror = () => reject(new Error('The video could not be encoded.'));
          recorder.onstop = () => resolve(new Blob(chunks, {type: recorder.mimeType}));
        });
      });
      source.pause();
      source.loop = false;
      if (source.currentTime !== 0) {
        const seeked = new Promise(resolve => source.addEventListener('seeked', resolve, {once:true}));
        source.currentTime = 0;
        await seeked;
      }
      status.textContent = 'Dithering video…';
      source.onended = stopRecording;
      recorders.forEach(recorder => recorder.start());
      source.play().catch(stopRecording);
      const [lime, color] = await Promise.all(output);
      const entry = {lime, color};
      if (page.hidden) return;
      if (!lime.size || !color.size || !source.ended) throw new Error('The video could not be encoded.');
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('videos', 'readwrite');
        transaction.objectStore('videos').add(entry);
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(new Error('Could not save the video in this browser.'));
      });
      if (page.hidden) return;
      publish(entry);
      location.hash = 'world';
    } catch (error) {
      if (!page.hidden) {
        status.textContent = error.message || 'Video upload is unavailable in this browser.';
        save.disabled = false;
        source.loop = true;
        source.play().catch(() => {});
      }
    } finally {
      stopRecording();
      recorders = [];
      streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
      input.disabled = false;
    }
  });

  addEventListener('hashchange', () => {
    if (!page.hidden) return;
    recorders.forEach(recorder => { if (recorder.state === 'recording') recorder.stop(); });
    reset();
    input.value = '';
    status.textContent = '';
  });
}
