import { MockupTemplate, ArtImage, GeneratedResult, Combination } from './types';

// ── Orientation helpers ──────────────────────────────────────────────────────

type Orientation = 'portrait' | 'landscape' | 'square';

function getOrientation(aspect: number): Orientation {
  if (aspect < 1 / 1.1) return 'portrait';  // h/w > 1.1
  if (aspect > 1.1) return 'landscape';       // w/h > 1.1
  return 'square';
}

/** Whether an art aspect ratio is strictly compatible with a frame aspect ratio. */
function isStrictlyCompatible(artAspect: number, frameAspect: number): boolean {
  const frameOrient = getOrientation(frameAspect);
  const artOrient = getOrientation(artAspect);
  if (frameOrient === 'portrait') return artOrient === 'portrait';
  if (frameOrient === 'landscape') return artOrient === 'landscape';
  return artOrient === 'square'; // square frame — prefers square art
}

/** True if at least one art in the pool is compatible with this frame. */
function frameHasCompatibleArt(frameAspect: number, arts: ArtImage[]): boolean {
  const frameOrient = getOrientation(frameAspect);
  if (frameOrient === 'square') return arts.length > 0; // always has a closest-match fallback
  return arts.some((a) => getOrientation(a.w / a.h) === frameOrient);
}

// ── Combination computation ──────────────────────────────────────────────────

/**
 * Compute every valid (mockup × art) combination given the current state.
 * - Single-frame mockup: one combination per compatible art
 * - Multi-frame mockup: one combination total, skipped if any frame has no
 *   compatible art in the pool
 * - Square frames fall back to closest match when no square art exists
 */
export function computeCombinations(
  mockups: MockupTemplate[],
  arts: ArtImage[]
): Combination[] {
  if (arts.length === 0) return [];

  const hasSquareArt = arts.some((a) => getOrientation(a.w / a.h) === 'square');
  const combinations: Combination[] = [];

  for (const mockup of mockups) {
    if (mockup.frames.length === 0) continue;

    if (mockup.frames.length === 1) {
      const frame = mockup.frames[0];
      const frameAspect = frame.w / frame.h;
      const frameOrient = getOrientation(frameAspect);

      for (const art of arts) {
        const artOrient = getOrientation(art.w / art.h);
        let compatible: boolean;
        if (frameOrient === 'portrait') {
          compatible = artOrient === 'portrait';
        } else if (frameOrient === 'landscape') {
          compatible = artOrient === 'landscape';
        } else {
          // Square frame: prefer square art; if none exists accept anything
          compatible = hasSquareArt ? artOrient === 'square' : true;
        }
        if (compatible) {
          combinations.push({ id: `${mockup.id}:${art.id}`, type: 'single', mockupId: mockup.id, artId: art.id });
        }
      }
    } else {
      // Multi-frame: valid only when every frame has at least one compatible art
      const allFramesHaveArt = mockup.frames.every((f) =>
        frameHasCompatibleArt(f.w / f.h, arts)
      );
      if (allFramesHaveArt) {
        combinations.push({ id: mockup.id, type: 'multi', mockupId: mockup.id });
      }
    }
  }

  return combinations;
}

// ── Image loading ────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function coverCrop(
  artW: number,
  artH: number,
  frameW: number,
  frameH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const fAspect = frameW / frameH;
  const aAspect = artW / artH;
  let sx = 0, sy = 0, sw = artW, sh = artH;
  if (aAspect > fAspect) {
    sw = sh * fAspect;
    sx = (artW - sw) / 2;
  } else {
    sh = sw / fAspect;
    sy = (artH - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

// ── Art assignment with strict orientation, no repeats ───────────────────────

/**
 * Pick the best unused art for a frame:
 * 1. Compatible orientation, unused → closest aspect ratio
 * 2. Any unused (fallback for square frames or pool exhaustion) → closest aspect ratio
 * 3. Pool was exhausted → reset and retry
 */
function pickBestUnused(
  frameAspect: number,
  artAspects: number[],
  usedIndices: Set<number>
): number {
  if (usedIndices.size >= artAspects.length) usedIndices.clear();

  const frameOrient = getOrientation(frameAspect);
  let bestIdx = -1;
  let bestDiff = Infinity;

  // Pass 1: compatible + unused
  for (let j = 0; j < artAspects.length; j++) {
    if (usedIndices.has(j)) continue;
    const artOrient = getOrientation(artAspects[j]);
    const compat =
      frameOrient === 'portrait' ? artOrient === 'portrait' :
      frameOrient === 'landscape' ? artOrient === 'landscape' :
      artOrient === 'square';
    if (compat) {
      const diff = Math.abs(artAspects[j] - frameAspect);
      if (diff < bestDiff) { bestDiff = diff; bestIdx = j; }
    }
  }
  if (bestIdx !== -1) return bestIdx;

  // Pass 2: any unused (fallback — square frames, or portrait/landscape
  // after pool reset when frames outnumber compatible arts)
  bestDiff = Infinity;
  for (let j = 0; j < artAspects.length; j++) {
    if (usedIndices.has(j)) continue;
    const diff = Math.abs(artAspects[j] - frameAspect);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = j; }
  }
  return bestIdx !== -1 ? bestIdx : 0;
}

// ── Single combination → GeneratedResult ────────────────────────────────────

async function compositeCombination(
  combination: Combination,
  mockup: MockupTemplate,
  allArts: ArtImage[],
  resultId: string
): Promise<GeneratedResult> {
  const artsToDraw = combination.type === 'single'
    ? [allArts.find((a) => a.id === combination.artId)!]
    : allArts;

  const [mockupImg, ...artImgs] = await Promise.all([
    loadImage(mockup.url),
    ...artsToDraw.map((a) => loadImage(a.url)),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mockupImg.naturalWidth;
  canvas.height = mockupImg.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  const usedNames: string[] = [];

  if (combination.type === 'single') {
    const frame = mockup.frames[0];
    const artImg = artImgs[0];
    const { sx, sy, sw, sh } = coverCrop(artImg.naturalWidth, artImg.naturalHeight, frame.w, frame.h);
    ctx.drawImage(artImg, sx, sy, sw, sh, frame.x, frame.y, frame.w, frame.h);
    usedNames.push(artsToDraw[0].name);
  } else {
    const artAspects = artImgs.map((img) => img.naturalWidth / img.naturalHeight);
    const usedIndices = new Set<number>();

    for (const frame of mockup.frames) {
      const frameAspect = frame.w / frame.h;
      const bestIdx = pickBestUnused(frameAspect, artAspects, usedIndices);
      usedIndices.add(bestIdx);
      usedNames.push(artsToDraw[bestIdx].name);

      const artImg = artImgs[bestIdx];
      const { sx, sy, sw, sh } = coverCrop(artImg.naturalWidth, artImg.naturalHeight, frame.w, frame.h);
      ctx.drawImage(artImg, sx, sy, sw, sh, frame.x, frame.y, frame.w, frame.h);
    }
  }

  // Multiply blend: white frame areas show art, shadows/textures preserved
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(mockupImg, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return {
    id: resultId,
    mockupId: mockup.id,
    mockupName: mockup.name,
    artNames: usedNames,
    dataUrl: canvas.toDataURL('image/jpeg', 0.93),
  };
}

// ── Batch generation (exported) ──────────────────────────────────────────────

export async function generateBatch(
  combinations: Combination[],
  mockups: MockupTemplate[],
  arts: ArtImage[],
  onProgress?: (done: number, total: number) => void
): Promise<GeneratedResult[]> {
  const mockupMap = new Map(mockups.map((m) => [m.id, m]));
  const results: GeneratedResult[] = [];

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    const mockup = mockupMap.get(combo.mockupId);
    if (!mockup) continue;

    const result = await compositeCombination(combo, mockup, arts, `result-${Date.now()}-${i}`);
    results.push(result);
    onProgress?.(i + 1, combinations.length);
  }

  return results;
}
