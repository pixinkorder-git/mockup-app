import { Frame, MockupTemplate, ArtImage, GeneratedResult } from './types';

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
  let sx = 0,
    sy = 0,
    sw = artW,
    sh = artH;
  if (aAspect > fAspect) {
    sw = sh * fAspect;
    sx = (artW - sw) / 2;
  } else {
    sh = sw / fAspect;
    sy = (artH - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

async function compositeSingle(
  mockup: MockupTemplate,
  arts: ArtImage[],
  resultId: string
): Promise<GeneratedResult> {
  const [mockupImg, ...artImgs] = await Promise.all([
    loadImage(mockup.url),
    ...arts.map((a) => loadImage(a.url)),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = mockupImg.naturalWidth;
  canvas.height = mockupImg.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  // Pre-compute each art image's aspect ratio
  const artAspects = artImgs.map((img) => img.naturalWidth / img.naturalHeight);

  // Draw arts into frame bounding boxes — each art used at most once per mockup.
  // Pick by closest aspect ratio from the remaining unused pool; if frames outnumber
  // arts, reset the pool and allow reuse for the overflow frames.
  const usedIndices = new Set<number>();

  const pickBestUnused = (frameAspect: number): number => {
    if (usedIndices.size >= artImgs.length) usedIndices.clear(); // reset when pool exhausted
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let j = 0; j < artAspects.length; j++) {
      if (usedIndices.has(j)) continue;
      const diff = Math.abs(artAspects[j] - frameAspect);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = j;
      }
    }
    return bestIdx;
  };

  // Draw arts into frame bounding boxes first
  for (const frame of mockup.frames) {
    const frameAspect = frame.w / frame.h;
    const bestIdx = pickBestUnused(frameAspect);
    usedIndices.add(bestIdx);
    const artImg = artImgs[bestIdx];
    const { sx, sy, sw, sh } = coverCrop(
      artImg.naturalWidth,
      artImg.naturalHeight,
      frame.w,
      frame.h
    );
    ctx.drawImage(artImg, sx, sy, sw, sh, frame.x, frame.y, frame.w, frame.h);
  }

  // Overlay mockup with multiply blend — white frame areas let art show through,
  // shadows/textures darken the art naturally for realism
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(mockupImg, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return {
    id: resultId,
    mockupId: mockup.id,
    mockupName: mockup.name,
    artNames: arts.map((a) => a.name),
    dataUrl: canvas.toDataURL('image/jpeg', 0.93),
  };
}

export async function generateAllResults(
  mockups: MockupTemplate[],
  arts: ArtImage[],
  onProgress?: (done: number, total: number) => void
): Promise<GeneratedResult[]> {
  if (arts.length === 0) return [];

  // Calculate total results
  let total = 0;
  for (const mockup of mockups) {
    if (mockup.frames.length === 0) continue;
    total += mockup.frames.length === 1 ? arts.length : 1;
  }

  const results: GeneratedResult[] = [];
  let counter = 0;
  let done = 0;

  for (const mockup of mockups) {
    if (mockup.frames.length === 0) continue;

    if (mockup.frames.length === 1) {
      // Single-frame: one result per art image (round-robin across templates)
      for (const art of arts) {
        const result = await compositeSingle(mockup, [art], `result-${counter++}`);
        results.push(result);
        done++;
        onProgress?.(done, total);
      }
    } else {
      // Multi-frame: place all arts at once (art[i] → frame[i], cycling)
      const result = await compositeSingle(mockup, arts, `result-${counter++}`);
      results.push(result);
      done++;
      onProgress?.(done, total);
    }
  }

  return results;
}
