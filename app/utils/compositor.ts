import { MockupTemplate, ArtImage, Frame, GeneratedResult, Combination } from './types';

// ── Orientation helpers ──────────────────────────────────────────────────────

type Orientation = 'portrait' | 'landscape' | 'square';

function getOrientation(ratio: number): Orientation {
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.85) return 'portrait';
  return 'square'; // 0.85 – 1.15
}

/**
 * Orientation compatibility rules:
 * Portrait frame (w/h < 0.85)  → accepts portrait AND square art
 * Landscape frame (w/h > 1.15) → accepts ONLY landscape art
 * Square frame (0.85 – 1.15)   → accepts ONLY square art
 */
function isCompatible(artAspect: number, frameAspect: number): boolean {
  const frameOrient = getOrientation(frameAspect);
  const artOrient   = getOrientation(artAspect);
  let compatible: boolean;
  if (frameOrient === 'landscape') compatible = artOrient === 'landscape';
  else if (frameOrient === 'square') compatible = artOrient === 'square';
  else compatible = artOrient === 'portrait' || artOrient === 'square'; // portrait frame
  if (!compatible) {
    console.log('[isCompatible] REJECTED —',
      `frame=${frameOrient}(ratio=${frameAspect.toFixed(3)})`,
      `art=${artOrient}(ratio=${artAspect.toFixed(3)})`
    );
  }
  return compatible;
}

// ── Permutation generation ───────────────────────────────────────────────────

const MULTI_FRAME_CAP = 50;

/**
 * Generate all unique permutations of arts across frames via backtracking.
 * Each frame only accepts compatible arts (strict orientation match).
 * If no compatible art exists for a frame, that branch is abandoned entirely.
 * No art repeats within a single combination. Capped at MULTI_FRAME_CAP.
 */
function generateAssignments(frames: Frame[], arts: ArtImage[]): string[][] {
  const results: string[][] = [];

  function backtrack(frameIdx: number, current: string[], usedIds: Set<string>) {
    if (results.length >= MULTI_FRAME_CAP) return;
    if (frameIdx === frames.length) {
      results.push([...current]);
      return;
    }

    const frame = frames[frameIdx];
    const frameAspect = frame.w / frame.h;

    // Only compatible + unused arts — no fallbacks
    const candidates = arts.filter(
      (a) => !usedIds.has(a.id) && isCompatible(a.w / a.h, frameAspect)
    );

    // If no candidate exists for this frame, abandon this branch
    if (candidates.length === 0) return;

    for (const art of candidates) {
      if (results.length >= MULTI_FRAME_CAP) return;
      usedIds.add(art.id);
      current.push(art.id);
      backtrack(frameIdx + 1, current, usedIds);
      current.pop();
      usedIds.delete(art.id);
    }
  }

  backtrack(0, [], new Set());
  return results;
}

// ── Combination computation ──────────────────────────────────────────────────

/**
 * Single-frame mockup: one combination per art (M total).
 * Multi-frame mockup:  all unique art permutations across frames, capped at
 *                      MULTI_FRAME_CAP per mockup. Orientation rules applied
 *                      per frame; fallback to closest art so nothing is skipped.
 */
export function computeCombinations(
  mockups: MockupTemplate[],
  arts: ArtImage[]
): Combination[] {
  if (arts.length === 0) return [];

  const combinations: Combination[] = [];

  for (const mockup of mockups) {
    if (mockup.frames.length === 0) continue;

    if (mockup.frames.length === 1) {
      // ── Single-frame: one combination per compatible art ──────────────────
      const frameAspect = mockup.frames[0].w / mockup.frames[0].h;
      for (const art of arts) {
        if (!isCompatible(art.w / art.h, frameAspect)) continue;
        combinations.push({
          id: `${mockup.id}:${art.id}`,
          type: 'single',
          mockupId: mockup.id,
          artId: art.id,
        });
      }
    } else {
      // ── Multi-frame: all unique permutations up to cap ────────────────────
      const assignments = generateAssignments(mockup.frames, arts);
      for (let i = 0; i < assignments.length; i++) {
        combinations.push({
          id: `${mockup.id}:perm${i}`,
          type: 'multi',
          mockupId: mockup.id,
          artIds: assignments[i],
        });
      }
    }
  }

  return combinations;
}

// ── Combination ordering ─────────────────────────────────────────────────────

/**
 * Re-order combinations round-robin by mockup so that every batch starts with
 * variety: mockup-A combo-1, mockup-B combo-1, …, mockup-A combo-2, …
 *
 * This guarantees the first BATCH_SIZE results contain at least one result per
 * mockup (as long as there are ≤ BATCH_SIZE mockups).
 */
export function orderCombinations(
  combinations: Combination[],
  mockups: MockupTemplate[]
): Combination[] {
  const byMockup = new Map<string, Combination[]>();
  for (const m of mockups) byMockup.set(m.id, []);
  for (const c of combinations) byMockup.get(c.mockupId)?.push(c);

  const lists = mockups.map((m) => byMockup.get(m.id) ?? []).filter((l) => l.length > 0);
  const ordered: Combination[] = [];
  let depth = 0;

  while (ordered.length < combinations.length) {
    let added = false;
    for (const list of lists) {
      if (depth < list.length) {
        ordered.push(list[depth]);
        added = true;
      }
    }
    if (!added) break;
    depth++;
  }

  return ordered;
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
  // Math.max ensures the art always fully covers the frame (CSS cover behavior).
  // Never use Math.min here — that would leave gaps on one axis.
  const scale = Math.max(frameW / artW, frameH / artH);
  const sw = frameW / scale;
  const sh = frameH / scale;
  const sx = (artW - sw) / 2;
  const sy = (artH - sh) / 2;
  console.log('[coverCrop]', {
    artW, artH, frameW, frameH,
    scale,
    sx: Math.round(sx), sy: Math.round(sy),
    sw: Math.round(sw), sh: Math.round(sh),
    coversWidth:  Math.round(sw * scale) >= frameW,
    coversHeight: Math.round(sh * scale) >= frameH,
  });
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
    const artMap = new Map(allArts.map((a) => [a.id, a]));
    artsInOrder = (combination.artIds ?? []).map((id) => artMap.get(id)!);
  }

  const [mockupImg, ...artImgs] = await Promise.all([
    loadImage(mockup.url),
    ...artsInOrder.map((a) => loadImage(a.url)),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mockupImg.naturalWidth;
  canvas.height = mockupImg.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw the full mockup first (background, shadows, surrounding content)
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(mockupImg, 0, 0);

  // 2. For each frame, draw art on top — clipped to the frame rect.
  //    White fill covers any mockup content in the frame area so transparent
  //    art pixels show as white rather than the mockup underneath.
  for (let j = 0; j < mockup.frames.length; j++) {
    const frame = mockup.frames[j];
    const artImg = artImgs[j];
    const { sx, sy, sw, sh } = coverCrop(artImg.naturalWidth, artImg.naturalHeight, frame.w, frame.h);

    const r = frame.cornerRadius ?? 0;
    ctx.save();
    ctx.beginPath();
    if (r > 0 && ctx.roundRect) {
      ctx.roundRect(frame.x, frame.y, frame.w, frame.h, r);
    } else {
      ctx.rect(frame.x, frame.y, frame.w, frame.h);
    }
    ctx.clip();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(artImg, sx, sy, sw, sh, frame.x, frame.y, frame.w, frame.h);
    ctx.restore();
  }

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
