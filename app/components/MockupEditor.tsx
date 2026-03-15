'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Frame } from '@/app/utils/types';
import { floodFillImage } from '@/app/utils/floodFill';

const FRAME_COLORS = [
  'rgba(219,168,66,0.50)',
  'rgba(66,168,219,0.50)',
  'rgba(168,219,66,0.50)',
  'rgba(219,66,168,0.50)',
  'rgba(66,219,168,0.50)',
  'rgba(168,66,219,0.50)',
];

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
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredFrame, setHoveredFrame] = useState<string | null>(null);
  const [flashFrame, setFlashFrame] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const scale = imgNatural.w > 0 ? displaySize.w / imgNatural.w : 1;

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

          // Fill
          ctx.fillStyle = frame.color;
          ctx.fillRect(fx, fy, fw, fh);

          // Border
          ctx.strokeStyle = frame.color.replace('0.50', '0.95');
          ctx.lineWidth = 2;
          ctx.strokeRect(fx, fy, fw, fh);

          // Label
          ctx.fillStyle = frame.color.replace('0.50', '0.95');
          ctx.font = `bold 11px var(--font-mono, monospace)`;
          ctx.fillText(
            `F${frameList.indexOf(frame) + 1} ${frame.w}×${frame.h}`,
            fx + 6,
            fy + 16
          );
        }
      };
      img.src = mockupUrl;
    },
    [mockupUrl, imgNatural.w, displaySize.w, displaySize.h, scale]
  );

  // Initial load — compute display size
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

  // Redraw whenever frames or display size changes
  useEffect(() => {
    if (displaySize.w > 0) redraw(frames);
  }, [frames, displaySize, redraw]);

  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isProcessing || !imgNatural.w) return;

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - rect.left;
      const dy = e.clientY - rect.top;

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

        const newFrame = {
          x: result.minX,
          y: result.minY,
          w: result.maxX - result.minX,
          h: result.maxY - result.minY,
        };
        onAddFrame(newFrame);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, imgNatural.w, scale, mockupUrl, tolerance, onAddFrame]
  );

  useEffect(() => {
    if (flashFrame) {
      const t = setTimeout(() => setFlashFrame(null), 600);
      return () => clearTimeout(t);
    }
  }, [flashFrame]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--text-2)' }}>
        <span
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
          style={{ background: 'var(--surface-3)' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="5" y1="2" x2="5" y2="8" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="2" y1="5" x2="8" y2="5" stroke="var(--accent)" strokeWidth="1.5" />
          </svg>
          Click white/light frame areas to pin
        </span>
        {isProcessing && (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
            <span
              className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
            Detecting…
          </span>
        )}
        {!isProcessing && imgNatural.w > 0 && (
          <span style={{ color: 'var(--text-3)' }}>
            {imgNatural.w}×{imgNatural.h}px
          </span>
        )}
      </div>

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

      <div className="flex gap-4">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 min-w-0">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="rounded-sm block"
            style={{
              cursor: isProcessing ? 'wait' : 'crosshair',
              width: displaySize.w || '100%',
              height: displaySize.h || 'auto',
              border: '1px solid var(--border)',
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
          No frames pinned yet — click on the white/light areas in the mockup above
        </p>
      )}
    </div>
  );
}
