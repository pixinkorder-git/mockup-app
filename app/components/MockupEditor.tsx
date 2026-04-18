'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Frame } from '@/app/utils/types';
import { floodFillImage } from '@/app/utils/floodFill';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'auto' | 'manual';

interface DragState {
  startX: number; // display coords
  startY: number;
  curX: number;
  curY: number;
}

/** The 8 resize handle directions */
type HandleDir = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

interface HitResult {
  frameId: string;
  type: 'handle' | 'body';
  handle?: HandleDir;
}

interface MoveState {
  frameId: string;
  startCursorDx: number;
  startCursorDy: number;
  startFrameX: number;
  startFrameY: number;
}

interface ResizeState {
  frameId: string;
  handle: HandleDir;
  startCursorDx: number;
  startCursorDy: number;
  startX: number; // image coords at drag start
  startY: number;
  startW: number;
  startH: number;
}

interface Props {
  mockupUrl: string;
  frames: Frame[];
  tolerance: number;
  lang?: 'tr' | 'en';
  onAddFrame: (frame: Omit<Frame, 'id' | 'color'>) => void;
  onRemoveFrame: (id: string) => void;
  onUpdateFrame: (id: string, changes: Partial<Pick<Frame, 'x' | 'y' | 'w' | 'h'>>) => void;
}

// ── Pure helpers (outside component, no hooks) ────────────────────────────────

const HANDLE_HIT = 10; // display-px hit radius for handle squares
const HANDLE_VIS = 7;  // display-px visual size of handle squares
const MIN_FRAME  = 20; // minimum frame size in image px

function getHandlePositions(frame: Frame, scale: number) {
  const fx = frame.x * scale, fy = frame.y * scale;
  const fw = frame.w * scale, fh = frame.h * scale;
  return [
    { dir: 'tl' as HandleDir, dx: fx,          dy: fy          },
    { dir: 'tc' as HandleDir, dx: fx + fw / 2, dy: fy          },
    { dir: 'tr' as HandleDir, dx: fx + fw,     dy: fy          },
    { dir: 'ml' as HandleDir, dx: fx,          dy: fy + fh / 2 },
    { dir: 'mr' as HandleDir, dx: fx + fw,     dy: fy + fh / 2 },
    { dir: 'bl' as HandleDir, dx: fx,          dy: fy + fh     },
    { dir: 'bc' as HandleDir, dx: fx + fw / 2, dy: fy + fh     },
    { dir: 'br' as HandleDir, dx: fx + fw,     dy: fy + fh     },
  ];
}

/** Hit-test cursor position against handles first, then frame body. */
function hitTest(cx: number, cy: number, frameList: Frame[], scale: number): HitResult | null {
  for (let i = frameList.length - 1; i >= 0; i--) {
    const frame = frameList[i];
    for (const h of getHandlePositions(frame, scale)) {
      if (Math.abs(cx - h.dx) <= HANDLE_HIT && Math.abs(cy - h.dy) <= HANDLE_HIT) {
        return { frameId: frame.id, type: 'handle', handle: h.dir };
      }
    }
    const fx = frame.x * scale, fy = frame.y * scale;
    const fw = frame.w * scale, fh = frame.h * scale;
    if (cx >= fx && cx <= fx + fw && cy >= fy && cy <= fy + fh) {
      return { frameId: frame.id, type: 'body' };
    }
  }
  return null;
}

function cursorForHit(hit: HitResult | null, fallback = 'crosshair'): string {
  if (!hit) return fallback;
  if (hit.type === 'body') return 'grab';
  return cursorForHandle(hit.handle!);
}

function cursorForHandle(dir: HandleDir): string {
  if (dir === 'tl' || dir === 'br') return 'nwse-resize';
  if (dir === 'tr' || dir === 'bl') return 'nesw-resize';
  if (dir === 'tc' || dir === 'bc') return 'ns-resize';
  return 'ew-resize';
}

/** Compute new frame rect after a resize drag. */
function applyResize(
  handle: HandleDir,
  orig: { x: number; y: number; w: number; h: number },
  ddx: number,
  ddy: number,
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = orig;
  const right  = orig.x + orig.w;
  const bottom = orig.y + orig.h;

  const movesLeft   = handle === 'tl' || handle === 'ml' || handle === 'bl';
  const movesRight  = handle === 'tr' || handle === 'mr' || handle === 'br';
  const movesTop    = handle === 'tl' || handle === 'tc' || handle === 'tr';
  const movesBottom = handle === 'bl' || handle === 'bc' || handle === 'br';

  if (movesRight)  { w = Math.max(MIN_FRAME, orig.w + ddx); }
  if (movesLeft)   { w = Math.max(MIN_FRAME, orig.w - ddx); x = right  - w; }
  if (movesBottom) { h = Math.max(MIN_FRAME, orig.h + ddy); }
  if (movesTop)    { h = Math.max(MIN_FRAME, orig.h - ddy); y = bottom - h; }

  return { x, y, w, h };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MockupEditor({
  mockupUrl,
  frames,
  tolerance,
  lang = 'en',
  onAddFrame,
  onRemoveFrame,
  onUpdateFrame,
}: Props) {
  const isTR = lang === 'tr';
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef  = useRef<ImageData | null>(null);
  const imgCacheRef  = useRef<HTMLImageElement | null>(null);

  // Refs mirror state for touch-handler closures (avoid stale captures)
  const dragRef         = useRef<DragState    | null>(null);
  const moveRef         = useRef<MoveState    | null>(null);
  const resizeRef       = useRef<ResizeState  | null>(null);
  const framesRef       = useRef<Frame[]>(frames);
  // Suppresses the auto-flood-fill onClick when a frame interaction just finished
  const suppressClickRef = useRef(false);

  const [imgNatural, setImgNatural]       = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize]     = useState({ w: 0, h: 0 });
  const [isProcessing, setIsProcessing]   = useState(false);
  const [warning, setWarning]             = useState<string | null>(null);
  const [mode, setMode]                   = useState<Mode>('auto');
  const [drag, setDrag]                   = useState<DragState   | null>(null);
  const [moveState, setMoveState]         = useState<MoveState   | null>(null);
  const [resizeState, setResizeState]     = useState<ResizeState | null>(null);
  const [hoverCursor, setHoverCursor]     = useState('crosshair');
  const [hoverFrameId, setHoverFrameId]   = useState<string | null>(null);
  const [isMobile, setIsMobile]           = useState(false);
  const [cornerRadius, setCornerRadius]   = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keep refs in sync with state
  useEffect(() => { dragRef.current    = drag;        }, [drag]);
  useEffect(() => { moveRef.current    = moveState;   }, [moveState]);
  useEffect(() => { resizeRef.current  = resizeState; }, [resizeState]);
  useEffect(() => { framesRef.current  = frames;      }, [frames]);

  const scale = imgNatural.w > 0 ? displaySize.w / imgNatural.w : 1;

  // ── Redraw ───────────────────────────────────────────────────────────────────
  const redraw = useCallback(
    (frameList: Frame[], highlightId?: string | null) => {
      const canvas = canvasRef.current;
      const img    = imgCacheRef.current;
      if (!canvas || !img || !imgNatural.w) return;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displaySize.w, displaySize.h);

      for (const frame of frameList) {
        const fx = frame.x * scale;
        const fy = frame.y * scale;
        const fw = frame.w * scale;
        const fh = frame.h * scale;
        const fr = (frame.cornerRadius ?? cornerRadius) * scale;
        const isHighlighted = frame.id === highlightId;

        const framePath = () => {
          ctx.beginPath();
          if (fr > 0 && ctx.roundRect) ctx.roundRect(fx, fy, fw, fh, fr);
          else ctx.rect(fx, fy, fw, fh);
        };

        // Fill: white base then tinted overlay
        ctx.save();
        framePath(); ctx.clip();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(fx, fy, fw, fh);
        ctx.fillStyle = frame.color; ctx.fillRect(fx, fy, fw, fh);
        ctx.restore();

        // Stroke: white halo + full-opacity border when highlighted
        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth   = 5;
          framePath(); ctx.stroke();
        }
        ctx.strokeStyle = isHighlighted
          ? frame.color.replace('0.50', '1.0')
          : frame.color.replace('0.50', '0.95');
        ctx.lineWidth = isHighlighted ? 2.5 : 2;
        framePath(); ctx.stroke();

        // Label
        ctx.fillStyle = frame.color.replace('0.50', '0.95');
        ctx.font      = `bold 11px var(--font-mono, monospace)`;
        ctx.fillText(`F${frameList.indexOf(frame) + 1} ${frame.w}×${frame.h}`, fx + 6, fy + 16);

        // Resize handles — only on highlighted frame
        if (isHighlighted) {
          for (const h of getHandlePositions(frame, scale)) {
            const hs = HANDLE_VIS;
            ctx.fillStyle   = '#ffffff';
            ctx.fillRect(h.dx - hs / 2, h.dy - hs / 2, hs, hs);
            ctx.strokeStyle = frame.color.replace('0.50', '0.95');
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(h.dx - hs / 2, h.dy - hs / 2, hs, hs);
          }
        }
      }

      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    },
    [imgNatural.w, displaySize.w, displaySize.h, scale, cornerRadius],
  );

  // ── Draw new-rect drag preview on top of snapshot ────────────────────────────
  const drawPreview = useCallback((d: DragState) => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshotRef.current) return;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(snapshotRef.current, 0, 0);

    const x = Math.min(d.startX, d.curX);
    const y = Math.min(d.startY, d.curY);
    const w = Math.abs(d.curX - d.startX);
    const h = Math.abs(d.curY - d.startY);
    if (w < 2 || h < 2) return;

    const r = cornerRadius * scale;
    const path = () => {
      ctx.beginPath();
      if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
    };

    path(); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();

    ctx.save();
    path();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font      = `bold 11px var(--font-mono, monospace)`;
    ctx.fillText(`${Math.round(w / scale)}×${Math.round(h / scale)}`, x + 5, y + 15);
  }, [scale, cornerRadius]);

  // ── Initial image load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mockupUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgCacheRef.current = img;
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const container = containerRef.current;
      if (!container) return;
      const MAX_CANVAS = 2048;
      const maxW = container.clientWidth || 800, maxH = 820;
      const s  = Math.min(maxW / nw, maxH / nh, MAX_CANVAS / nw, MAX_CANVAS / nh, 1);
      const dw = Math.round(nw * s), dh = Math.round(nh * s);
      const canvas = canvasRef.current!;
      canvas.width = dw; canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (ctx && dw > 0 && dh > 0) ctx.drawImage(img, 0, 0, dw, dh);
      setImgNatural({ w: nw, h: nh });
      setDisplaySize({ w: dw, h: dh });
    };
    img.src = mockupUrl;
  }, [mockupUrl]);

  // Redraw on frame/display changes (use last known hoverFrameId for consistency)
  useEffect(() => {
    if (displaySize.w > 0) redraw(frames, hoverFrameId);
    // hoverFrameId intentionally omitted — hover-triggered redraws happen inline
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, displaySize, redraw]);

  // ── Display-coord helper ─────────────────────────────────────────────────────
  const getDisplayCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  };

  // ── Auto mode: flood-fill on click ───────────────────────────────────────────
  const handleAutoClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Suppress if we just finished a frame interaction on this mousedown
      if (suppressClickRef.current) { suppressClickRef.current = false; return; }
      if (isProcessing || !imgNatural.w) return;
      const { dx, dy } = getDisplayCoords(e);
      const imgX = Math.round(dx / scale);
      const imgY = Math.round(dy / scale);
      setIsProcessing(true); setWarning(null);
      try {
        const result = await floodFillImage(mockupUrl, imgX, imgY, tolerance);
        if (!result) { setWarning(isTR ? 'Bölge bulunamadı. Daha açık bir alana tıklayın veya toleransı artırın.' : 'No distinct region found. Try clicking on a lighter area or increase tolerance.'); return; }
        if (result.pixelCount > imgNatural.w * imgNatural.h * 0.65) { setWarning(isTR ? 'Algılanan bölge çok büyük — arka plana tıkladınız olabilir. Daha odaklı bir noktayı deneyin.' : 'Detected region is very large — you may have clicked the background. Try a more targeted spot or lower tolerance.'); return; }
        onAddFrame({ x: result.minX, y: result.minY, w: result.maxX - result.minX, h: result.maxY - result.minY, cornerRadius: cornerRadius > 0 ? cornerRadius : undefined });
      } finally { setIsProcessing(false); }
    },
    [isProcessing, imgNatural.w, scale, mockupUrl, tolerance, onAddFrame, cornerRadius, isTR],
  );

  // Ref so touch handlers can call flood fill without stale closures
  const floodFillFnRef = useRef(handleAutoClick as unknown as ((imgX: number, imgY: number) => void));
  useEffect(() => {
    floodFillFnRef.current = async (imgX: number, imgY: number) => {
      if (isProcessing || !imgNatural.w) return;
      setIsProcessing(true); setWarning(null);
      try {
        const result = await floodFillImage(mockupUrl, imgX, imgY, tolerance);
        if (!result) { setWarning(isTR ? 'Bölge bulunamadı. Daha açık bir alana tıklayın veya toleransı artırın.' : 'No distinct region found. Try clicking on a lighter area or increase tolerance.'); return; }
        if (result.pixelCount > imgNatural.w * imgNatural.h * 0.65) { setWarning(isTR ? 'Algılanan bölge çok büyük — arka plana tıkladınız olabilir. Daha odaklı bir noktayı deneyin.' : 'Detected region is very large — you may have clicked the background. Try a more targeted spot or lower tolerance.'); return; }
        onAddFrame({ x: result.minX, y: result.minY, w: result.maxX - result.minX, h: result.maxY - result.minY, cornerRadius: cornerRadius > 0 ? cornerRadius : undefined });
      } finally { setIsProcessing(false); }
    };
  }, [isProcessing, imgNatural.w, mockupUrl, tolerance, onAddFrame, cornerRadius, isTR]);

  // ── Unified mousedown ────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!imgNatural.w) return;
      e.preventDefault();
      const { dx, dy } = getDisplayCoords(e);
      const hit = hitTest(dx, dy, frames, scale);

      if (hit?.type === 'handle') {
        const frame = frames.find(f => f.id === hit.frameId)!;
        setResizeState({ frameId: hit.frameId, handle: hit.handle!, startCursorDx: dx, startCursorDy: dy, startX: frame.x, startY: frame.y, startW: frame.w, startH: frame.h });
        suppressClickRef.current = true;
        setWarning(null);
        return;
      }

      if (hit?.type === 'body') {
        const frame = frames.find(f => f.id === hit.frameId)!;
        setMoveState({ frameId: hit.frameId, startCursorDx: dx, startCursorDy: dy, startFrameX: frame.x, startFrameY: frame.y });
        suppressClickRef.current = true;
        setWarning(null);
        return;
      }

      if (mode === 'manual') {
        // Clear handles from snapshot before draw drag so preview is clean
        redraw(frames, null);
        setHoverFrameId(null);
        setDrag({ startX: dx, startY: dy, curX: dx, curY: dy });
        setWarning(null);
      }
      // Auto mode: onClick will fire and trigger flood fill
    },
    [imgNatural.w, frames, scale, mode, redraw],
  );

  // ── Unified mousemove ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { dx, dy } = getDisplayCoords(e);

      // Active resize
      if (resizeState) {
        const frame = frames.find(f => f.id === resizeState.frameId);
        if (!frame) return;
        const ddx = Math.round((dx - resizeState.startCursorDx) / scale);
        const ddy = Math.round((dy - resizeState.startCursorDy) / scale);
        let r = applyResize(resizeState.handle, { x: resizeState.startX, y: resizeState.startY, w: resizeState.startW, h: resizeState.startH }, ddx, ddy);
        r.x = Math.max(0, r.x); r.y = Math.max(0, r.y);
        r.w = Math.min(r.w, imgNatural.w - r.x); r.h = Math.min(r.h, imgNatural.h - r.y);
        redraw(frames.map(f => f.id === resizeState.frameId ? { ...f, ...r } : f), resizeState.frameId);
        return;
      }

      // Active move
      if (moveState) {
        const frame = frames.find(f => f.id === moveState.frameId);
        if (!frame) return;
        const newX = Math.max(0, Math.min(imgNatural.w - frame.w, moveState.startFrameX + Math.round((dx - moveState.startCursorDx) / scale)));
        const newY = Math.max(0, Math.min(imgNatural.h - frame.h, moveState.startFrameY + Math.round((dy - moveState.startCursorDy) / scale)));
        redraw(frames.map(f => f.id === moveState.frameId ? { ...f, x: newX, y: newY } : f), moveState.frameId);
        return;
      }

      // Draw drag (manual mode)
      if (drag) {
        const updated = { ...drag, curX: dx, curY: dy };
        setDrag(updated);
        drawPreview(updated);
        return;
      }

      // Hover — update cursor and handle display
      const hit = hitTest(dx, dy, frames, scale);
      const newCursor  = cursorForHit(hit, 'crosshair');
      const newFrameId = hit?.frameId ?? null;
      if (newCursor !== hoverCursor) setHoverCursor(newCursor);
      if (newFrameId !== hoverFrameId) {
        setHoverFrameId(newFrameId);
        redraw(frames, newFrameId); // redraw to show/hide handles
      }
    },
    [resizeState, moveState, drag, frames, scale, imgNatural.w, imgNatural.h, redraw, drawPreview, hoverCursor, hoverFrameId],
  );

  // ── Unified mouseup ──────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { dx, dy } = getDisplayCoords(e);

      // Commit resize
      if (resizeState) {
        const frame = frames.find(f => f.id === resizeState.frameId);
        if (frame) {
          const ddx = Math.round((dx - resizeState.startCursorDx) / scale);
          const ddy = Math.round((dy - resizeState.startCursorDy) / scale);
          let r = applyResize(resizeState.handle, { x: resizeState.startX, y: resizeState.startY, w: resizeState.startW, h: resizeState.startH }, ddx, ddy);
          r.x = Math.max(0, r.x); r.y = Math.max(0, r.y);
          r.w = Math.min(r.w, imgNatural.w - r.x); r.h = Math.min(r.h, imgNatural.h - r.y);
          onUpdateFrame(resizeState.frameId, r);
        }
        setResizeState(null);
        return;
      }

      // Commit move
      if (moveState) {
        const frame = frames.find(f => f.id === moveState.frameId);
        if (frame) {
          const newX = Math.max(0, Math.min(imgNatural.w - frame.w, moveState.startFrameX + Math.round((dx - moveState.startCursorDx) / scale)));
          const newY = Math.max(0, Math.min(imgNatural.h - frame.h, moveState.startFrameY + Math.round((dy - moveState.startCursorDy) / scale)));
          onUpdateFrame(moveState.frameId, { x: newX, y: newY });
        }
        setMoveState(null);
        return;
      }

      // Commit draw
      if (!drag) return;
      const dispX = Math.min(drag.startX, dx), dispY = Math.min(drag.startY, dy);
      const dispW = Math.abs(dx - drag.startX), dispH = Math.abs(dy - drag.startY);
      const imgX = Math.round(dispX / scale), imgY = Math.round(dispY / scale);
      const imgW = Math.round(dispW / scale), imgH = Math.round(dispH / scale);
      setDrag(null);
      if (imgW < 8 || imgH < 8) {
        if (snapshotRef.current) canvasRef.current!.getContext('2d')!.putImageData(snapshotRef.current, 0, 0);
        return;
      }
      onAddFrame({ x: imgX, y: imgY, w: imgW, h: imgH, cornerRadius: cornerRadius > 0 ? cornerRadius : undefined });
    },
    [resizeState, moveState, drag, frames, scale, imgNatural.w, imgNatural.h, onUpdateFrame, onAddFrame, cornerRadius],
  );

  // ── Mouse leave ───────────────────────────────────────────────────────────────
  const handleMouseLeave = useCallback(() => {
    if (resizeState) { setResizeState(null); redraw(frames); return; }
    if (moveState)   { setMoveState(null);   redraw(frames); return; }
    if (drag) {
      setDrag(null);
      if (snapshotRef.current) canvasRef.current!.getContext('2d')!.putImageData(snapshotRef.current, 0, 0);
    }
    setHoverCursor('crosshair');
    if (hoverFrameId) { setHoverFrameId(null); redraw(frames, null); }
  }, [resizeState, moveState, drag, frames, redraw, hoverFrameId]);

  // ── Touch events (both modes) ─────────────────────────────────────────────────
  // Added via useEffect so { passive: false } preventDefault() blocks page scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCoords = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { dx: touch.clientX - rect.left, dy: touch.clientY - rect.top };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!imgNatural.w) return;
      e.preventDefault();
      const { dx, dy } = getCoords(e.touches[0]);
      const hit = hitTest(dx, dy, framesRef.current, scale);

      if (hit?.type === 'handle') {
        const frame = framesRef.current.find(f => f.id === hit.frameId)!;
        const rs: ResizeState = { frameId: hit.frameId, handle: hit.handle!, startCursorDx: dx, startCursorDy: dy, startX: frame.x, startY: frame.y, startW: frame.w, startH: frame.h };
        resizeRef.current = rs; setResizeState(rs);
        setWarning(null);
        return;
      }
      if (hit?.type === 'body') {
        const frame = framesRef.current.find(f => f.id === hit.frameId)!;
        const ms: MoveState = { frameId: hit.frameId, startCursorDx: dx, startCursorDy: dy, startFrameX: frame.x, startFrameY: frame.y };
        moveRef.current = ms; setMoveState(ms);
        setWarning(null);
        return;
      }
      if (mode === 'manual') {
        const nd = { startX: dx, startY: dy, curX: dx, curY: dy };
        dragRef.current = nd; setDrag(nd);
        setWarning(null);
      }
      // Auto mode tap with no frame hit: handled in onTouchEnd
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const { dx, dy } = getCoords(e.touches[0]);

      const rs = resizeRef.current;
      if (rs) {
        const frame = framesRef.current.find(f => f.id === rs.frameId);
        if (!frame) return;
        const ddx = Math.round((dx - rs.startCursorDx) / scale);
        const ddy = Math.round((dy - rs.startCursorDy) / scale);
        let r = applyResize(rs.handle, { x: rs.startX, y: rs.startY, w: rs.startW, h: rs.startH }, ddx, ddy);
        r.x = Math.max(0, r.x); r.y = Math.max(0, r.y);
        r.w = Math.min(r.w, imgNatural.w - r.x); r.h = Math.min(r.h, imgNatural.h - r.y);
        redraw(framesRef.current.map(f => f.id === rs.frameId ? { ...f, ...r } : f), rs.frameId);
        return;
      }

      const mv = moveRef.current;
      if (mv) {
        const frame = framesRef.current.find(f => f.id === mv.frameId);
        if (!frame) return;
        const newX = Math.max(0, Math.min(imgNatural.w - frame.w, mv.startFrameX + Math.round((dx - mv.startCursorDx) / scale)));
        const newY = Math.max(0, Math.min(imgNatural.h - frame.h, mv.startFrameY + Math.round((dy - mv.startCursorDy) / scale)));
        redraw(framesRef.current.map(f => f.id === mv.frameId ? { ...f, x: newX, y: newY } : f), mv.frameId);
        return;
      }

      const d = dragRef.current;
      if (!d) return;
      const updated = { ...d, curX: dx, curY: dy };
      dragRef.current = updated; setDrag(updated);
      drawPreview(updated);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const { dx, dy } = getCoords(e.changedTouches[0]);

      const rs = resizeRef.current;
      if (rs) {
        const frame = framesRef.current.find(f => f.id === rs.frameId);
        if (frame) {
          const ddx = Math.round((dx - rs.startCursorDx) / scale);
          const ddy = Math.round((dy - rs.startCursorDy) / scale);
          let r = applyResize(rs.handle, { x: rs.startX, y: rs.startY, w: rs.startW, h: rs.startH }, ddx, ddy);
          r.x = Math.max(0, r.x); r.y = Math.max(0, r.y);
          r.w = Math.min(r.w, imgNatural.w - r.x); r.h = Math.min(r.h, imgNatural.h - r.y);
          onUpdateFrame(rs.frameId, r);
        }
        resizeRef.current = null; setResizeState(null);
        return;
      }

      const mv = moveRef.current;
      if (mv) {
        const frame = framesRef.current.find(f => f.id === mv.frameId);
        if (frame) {
          const newX = Math.max(0, Math.min(imgNatural.w - frame.w, mv.startFrameX + Math.round((dx - mv.startCursorDx) / scale)));
          const newY = Math.max(0, Math.min(imgNatural.h - frame.h, mv.startFrameY + Math.round((dy - mv.startCursorDy) / scale)));
          onUpdateFrame(mv.frameId, { x: newX, y: newY });
        }
        moveRef.current = null; setMoveState(null);
        return;
      }

      const d = dragRef.current;
      if (d) {
        // Draw commit
        const dispX = Math.min(d.startX, dx), dispY = Math.min(d.startY, dy);
        const dispW = Math.abs(dx - d.startX), dispH = Math.abs(dy - d.startY);
        const imgX = Math.round(dispX / scale), imgY = Math.round(dispY / scale);
        const imgW = Math.round(dispW / scale), imgH = Math.round(dispH / scale);
        dragRef.current = null; setDrag(null);
        if (imgW < 8 || imgH < 8) {
          if (snapshotRef.current) canvas.getContext('2d')!.putImageData(snapshotRef.current, 0, 0);
          return;
        }
        onAddFrame({ x: imgX, y: imgY, w: imgW, h: imgH, cornerRadius: cornerRadius > 0 ? cornerRadius : undefined });
        return;
      }

      // Auto mode tap on empty canvas → flood fill
      if (mode === 'auto') {
        const imgX = Math.round(dx / scale);
        const imgY = Math.round(dy / scale);
        floodFillFnRef.current(imgX, imgY);
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, [mode, imgNatural.w, imgNatural.h, scale, redraw, drawPreview, onAddFrame, onUpdateFrame, cornerRadius]);

  // ── Cursor ────────────────────────────────────────────────────────────────────
  const cursor = isProcessing
    ? 'wait'
    : resizeState
      ? cursorForHandle(resizeState.handle)
      : moveState
        ? 'grabbing'
        : hoverCursor;

  // ── Status text ───────────────────────────────────────────────────────────────
  // Active-operation text (shown in accent color while something is happening)
  const activeText = resizeState
    ? (isTR ? 'Yeniden boyutlandırılıyor — bırakın' : 'Resizing — release to confirm')
    : moveState
      ? (isTR ? 'Taşınıyor — bırakın' : 'Moving — release to place')
      : drag
        ? `${Math.round(Math.abs(drag.curX - drag.startX) / scale)}×${Math.round(Math.abs(drag.curY - drag.startY) / scale)}px — ${isTR ? 'bırakın' : 'release to pin'}`
        : null;

  // Static hint — one fixed string per mode, never changes on hover
  const idleHint = mode === 'auto'
    ? (isTR ? 'Tıkla çerçeve ekle • Sürükle taşı • Kenar/köşe sürükle' : 'Click to add frame • Drag frame to move • Drag edge/corner to resize')
    : (isTR ? 'Sürükle çerçeve çiz • Sürükle taşı • Kenar/köşe sürükle' : 'Drag to draw frame • Drag frame to move • Drag edge/corner to resize');

  return (
    <div className="flex flex-col gap-4">

      {/* ── Mode toggle + status row ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          className="flex items-center rounded-sm p-0.5 gap-0.5"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
        >
          {(['auto', 'manual'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setWarning(null); setDrag(null); setMoveState(null); setResizeState(null); setHoverCursor('crosshair'); setHoverFrameId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
              style={{
                background: mode === m ? 'var(--surface-2)' : 'transparent',
                color:      mode === m ? 'var(--text)'      : 'var(--text-2)',
                border:     mode === m ? '1px solid var(--border-2)' : '1px solid transparent',
              }}
            >
              {m === 'auto' ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="5.5" y1="2" x2="5.5" y2="9" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="2" y1="5.5" x2="9" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {isTR ? 'Otomatik (alan doldurma)' : 'Auto (flood fill)'}
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <rect x="1.5" y="1.5" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 1.5" />
                  </svg>
                  {isTR ? 'Manuel (dikdörtgen çiz)' : 'Manual (draw rect)'}
                </>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
          {isProcessing ? (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              {isTR ? 'Algılanıyor…' : 'Detecting…'}
            </span>
          ) : activeText ? (
            <span style={{ color: 'var(--accent)' }}>{activeText}</span>
          ) : (
            <span>{idleHint}</span>
          )}
          {imgNatural.w > 0 && !activeText && !isProcessing && (
            <span style={{ color: 'var(--text-3)' }}>{imgNatural.w}×{imgNatural.h}px</span>
          )}
        </div>
      </div>

      {/* ── Corner Radius slider ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-2)', minWidth: 156 }}>
          {isTR ? 'Köşe Yuvarlaklığı' : 'Corner Radius'}: {cornerRadius}px
        </label>
        <input
          type="range" min={0} max={50} step={1} value={cornerRadius}
          onChange={(e) => setCornerRadius(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--accent)' } as React.CSSProperties}
        />
      </div>

      {/* ── Warning ───────────────────────────────────────────────────────── */}
      {warning && (
        <div className="text-xs px-3 py-2 rounded-sm border" style={{ background: 'rgba(184,64,64,0.08)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {warning}
        </div>
      )}

      {/* ── Canvas (full width) ───────────────────────────────────────────── */}
      <div ref={containerRef}>
        <canvas
          ref={canvasRef}
          onClick={mode === 'auto' ? handleAutoClick : undefined}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="rounded-sm block select-none"
          style={{
            cursor,
            width:      displaySize.w || '100%',
            height:     displaySize.h || 'auto',
            border:     `1px solid ${mode === 'manual' ? 'var(--border-2)' : 'var(--border)'}`,
            userSelect: 'none',
          }}
        />
      </div>

      {/* ── Frame list — horizontal strip below canvas (all screen sizes) ── */}
      {frames.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: 'var(--text-2)' }}>
            {isTR ? 'Çerçeveler' : 'Frames'} ({frames.length})
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
            {frames.map((frame, i) => (
              <div
                key={frame.id}
                className="flex-shrink-0 flex items-center gap-2 px-2.5 py-2 rounded-sm"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderLeftColor: frame.color.replace('0.50', '0.9'),
                  borderLeftWidth: '3px',
                  minWidth: 110,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono" style={{ color: 'var(--text)' }}>{isTR ? 'Ç' : 'F'}{i + 1}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-2)' }}>{frame.w}×{frame.h}</p>
                </div>
                <button onClick={() => onRemoveFrame(frame.id)} className="w-5 h-5 flex items-center justify-center rounded-sm" style={{ flexShrink: 0 }} title="Remove frame">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {frames.length === 0 && !isProcessing && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-3)' }}>
          {mode === 'auto'
            ? (isTR ? 'Henüz çerçeve yok — mockuptaki açık/beyaz alanlara tıklayın' : 'No frames pinned yet — click on the white/light areas in the mockup above')
            : (isTR ? 'Henüz çerçeve yok — çizmek için sürükleyin' : 'No frames pinned yet — click and drag on the mockup to draw a frame')}
        </p>
      )}
    </div>
  );
}
