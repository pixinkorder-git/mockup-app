export interface FillResult {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
}

/** Relative luminance in [0, 1]. Values above threshold are "light enough" to be a frame area. */
function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Tolerance (10–120) maps to a luminance threshold:
 *   tolerance=60  → threshold=0.75  (white, cream, light beige)
 *   tolerance=120 → threshold=0.50  (also accepts mid-tones)
 *   tolerance=10  → threshold=0.958 (near-white only)
 */
function toThreshold(tolerance: number): number {
  return Math.max(0, 1 - tolerance / 240);
}

/**
 * BFS flood fill that accepts multiple seed points simultaneously.
 * A pixel is accepted if its luminance >= luminanceThreshold.
 * Returns the merged bounding box over all accepted pixels, or null if too small.
 */
function runFloodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seeds: Array<{ x: number; y: number }>,
  luminanceThreshold: number
): FillResult | null {
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let stackTop = 0;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  // Push all valid seeds onto the stack
  for (const { x, y } of seeds) {
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const flat = y * width + x;
    if (visited[flat]) continue;
    const i = flat * 4;
    if (luminance(data[i], data[i + 1], data[i + 2]) < luminanceThreshold) continue;
    visited[flat] = 1;
    stack[stackTop++] = flat;
  }

  if (stackTop === 0) return null;

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

    // Neighbours: left, right, up, down
    const neighbours = [
      x > 0          ? flat - 1     : -1,
      x < width - 1  ? flat + 1     : -1,
      y > 0          ? flat - width : -1,
      y < height - 1 ? flat + width : -1,
    ];
    for (const nf of neighbours) {
      if (nf < 0 || visited[nf]) continue;
      const ni = nf * 4;
      if (luminance(data[ni], data[ni + 1], data[ni + 2]) >= luminanceThreshold) {
        visited[nf] = 1;
        stack[stackTop++] = nf;
      }
    }
  }

  if (maxX === -Infinity || maxX - minX < 8 || maxY - minY < 8) return null;
  return { minX, minY, maxX, maxY, pixelCount: count };
}

export async function floodFillImage(
  imageUrl: string,
  startX: number,
  startY: number,
  tolerance: number = 60
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
      const { data } = ctx.getImageData(0, 0, w, h);
      const threshold = toThreshold(tolerance);

      // Step 1: initial fill from the click point alone
      const initial = runFloodFill(data, w, h, [{ x: startX, y: startY }], threshold);
      if (!initial) { resolve(null); return; }

      // Step 2: derive additional seed points from the initial bounding box
      //   • centre of the box (catches regions missed by a corner click)
      //   • top-edge centre +2px inward (captures thin strips at the top border)
      const centerX = Math.round((initial.minX + initial.maxX) / 2);
      const centerY = Math.round((initial.minY + initial.maxY) / 2);
      const topSeedY = initial.minY + 2;

      // Step 3: re-run from all seeds together so the regions merge naturally
      const allSeeds = [
        { x: startX,  y: startY   },
        { x: centerX, y: centerY  },
        { x: centerX, y: topSeedY },
      ];
      const merged = runFloodFill(data, w, h, allSeeds, threshold);
      if (!merged) { resolve(null); return; }

      // Step 4: shrink the bounding box by 4px on every side to exclude the
      //   dark frame border from the art-placement rectangle
      const SHRINK = 4;
      const result: FillResult = {
        minX: merged.minX + SHRINK,
        minY: merged.minY + SHRINK,
        maxX: merged.maxX - SHRINK,
        maxY: merged.maxY - SHRINK,
        pixelCount: merged.pixelCount,
      };

      if (result.maxX - result.minX < 8 || result.maxY - result.minY < 8) {
        resolve(null);
        return;
      }

      resolve(result);
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
