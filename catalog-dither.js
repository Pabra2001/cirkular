// Ordered Bayer and error diffusion from the Digital Compost renderer.
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function drawDithered(canvas, sourceEl, crop, opts = {}) {
  const W = opts.width || 320;
  const H = opts.height || Math.round(W * 0.75);
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#020301';
  ctx.fillRect(0, 0, W, H);

  const srcW = sourceEl.videoWidth || sourceEl.naturalWidth || sourceEl.width;
  const srcH = sourceEl.videoHeight || sourceEl.naturalHeight || sourceEl.height;
  if (!srcW || !srcH) return { W, H, packedBytes: (W * H) / 8 };

  const sx = crop ? crop.sx : 0;
  const sy = crop ? crop.sy : 0;
  const sw = crop ? crop.sw : srcW;
  const sh = crop ? crop.sh : srcH;
  const scale = Math.max(W / sw, H / sh);
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  ctx.drawImage(sourceEl, sx, sy, sw, sh, Math.floor((W - dw) / 2), Math.floor((H - dh) / 2), dw, dh);

  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;
  if (opts.color) {
    const rgb = new Float32Array(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      for (let channel = 0; channel < 3; channel++) rgb[i * 3 + channel] = d[i * 4 + channel] / 255;
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const pixel = y * W + x;
        for (let channel = 0; channel < 3; channel++) {
          const index = pixel * 3 + channel;
          const level = Math.round(Math.min(1, Math.max(0, rgb[index])) * 5) / 5;
          const error = rgb[index] - level;
          if (x + 1 < W) rgb[index + 3] += error * 7 / 16;
          if (y + 1 < H) {
            const below = index + W * 3;
            if (x > 0) rgb[below - 3] += error * 3 / 16;
            rgb[below] += error * 5 / 16;
            if (x + 1 < W) rgb[below + 3] += error / 16;
          }
          d[pixel * 4 + channel] = level * 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return { W, H };
  }
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const p = i * 4;
    const g = (d[p] * 0.2126 + d[p + 1] * 0.7152 + d[p + 2] * 0.0722) / 255;
    lum[i] = Math.min(1, Math.max(0, (g - 0.06) * 1.18));
  }

  if (opts.sourceOnly) {
    for (let i = 0; i < W * H; i++) {
      const v = Math.round(lum[i] * 255);
      const p = i * 4;
      d[p] = v; d[p + 1] = v; d[p + 2] = v; d[p + 3] = 255;
    }
  } else if (opts.algo === 'bayer') {
    const t = opts.threshold ?? 0.44;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        const b = (BAYER_4[y & 3][x & 3] + 0.5) / 16;
        const on = lum[idx] + (0.5 - t) > b ? 1 : 0;
        const p = idx * 4;
        if (on) { d[p] = 187; d[p + 1] = 255; d[p + 2] = 41; }
        else { d[p] = 2; d[p + 1] = 3; d[p + 2] = 1; }
        d[p + 3] = 255;
      }
    }
  } else {
    const t = opts.threshold ?? 0.44;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        const old = lum[idx];
        const on = old > t ? 1 : 0;
        const err = old - on;
        if (x + 1 < W) lum[idx + 1] += (err * 7) / 16;
        if (y + 1 < H) {
          if (x > 0) lum[idx + W - 1] += (err * 3) / 16;
          lum[idx + W] += (err * 5) / 16;
          if (x + 1 < W) lum[idx + W + 1] += (err * 1) / 16;
        }
        const p = idx * 4;
        if (on) { d[p] = 187; d[p + 1] = 255; d[p + 2] = 41; }
        else { d[p] = 2; d[p + 1] = 3; d[p + 2] = 1; }
        d[p + 3] = 255;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return { W, H, packedBytes: Math.round((W * H) / 8) };
}
