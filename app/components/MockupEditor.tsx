'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Frame } from '@/app/utils/types';
import { floodFillImage } from '@/app/utils/floodFill';

type Mode = 'auto' | 'manual';

interface DragState {
  startX: number; // display coords
  startY: number;
  curX: number;
  curY: number;
}

interface Props {
  mockupUrl: string;
  frames: Frame[];
  tolerance: number;
  onAddFrame: (frame: Omit<Frame, 'id' | 'color'>) => void;
  onRemoveFrame: (id: string) => void;
}

export default function MockupEditor({
  mockupUrl,
  frames,
  tolerance,
  onAddFrame,
  onRemoveFrame,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredFrame, setHoveredFrame] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [drag, setDrag] = useState<DragState | null>(null);

  const scale = imgNatural.w > 0 ? displaySize.w / imgNatural.w : 1;

  // ── Redraw base canvas (mockup + committed frames) ──────────────────────────
  const redraw = useCallback(
    (frameList: Frame[]) => {
      const canvas = canvasRef.current;
      if (!canvas || !imgNatural.w) return;
      const ctx = canvas.getContext('2d')!;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, displaySize.w, displaySize.h);

        for (const frame of frameList) {
          const fx = frame.x * scale;
          const fy = frame.y * scale;
          const fw = frame.w * scale;
          const fh = frame.h * scale;

          ctx.fillStyle = frame.color;
          ctx.fillRect(fx, fy, fw, fh);

          ctx.strokeStyle = frame.color.replace('0.50', '0.95');
          ctx.lineWidth = 2;
          ctx.strokeRect(fx, fy, fw, fh);

          ctx.fillStyle = frame.color.replace('0.50', '0.95');
          ctx.font = `bold 11px var(--font-mono, monospace)`;
          ctx.fillText(
            `F${frameList.indexOf(frame) + 1} ${frame.w}×${frame.h}`,
            fx + 6,
            fy + 16
          );
        }

        // Save snapshot for drag-preview restoration
        snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      img.src = mockupUrl;
    },
    [mockupUrl, imgNatural.w, displaySize.w, displaySize.h, scale]
  );

  // ── Draw live drag-preview rect on top of snapshot ─────────────────────────
  const drawPreview = useCallback((d: DragState) => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshotRef.current) return;
    const ctx = canvas.getContext('2d')!;

    // Restore clean base
    ctx.putImageData(snapshotRef.current, 0, 0);

    const x = Math.min(d.startX, d.curX);
    const y = Math.min(d.startY, d.curY);
    const w = Math.abs(d.curX - d.startX);
    const h = Math.abs(d.curY - d.startY);

    if (w < 2 || h < 2) return;

    // Tinted fill
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x, y, w, h);

    // Dashed border
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();

    // Size label
    const imgW = Math.round(w / scale);
    const imgH = Math.round(h / scale);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold 11px var(--font-mono, monospace)`;
    ctx.fillText(`${imgW}×${imgH}`, x + 5, y + 15);
  }, [scale]);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mockupUrl) return;
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setImgNatural({ w: nw, h: nh });

      const container = containerRef.current;
      if (!container) return;
      const maxW = container.clientWidth;
      const maxH = 560;
      const s = Math.min(maxW / nw, maxH / nh, 1);
      const dw = Math.round(nw * s);
      const dh = Math.round(nh * s);
      setDisplaySize({ w: dw, h: dh });

      const canvas = canvasRef.current!;
      canvas.width = dw;
      canvas.height = dh;
    };
    img.src = mockupUrl;
  }, [mockupUrl]);

  // Redraw whenever frames or display size change
  useEffect(() => {
    if (displaySize.w > 0) redraw(frames);
  }, [frames, displaySize, redraw]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getDisplayCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  };

  // ── Auto mode: click → flood fill ───────────────────────────────────────────
  const handleAutoClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isProcessing || !imgNatural.w) return;
      const { dx, dy } = getDisplayCoords(e);
      const imgX = Math.round(dx / scale);
      const imgY = Math.round(dy / scale);

      setIsProcessing(true);
      setWarning(null);
      try {
        const result = await floodFillImage(mockupUrl, imgX, imgY, tolerance);
        if (!result) {
          setWarning('No distinct region found. Try clicking on a lighter area or increase tolerance.');
          return;
        }
        const totalPixels = imgNatural.w * imgNatural.h;
        if (result.pixelCount > totalPixels * 0.65) {
          setWarning(
            'Detected region is very large — you may have clicked the background. Try a more targeted spot or lower tolerance.'
          );
          return;
        }
        onAddFrame({
          x: result.minX,
          y: result.minY,
          w: result.maxX - result.minX,
          h: result.maxY - result.minY,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, imgNatural.w, scale, mockupUrl, tolerance, onAddFrame]
  );

  // ── Manual mode: drag → rectangle ───────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'manual' || !imgNatural.w) return;
      e.preventDefault();
      const { dx, dy } = getDisplayCoords(e);
      setDrag({ startX: dx, startY: dy, curX: dx, curY: dy });
      setWarning(null);
    },
    [mode, imgNatural.w]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'manual' || !drag) return;
      const { dx, dy } = getDisplayCoords(e);
      const updated = { ...drag, curX: dx, curY: dy };
      setDrag(updated);
      drawPreview(updated);
    },
    [mode, drag, drawPreview]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== 'manual' || !drag) return;
      const { dx, dy } = getDisplayCoords(e);

      const dispX = Math.min(drag.startX, dx);
      const dispY = Math.min(drag.startY, dy);
      const dispW = Math.abs(dx - drag.startX);
      const dispH = Math.abs(dy - drag.startY);

      // Convert to image coords
      const imgX = Math.round(dispX / scale);
      const imgY = Math.round(dispY / scale);
      const imgW = Math.round(dispW / scale);
      const imgH = Math.round(dispH / scale);

      setDrag(null);

      if (imgW < 8 || imgH < 8) {
        // Restore clean canvas if the drag was too small
        if (snapshotRef.current) {
          canvasRef.current!.getContext('2d')!.putImageData(snapshotRef.current, 0, 0);
        }
        return;
      }

      onAddFrame({ x: imgX, y: imgY, w: imgW, h: imgH });
    },
    [mode, drag, scale, onAddFrame]
  );

  const handleMouseLeave = useCallback(() => {
    if (mode !== 'manual' || !drag) return;
    // Cancel drag, restore clean canvas
    setDrag(null);
    if (snapshotRef.current) {
      canvasRef.current!.getContext('2d')!.putImageData(snapshotRef.current, 0, 0);
    }
  }, [mode, drag]);

  // Cursor logic
  const cursor = isProcessing ? 'wait' : drag ? 'crosshair' : 'crosshair';

  return (
    <div className="flex flex-col gap-4">

      {/* ── Mode toggle + status row ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Segmented toggle */}
        <div
          className="flex items-center rounded-sm p-0.5 gap-0.5"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
        >
          {(['auto', 'manual'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setWarning(null); setDrag(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
              style={{
                background: mode === m ? 'var(--surface-2)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-2)',
                border: mode === m ? '1px solid var(--border-2)' : '1px solid transparent',
              }}
            >
              {m === 'auto' ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="5.5" y1="2" x2="5.5" y2="9" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="2" y1="5.5" x2="9" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  Auto (flood fill)
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <rect x="1.5" y="1.5" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 1.5" />
                  </svg>
                  Manual (draw rect)
                </>
              )}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
          {mode === 'auto' && !isProcessing && (
            <span>Click white/light areas to detect frame</span>
          )}
          {mode === 'manual' && !drag && (
            <span>Click and drag to draw a frame rectangle</span>
          )}
          {mode === 'manual' && drag && (
            <span style={{ color: 'var(--accent)' }}>
              {Math.round(Math.abs(drag.curX - drag.startX) / scale)}×
              {Math.round(Math.abs(drag.curY - drag.startY) / scale)}px — release to pin
            </span>
          )}
          {isProcessing && (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <span
                className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
              Detecting…
            </span>
          )}
          {imgNatural.w > 0 && !drag && !isProcessing && (
            <span style={{ color: 'var(--text-3)' }}>
              {imgNatural.w}×{imgNatural.h}px
            </span>
          )}
        </div>
      </div>

      {/* ── Warning ───────────────────────────────────────────────────────── */}
      {warning && (
        <div
          className="text-xs px-3 py-2 rounded-sm border"
          style={{
            background: 'rgba(184,64,64,0.08)',
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
          }}
        >
          {warning}
        </div>
      )}

      {/* ── Canvas + frame list ───────────────────────────────────────────── */}
      <div className="flex gap-4">
        <div ref={containerRef} className="flex-1 min-w-0">
          <canvas
            ref={canvasRef}
            onClick={mode === 'auto' ? handleAutoClick : undefined}
            onMouseDown={mode === 'manual' ? handleMouseDown : undefined}
            onMouseMove={mode === 'manual' ? handleMouseMove : undefined}
            onMouseUp={mode === 'manual' ? handleMouseUp : undefined}
            onMouseLeave={mode === 'manual' ? handleMouseLeave : undefined}
            className="rounded-sm block select-none"
            style={{
              cursor,
              width: displaySize.w || '100%',
              height: displaySize.h || 'auto',
              border: `1px solid ${mode === 'manual' ? 'var(--border-2)' : 'var(--border)'}`,
              userSelect: 'none',
            }}
          />
        </div>

        {/* Frame list */}
        {frames.length > 0 && (
          <div className="w-48 flex-shrink-0 flex flex-col gap-2">
            <p
              className="text-xs uppercase tracking-widest font-mono"
              style={{ color: 'var(--text-2)' }}
            >
              Frames ({frames.length})
            </p>
            {frames.map((frame, i) => (
              <div
                key={frame.id}
                onMouseEnter={() => setHoveredFrame(frame.id)}
                onMouseLeave={() => setHoveredFrame(null)}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-sm transition-colors"
                style={{
                  background: hoveredFrame === frame.id ? 'var(--surface-3)' : 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderLeftColor: frame.color.replace('0.50', '0.9'),
                  borderLeftWidth: '3px',
                }}
              >
                <div>
                  <p className="text-xs font-mono" style={{ color: 'var(--text)' }}>
                    Frame {i + 1}
                  </p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-2)' }}>
                    {frame.w}×{frame.h}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveFrame(frame.id)}
                  className="w-5 h-5 flex items-center justify-center rounded-sm transition-colors hover:bg-[rgba(184,64,64,0.2)]"
                  title="Remove frame"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="var(--text-2)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <line x1="2" y1="2" x2="8" y2="8" />
                    <line x1="8" y1="2" x2="2" y2="8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {frames.length === 0 && !isProcessing && (
        <p className="text-xs text-center py-2" style={{ color: 'var(--text-3)' }}>
          {mode === 'auto'
            ? 'No frames pinned yet — click on the white/light areas in the mockup above'
            : 'No frames pinned yet — click and drag on the mockup to draw a frame'}
        </p>
      )}
    </div>
  );
}
