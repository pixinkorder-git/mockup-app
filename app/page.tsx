'use client';

import { useState, useCallback, useId } from 'react';
import DropZone from '@/app/components/DropZone';
import MockupEditor from '@/app/components/MockupEditor';
import ResultsGrid from '@/app/components/ResultsGrid';
import { ArtImage, MockupTemplate, Frame, GeneratedResult } from '@/app/utils/types';
import { generateAllResults } from '@/app/utils/compositor';

const FRAME_COLORS = [
  'rgba(219,168,66,0.50)',
  'rgba(66,168,219,0.50)',
  'rgba(168,219,66,0.50)',
  'rgba(219,66,168,0.50)',
  'rgba(66,219,168,0.50)',
  'rgba(168,66,219,0.50)',
];

const MAX_ART = 10;
const MAX_MOCKUPS = 10;
const MAX_RESULTS = 40;

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Section wrapper with corner-bracket header ───────────────────────────────
function Section({
  title,
  badge,
  children,
  className = '',
}: {
  title: string;
  badge?: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-sm animate-fade-up ${className}`}
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex flex-col gap-0.5">
          <div className="w-5 h-px" style={{ background: 'var(--accent)' }} />
          <div className="w-2.5 h-px" style={{ background: 'var(--border-2)' }} />
        </div>
        <h2
          className="font-display tracking-widest text-base"
          style={{ color: 'var(--text)', letterSpacing: '0.12em' }}
        >
          {title}
        </h2>
        {badge !== undefined && (
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
            style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-4" style={{ background: 'var(--surface)' }}>
        {children}
      </div>
    </section>
  );
}

// ─── Thumbnail strip ───────────────────────────────────────────────────────────
function AssetThumb({
  url,
  name,
  onRemove,
  isActive,
  onClick,
  badge,
}: {
  url: string;
  name: string;
  onRemove: () => void;
  isActive?: boolean;
  onClick?: () => void;
  badge?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="relative group flex-shrink-0 rounded-sm overflow-hidden transition-all duration-150"
      style={{
        width: 72,
        height: 72,
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-2)'}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive ? '0 0 0 2px var(--accent-glow)' : 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className="w-full h-full object-cover" />

      {/* Overlay on hover */}
      <div
        className="absolute inset-0 flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-5 h-5 flex items-center justify-center rounded-sm"
          style={{ background: 'var(--danger)' }}
          title="Remove"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <line x1="1" y1="1" x2="7" y2="7" />
            <line x1="7" y1="1" x2="1" y2="7" />
          </svg>
        </button>
      </div>

      {/* Name tooltip on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[8px] font-mono truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.75)', color: 'var(--text)' }}
      >
        {name}
      </div>

      {/* Badge */}
      {badge && (
        <div
          className="absolute top-1 left-1 px-1 py-0.5 text-[8px] font-mono rounded-sm"
          style={{ background: 'var(--accent)', color: '#080808' }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [artImages, setArtImages] = useState<ArtImage[]>([]);
  const [mockups, setMockups] = useState<MockupTemplate[]>([]);
  const [activeMockupId, setActiveMockupId] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [tolerance, setTolerance] = useState(45);

  const activeMockup = mockups.find((m) => m.id === activeMockupId) ?? null;

  // ── Art upload ───────────────────────────────────────────────────────────────
  const handleArtUpload = useCallback((files: File[]) => {
    setArtImages((prev) => {
      const slots = MAX_ART - prev.length;
      if (slots <= 0) return prev;
      const newArts: ArtImage[] = files.slice(0, slots).map((f) => ({
        id: genId(),
        name: f.name.replace(/\.[^.]+$/, ''),
        url: URL.createObjectURL(f),
      }));
      return [...prev, ...newArts];
    });
  }, []);

  const removeArt = useCallback((id: string) => {
    setArtImages((prev) => {
      const art = prev.find((a) => a.id === id);
      if (art) URL.revokeObjectURL(art.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // ── Mockup upload ────────────────────────────────────────────────────────────
  const handleMockupUpload = useCallback((files: File[]) => {
    setMockups((prev) => {
      const slots = MAX_MOCKUPS - prev.length;
      if (slots <= 0) return prev;
      const newMockups: MockupTemplate[] = files.slice(0, slots).map((f) => ({
        id: genId(),
        name: f.name.replace(/\.[^.]+$/, ''),
        url: URL.createObjectURL(f),
        frames: [],
      }));
      // Auto-select first uploaded mockup
      setActiveMockupId((cur) => cur ?? newMockups[0]?.id ?? null);
      return [...prev, ...newMockups];
    });
  }, []);

  const removeMockup = useCallback(
    (id: string) => {
      setMockups((prev) => {
        const m = prev.find((x) => x.id === id);
        if (m) URL.revokeObjectURL(m.url);
        return prev.filter((x) => x.id !== id);
      });
      if (activeMockupId === id) {
        setActiveMockupId((prev) => {
          const remaining = mockups.filter((m) => m.id !== id);
          return remaining[0]?.id ?? null;
        });
      }
    },
    [activeMockupId, mockups]
  );

  // ── Frame management ─────────────────────────────────────────────────────────
  const handleAddFrame = useCallback(
    (frameData: Omit<Frame, 'id' | 'color'>) => {
      if (!activeMockupId) return;
      setMockups((prev) =>
        prev.map((m) => {
          if (m.id !== activeMockupId) return m;
          const colorIndex = m.frames.length % FRAME_COLORS.length;
          const newFrame: Frame = {
            ...frameData,
            id: genId(),
            color: FRAME_COLORS[colorIndex],
          };
          return { ...m, frames: [...m.frames, newFrame] };
        })
      );
    },
    [activeMockupId]
  );

  const handleRemoveFrame = useCallback(
    (frameId: string) => {
      if (!activeMockupId) return;
      setMockups((prev) =>
        prev.map((m) => {
          if (m.id !== activeMockupId) return m;
          return { ...m, frames: m.frames.filter((f) => f.id !== frameId) };
        })
      );
    },
    [activeMockupId]
  );

  const clearAllFrames = useCallback(() => {
    if (!activeMockupId) return;
    setMockups((prev) =>
      prev.map((m) => (m.id === activeMockupId ? { ...m, frames: [] } : m))
    );
  }, [activeMockupId]);

  // ── Generate ─────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    const validMockups = mockups.filter((m) => m.frames.length > 0);
    if (validMockups.length === 0 || artImages.length === 0) return;

    setIsGenerating(true);
    setResults([]);
    setProgress({ done: 0, total: 0 });

    try {
      const generated = await generateAllResults(validMockups, artImages, (done, total) => {
        setProgress({ done, total });
      });
      setResults(generated);
    } finally {
      setIsGenerating(false);
    }
  }, [mockups, artImages]);

  const totalExpectedResults = mockups.reduce((acc, m) => {
    if (m.frames.length === 0) return acc;
    return acc + (m.frames.length === 1 ? artImages.length : 1);
  }, 0);

  const tooManyCombinations = totalExpectedResults > MAX_RESULTS;

  const canGenerate =
    artImages.length > 0 &&
    mockups.some((m) => m.frames.length > 0) &&
    !isGenerating &&
    !tooManyCombinations;

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: 'rgba(8,8,8,0.90)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div
            className="w-7 h-7 rounded-sm flex items-center justify-center"
            style={{ background: 'var(--accent)', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="0.5" fill="#080808" />
              <rect x="7.5" y="1" width="5.5" height="5.5" rx="0.5" fill="#080808" opacity="0.6" />
              <rect x="1" y="7.5" width="5.5" height="5.5" rx="0.5" fill="#080808" opacity="0.6" />
              <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="0.5" fill="#080808" opacity="0.4" />
            </svg>
          </div>
          <span
            className="font-display tracking-[0.18em] text-lg"
            style={{ color: 'var(--text)' }}
          >
            MOCKUP·STUDIO
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <Stat label="ART" value={artImages.length} />
          <div className="w-px h-4" style={{ background: 'var(--border-2)' }} />
          <Stat label="TEMPLATES" value={mockups.length} />
          {totalExpectedResults > 0 && (
            <>
              <div className="w-px h-4" style={{ background: 'var(--border-2)' }} />
              <Stat label="RESULTS" value={totalExpectedResults} accent />
            </>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* ── Upload Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Art Images */}
          <Section title="ART IMAGES" badge={artImages.length || undefined}>
            <DropZone
              onFiles={handleArtUpload}
              label="Drop artwork here"
              sublabel="PNG, JPG, WEBP · Multiple files supported"
              multiple
              disabled={artImages.length >= MAX_ART}
            />
            <p className="font-mono text-[10px] mt-2" style={{ color: artImages.length >= MAX_ART ? 'var(--danger)' : 'var(--text-3)' }}>
              Max {MAX_ART} · {artImages.length} uploaded
            </p>
            {artImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {artImages.map((art) => (
                  <AssetThumb
                    key={art.id}
                    url={art.url}
                    name={art.name}
                    onRemove={() => removeArt(art.id)}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Mockup Templates */}
          <Section title="MOCKUP TEMPLATES" badge={mockups.length || undefined}>
            <DropZone
              onFiles={handleMockupUpload}
              label="Drop mockup templates here"
              sublabel="Use templates with white/light frame areas"
              multiple
              disabled={mockups.length >= MAX_MOCKUPS}
            />
            <p className="font-mono text-[10px] mt-2" style={{ color: mockups.length >= MAX_MOCKUPS ? 'var(--danger)' : 'var(--text-3)' }}>
              Max {MAX_MOCKUPS} · {mockups.length} uploaded
            </p>
            {mockups.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {mockups.map((m) => (
                  <AssetThumb
                    key={m.id}
                    url={m.url}
                    name={m.name}
                    onRemove={() => removeMockup(m.id)}
                    isActive={m.id === activeMockupId}
                    onClick={() => setActiveMockupId(m.id)}
                    badge={m.frames.length > 0 ? `${m.frames.length}f` : undefined}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Frame Editor ────────────────────────────────────────────────────── */}
        {mockups.length > 0 && (
          <Section title="FRAME EDITOR">
            {/* Mockup selector tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {mockups.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMockupId(m.id)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all"
                  style={{
                    background:
                      m.id === activeMockupId ? 'var(--surface-3)' : 'transparent',
                    border: `1px solid ${m.id === activeMockupId ? 'var(--border-2)' : 'transparent'}`,
                    color:
                      m.id === activeMockupId ? 'var(--text)' : 'var(--text-2)',
                  }}
                >
                  {m.name}
                  {m.frames.length > 0 && (
                    <span
                      className="font-mono text-[10px] px-1 py-0.5 rounded-sm"
                      style={{ background: 'var(--accent)', color: '#080808' }}
                    >
                      {m.frames.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tolerance control */}
            <div className="flex items-center gap-3 mb-4">
              <label
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-2)', minWidth: 80 }}
              >
                Tolerance
              </label>
              <input
                type="range"
                min={10}
                max={120}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: 'var(--accent)', background: 'var(--surface-3)' }}
              />
              <span
                className="font-mono text-xs w-8 text-right"
                style={{ color: 'var(--accent)' }}
              >
                {tolerance}
              </span>
            </div>

            {activeMockup ? (
              <>
                <MockupEditor
                  key={activeMockup.id}
                  mockupUrl={activeMockup.url}
                  frames={activeMockup.frames}
                  tolerance={tolerance}
                  onAddFrame={handleAddFrame}
                  onRemoveFrame={handleRemoveFrame}
                />
                {activeMockup.frames.length > 0 && (
                  <button
                    onClick={clearAllFrames}
                    className="mt-3 text-xs transition-colors"
                    style={{ color: 'var(--text-3)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = 'var(--danger)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = 'var(--text-3)')
                    }
                  >
                    Clear all frames
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-2)' }}>
                Select a template above to start pinning frames
              </p>
            )}
          </Section>
        )}

        {/* ── Generate ────────────────────────────────────────────────────────── */}
        {(artImages.length > 0 || mockups.length > 0) && (
          <section
            className="rounded-sm flex items-center justify-between gap-4 px-5 py-4 animate-fade-up"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 font-mono text-sm">
                <CountChip value={artImages.length} label="art" />
                <span style={{ color: 'var(--text-3)' }}>×</span>
                <CountChip
                  value={mockups.filter((m) => m.frames.length > 0).length}
                  label="templates"
                />
                <span style={{ color: 'var(--text-3)' }}>=</span>
                <CountChip value={totalExpectedResults} label="results" accent />
              </div>
              {isGenerating && progress.total > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="flex-1 h-1 rounded-full overflow-hidden"
                    style={{ background: 'var(--surface-3)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(progress.done / progress.total) * 100}%`,
                        background: 'var(--accent)',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--text-2)' }}>
                    {progress.done}/{progress.total}
                  </span>
                </div>
              )}
              {tooManyCombinations && (
                <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--danger)' }}>
                  Too many combinations — reduce art images or templates to stay under {MAX_RESULTS} results.
                </p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-sm font-display tracking-widest text-sm transition-all active:scale-95"
              style={{
                background: canGenerate ? 'var(--accent)' : 'var(--surface-3)',
                color: canGenerate ? '#080808' : 'var(--text-3)',
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                letterSpacing: '0.12em',
              }}
            >
              {isGenerating ? (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: '#080808', borderTopColor: 'transparent' }}
                  />
                  GENERATING
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  GENERATE ALL
                </>
              )}
            </button>
          </section>
        )}

        {/* Validation hints */}
        {artImages.length > 0 && mockups.length > 0 && !mockups.some((m) => m.frames.length > 0) && (
          <p
            className="text-xs text-center font-mono animate-fade-up"
            style={{ color: 'var(--text-2)' }}
          >
            ↑ Pin at least one frame on a template to enable generation
          </p>
        )}

        {/* ── Results ───────────────────────────────────────────────────────────── */}
        <ResultsGrid results={results} />

        {/* Footer */}
        <footer className="text-center py-6">
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            All processing is client-side · No uploads · No backend
          </p>
        </footer>
      </main>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="font-mono text-xs uppercase tracking-wider"
        style={{ color: 'var(--text-3)', fontSize: '9px' }}
      >
        {label}
      </span>
      <span
        className="font-mono text-sm font-medium"
        style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}
      >
        {value}
      </span>
    </div>
  );
}

function CountChip({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span
        className="font-mono text-base font-medium"
        style={{ color: accent ? 'var(--accent)' : 'var(--text)' }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-2)' }}>
        {label}
      </span>
    </span>
  );
}
