export interface FillResult {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
}

function runFloodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number
): FillResult | null {
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return null;

  const startFlat = startY * width + startX;
  const si = startFlat * 4;
  const sr = data[si];
  const sg = data[si + 1];
  const sb = data[si + 2];

  const visited = new Uint8Array(width * height);
  // Use Int32Array as stack for performance
  const stack = new Int32Array(width * height);
  let stackTop = 0;
  stack[stackTop++] = startFlat;
  visited[startFlat] = 1;

  let minX = startX,
    maxX = startX,
    minY = startY,
    maxY = startY;
  let count = 0;
  const MAX = 4_000_000;

  while (stackTop > 0 && count < MAX) {
    const flat = stack[--stackTop];
    const y = Math.floor(flat / width);
    const x = flat - y * width;
    count++;

    if (x < minX) minX = x;
    else if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    else if (y > maxY) maxY = y;

    // Left
    if (x > 0) {
      const nf = flat - 1;
      if (!visited[nf]) {
        const ni = nf * 4;
        if (colorDist(data[ni], data[ni + 1], data[ni + 2], sr, sg, sb) <= tolerance) {
          visited[nf] = 1;
          stack[stackTop++] = nf;
        }
      }
    }
    // Right
    if (x < width - 1) {
      const nf = flat + 1;
      if (!visited[nf]) {
        const ni = nf * 4;
        if (colorDist(data[ni], data[ni + 1], data[ni + 2], sr, sg, sb) <= tolerance) {
          visited[nf] = 1;
          stack[stackTop++] = nf;
        }
      }
    }
    // Up
    if (y > 0) {
      const nf = flat - width;
      if (!visited[nf]) {
        const ni = nf * 4;
        if (colorDist(data[ni], data[ni + 1], data[ni + 2], sr, sg, sb) <= tolerance) {
          visited[nf] = 1;
          stack[stackTop++] = nf;
        }
      }
    }
    // Down
    if (y < height - 1) {
      const nf = flat + width;
      if (!visited[nf]) {
        const ni = nf * 4;
        if (colorDist(data[ni], data[ni + 1], data[ni + 2], sr, sg, sb) <= tolerance) {
          visited[nf] = 1;
          stack[stackTop++] = nf;
        }
      }
    }
  }

  if (maxX - minX < 8 || maxY - minY < 8) return null;

  return { minX, minY, maxX, maxY, pixelCount: count };
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export async function floodFillImage(
  imageUrl: string,
  startX: number,
  startY: number,
  tolerance: number = 45
): Promise<FillResult | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const result = runFloodFill(imageData.data, w, h, startX, startY, tolerance);
      resolve(result);
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
