function mean(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  const small = document.createElement("canvas");
  small.width = 32;
  small.height = 32;
  const sctx = small.getContext("2d");
  if (!sctx) return 0;
  sctx.drawImage(canvas, 0, 0, 32, 32);
  const { data } = sctx.getImageData(0, 0, 32, 32);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return sum / (32 * 32);
}

function columnMeans(full: HTMLCanvasElement, bins = 32): number[] {
  const w = full.width;
  const h = full.height;
  const ctx = full.getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, w, h);
  const sums = new Array<number>(bins).fill(0);
  const counts = new Array<number>(bins).fill(0);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const bin = Math.min(bins - 1, Math.floor((x / w) * bins));
      const i = (y * w + x) * 4;
      sums[bin] += Math.max(data[i], data[i + 1], data[i + 2]);
      counts[bin] += 1;
    }
  }
  return sums.map((s, i) => s / Math.max(1, counts[i]));
}

function cropEditor(img: HTMLImageElement): HTMLCanvasElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  const fctx = full.getContext("2d")!;
  fctx.drawImage(img, 0, 0);

  const cols = columnMeans(full, 64);
  const leftMean = cols.slice(0, 16).reduce((a, b) => a + b, 0) / 16;
  const rightMean = cols.slice(48).reduce((a, b) => a + b, 0) / 16;
  const cam = document.createElement("canvas");
  const camW = Math.max(1, Math.floor(w * 0.3));
  const camH = Math.max(1, Math.floor(h * 0.48));
  cam.width = camW;
  cam.height = camH;
  cam.getContext("2d")!.drawImage(full, w * 0.7, h * 0.52, w * 0.3, h * 0.48, 0, 0, camW, camH);
  const camMean = mean(cam);

  let left = w * 0.06;
  let right = w * 0.92;
  let top = h * 0.08;
  let bottom = h * 0.88;
  if (leftMean < 95 && rightMean > leftMean + 30) {
    const threshold = (leftMean + rightMean) / 2;
    let split = 40;
    for (let i = 16; i < 56; i++) {
      if (cols[i] > threshold) {
        split = i;
        break;
      }
    }
    left = w * 0.04;
    right = Math.max(w * 0.38, (split / 64) * w + w * 0.01);
    top = h * 0.07;
    bottom = h * 0.9;
  } else if (camMean > 90 && camMean < 210) {
    left = w * 0.09;
    right = w * 0.63;
    top = h * 0.07;
    bottom = h * 0.8;
  } else if (rightMean > leftMean + 18) {
    right = w * 0.48;
  }

  const cw = Math.max(8, Math.floor(right - left));
  const ch = Math.max(8, Math.floor(bottom - top));
  const scale = Math.min(cw, ch) < 280 ? 3 : 2;
  const out = document.createElement("canvas");
  out.width = cw * scale;
  out.height = ch * scale;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(full, left, top, cw, ch, 0, 0, out.width, out.height);
  const ink = ctx.getImageData(0, 0, out.width, out.height);
  const px = ink.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const mx = Math.max(px[i], px[i + 1], px[i + 2]);
    sum += mx;
    px[i] = mx;
    px[i + 1] = mx;
    px[i + 2] = mx;
  }
  const grayMean = sum / (out.width * out.height);
  if (grayMean < 140) {
    for (let i = 0; i < px.length; i += 4) {
      const v = 255 - px[i];
      px[i] = v;
      px[i + 1] = v;
      px[i + 2] = v;
    }
  }
  ctx.putImageData(ink, 0, 0);
  return out;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the frame image."));
    };
    img.src = url;
  });
}

export async function ocrFrameBlob(blob: Blob): Promise<string> {
  const img = await loadImage(blob);
  const cropped = cropEditor(img);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(cropped);
    return (result.data.text || "").trim();
  } finally {
    await worker.terminate();
  }
}
