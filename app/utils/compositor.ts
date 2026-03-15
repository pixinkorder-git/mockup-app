import { MockupTemplate, ArtImage, GeneratedResult, Combination } from './types';

// ── Orientation helpers ──────────────────────────────────────────────────────

type Orientation = 'portrait' | 'landscape' | 'square';

function getOrientation(aspect: number): Orientation {
  if (aspect < 1 / 1.1) return 'portrait';  // h/w > 1.1
  if (aspect > 1.1) return 'landscape';       // w/h > 1.1
  return 'square';
}

/**
 * Whether this specific art is compatible with this specific frame.
 * Square frames fall back to accepting any art when no square art exists.
 */
function isCompatible(artAspect: number, frameAspect: number, hasSquareArt: boolean): boolean {
  const frameOrient = getOrientation(frameAspect);
  const artOrient = getOrientation(artAspect);
  if (frameOrient === 'portrait') return artOrient === 'portrait';
  if (frameOrient === 'landscape') return artOrient === 'landscape';
  // Square frame: prefer square art; if none exists, accept any
  return hasSquareArt ? artOrient === 'square' : true;
}

// ── Combination computation ──────────────────────────────────────────────────

/**
 * Compute every valid combination:
 *
 * Single-frame mockup × each compatible art = 1 combination per art
 *
 * Multi-frame mockup (N frames) × M arts = up to M combinations via sliding window:
 *   combo i → frame[j] receives arts[(i + j) % M]
 *   A combo is skipped only when the assigned art for any frame is orientation-incompatible.
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
      // ── Single-frame: one combination per compatible art ──────────────────
      const frame = mockup.frames[0];
      const frameAspect = frame.w / frame.h;
      for (const art of arts) {
        if (isCompatible(art.w / art.h, frameAspect, hasSquareArt)) {
          combinations.push({
            id: `${mockup.id}:${art.id}`,
            type: 'single',
            mockupId: mockup.id,
            artId: art.id,
          });
        }
      }
    } else {
      // ── Multi-frame: M combinations, one per sliding-window start position ─
      const N = mockup.frames.length;
      const M = arts.length;

      for (let startIdx = 0; startIdx < M; startIdx++) {
        // Check that every (frame[j], arts[(startIdx+j)%M]) pair is orientation-compatible
        let valid = true;
        for (let j = 0; j < N; j++) {
          const art = arts[(startIdx + j) % M];
          const frame = mockup.frames[j];
          if (!isCompatible(art.w / art.h, frame.w / frame.h, hasSquareArt)) {
            valid = false;
            break;
          }
        }
        if (valid) {
          combinations.push({
            id: `${mockup.id}:${startIdx}`,
            type: 'multi',
            mockupId: mockup.id,
            artStartIdx: startIdx,
          });
        }
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

// ── Single combination → GeneratedResult ────────────────────────────────────

async function compositeCombination(
  combination: Combination,
  mockup: MockupTemplate,
  allArts: ArtImage[],
  resultId: string
): Promise<GeneratedResult> {
  // Resolve which arts to draw, in frame order
  let artsInOrder: ArtImage[];
  if (combination.type === 'single') {
    artsInOrder = [allArts.find((a) => a.id === combination.artId)!];
  } else {
    // Sliding window: frame[j] ← allArts[(startIdx + j) % M]
    const startIdx = combination.artStartIdx ?? 0;
    const M = allArts.length;
    const N = mockup.frames.length;
    artsInOrder = Array.from({ length: N }, (_, j) => allArts[(startIdx + j) % M]);
  }

  const [mockupImg, ...artImgs] = await Promise.all([
    loadImage(mockup.url),
    ...artsInOrder.map((a) => loadImage(a.url)),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mockupImg.naturalWidth;
  canvas.height = mockupImg.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  for (let j = 0; j < mockup.frames.length; j++) {
    const frame = mockup.frames[j];
    const artImg = artImgs[j];
    const { sx, sy, sw, sh } = coverCrop(artImg.naturalWidth, artImg.naturalHeight, frame.w, frame.h);
    ctx.drawImage(artImg, sx, sy, sw, sh, frame.x, frame.y, frame.w, frame.h);
  }

  // Multiply blend: white frame areas show art through; shadows/textures preserved
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(mockupImg, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return {
    id: resultId,
    mockupId: mockup.id,
    mockupName: mockup.name,
    artNames: artsInOrder.map((a) => a.name),
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
