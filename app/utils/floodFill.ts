export interface FillResult {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
}

/** Relative luminance in [0, 1] */
function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Chebyshev distance: max absolute difference across R, G, B channels.
 * Using max instead of sum prevents accepting pixels that differ a lot in
 * one channel (e.g. a red tint) while being close on the other two.
 */
function colorDist(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

/**
 * tolerance (10–120) → per-channel max distance from the seed pixel color.
 *   tolerance=10  → maxDist=15  (near-identical pixels only — near-pure-white)
 *   tolerance=60  → maxDist=90  (off-white, light gray, warm/cool tints)
 *   tolerance=120 → maxDist=180 (any light-ish area)
 *
 * Because comparison is relative to the seed color, gray frames are detected
 * correctly regardless of their absolute brightness. Clicking on RGB(210,210,210)
 * will spread through similar grays and stop at the dark frame border.
 */
function toMaxDist(tolerance: number): number {
  return Math.round(tolerance * 1.5);
}

/** Never include pixels darker than this, regardless of tolerance. */
const MIN_LUMINANCE = 0.20;

function runFloodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seeds: Array<{ x: number; y: number }>,
  seedR: number, seedG: number, seedB: number,
  maxDist: number
): FillResult | null {
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let stackTop = 0;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const { x, y } of seeds) {
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const flat = y * width + x;
    if (visited[flat]) continue;
    const i = flat * 4;
    if (luminance(data[i], data[i + 1], data[i + 2]) < MIN_LUMINANCE) continue;
    if (colorDist(data[i], data[i + 1], data[i + 2], seedR, seedG, seedB) > maxDist) continue;
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

    const neighbours = [
      x > 0          ? flat - 1     : -1,
      x < width - 1  ? flat + 1     : -1,
      y > 0          ? flat - width : -1,
      y < height - 1 ? flat + width : -1,
    ];
    for (const nf of neighbours) {
      if (nf < 0 || visited[nf]) continue;
      const ni = nf * 4;
      if (
        luminance(data[ni], data[ni + 1], data[ni + 2]) >= MIN_LUMINANCE &&
        colorDist(data[ni], data[ni + 1], data[ni + 2], seedR, seedG, seedB) <= maxDist
      ) {
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
      const maxDist = toMaxDist(tolerance);

      // Capture the seed pixel color at the click point
      const si = (startY * w + startX) * 4;
      const seedR = data[si];
      const seedG = data[si + 1];
      const seedB = data[si + 2];

      // Reject clicks on very dark areas (frame border, dark background)
      if (luminance(seedR, seedG, seedB) < MIN_LUMINANCE) { resolve(null); return; }

      // Step 1: initial fill from click point
      const initial = runFloodFill(
        data, w, h,
        [{ x: startX, y: startY }],
        seedR, seedG, seedB, maxDist
      );
      if (!initial) { resolve(null); return; }

      // Step 2: secondary seeds from bounding box to catch regions missed by
      //   an off-centre click (centre + top-edge inset)
      const centerX = Math.round((initial.minX + initial.maxX) / 2);
      const centerY = Math.round((initial.minY + initial.maxY) / 2);
      const topSeedY = initial.minY + 2;

      const allSeeds = [
        { x: startX,  y: startY   },
        { x: centerX, y: centerY  },
        { x: centerX, y: topSeedY },
      ];
      const merged = runFloodFill(data, w, h, allSeeds, seedR, seedG, seedB, maxDist);
      if (!merged) { resolve(null); return; }

      // Expand bounding box by 1px on each side so edge pixels (which may be
      // just outside the detected area due to anti-aliasing) are fully covered.
      const EXPAND = 1;
      const result: FillResult = {
        minX: Math.max(0,     merged.minX - EXPAND),
        minY: Math.max(0,     merged.minY - EXPAND),
        maxX: Math.min(w - 1, merged.maxX + EXPAND),
        maxY: Math.min(h - 1, merged.maxY + EXPAND),
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
