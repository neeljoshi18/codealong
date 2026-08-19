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

function cropEditor(img: HTMLImageElement): HTMLCanvasElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  const fctx = full.getContext("2d")!;
  fctx.drawImage(img, 0, 0);

  const leftHalf = document.createElement("canvas");
  leftHalf.width = Math.max(1, Math.floor(w / 2));
  leftHalf.height = h;
  leftHalf.getContext("2d")!.drawImage(full, 0, 0, w / 2, h, 0, 0, w / 2, h);
  const rightHalf = document.createElement("canvas");
  rightHalf.width = Math.max(1, Math.floor(w / 2));
  rightHalf.height = h;
  rightHalf.getContext("2d")!.drawImage(full, w / 2, 0, w / 2, h, 0, 0, w / 2, h);
  const cam = document.createElement("canvas");
  const camW = Math.max(1, Math.floor(w * 0.3));
  const camH = Math.max(1, Math.floor(h * 0.48));
  cam.width = camW;
  cam.height = camH;
  cam.getContext("2d")!.drawImage(full, w * 0.7, h * 0.52, w * 0.3, h * 0.48, 0, 0, camW, camH);

  const leftMean = mean(leftHalf);
  const rightMean = mean(rightHalf);
  const camMean = mean(cam);

  let left = w * 0.08;
  let right = w * 0.92;
  let top = h * 0.15;
  let bottom = h * 0.82;
  if (camMean > 90) {
    right = w * 0.62;
    top = h * 0.12;
    bottom = h * 0.78;
  } else if (rightMean > leftMean + 18) {
    right = w * 0.48;
  }

  const cw = Math.max(8, Math.floor(right - left));
  const ch = Math.max(8, Math.floor(bottom - top));
  const out = document.createElement("canvas");
  out.width = cw * 2;
  out.height = ch * 2;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(full, left, top, cw, ch, 0, 0, out.width, out.height);
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
