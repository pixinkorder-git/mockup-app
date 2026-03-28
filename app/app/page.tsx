'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import DropZone from '@/app/components/DropZone';
import MockupEditor from '@/app/components/MockupEditor';
import ResultsGrid from '@/app/components/ResultsGrid';
import { ArtImage, MockupTemplate, Frame, GeneratedResult } from '@/app/utils/types';
import { computeCombinations, orderCombinations, generateBatch } from '@/app/utils/compositor';

const BATCH_SIZE = 36;
const MAX_ART = 6;
const MAX_MOCKUPS = 6;

const FRAME_COLORS = [
  'rgba(219,168,66,0.50)',
  'rgba(66,168,219,0.50)',
  'rgba(168,219,66,0.50)',
  'rgba(219,66,168,0.50)',
  'rgba(66,219,168,0.50)',
  'rgba(168,66,219,0.50)',
];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function loadImageDimensions(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = url;
  });
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const CARD_MAX  = 1100;
const CARD_PAD  = 28;
const COL_LEFT  = 340;
const COL_GAP   = 1; // rendered as a 1px divider line
const TITLE_SZ  = 20;
const BODY_SZ   = 15;

// ─── Section title ────────────────────────────────────────────────────────────
function SectionTitle({ children, badge }: { children: React.ReactNode; badge?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <h2
        className="font-display"
        style={{
          fontSize: TITLE_SZ,
          letterSpacing: '0.15em',
          color: 'var(--text)',
          fontWeight: 400,
          margin: 0,
        }}
      >
        {children}
      </h2>
      {badge !== undefined && badge > 0 && (
        <span
          className="font-mono"
          style={{
            fontSize: 12,
            padding: '2px 7px',
            borderRadius: 99,
            background: 'var(--surface-3)',
            color: 'var(--text-2)',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ vertical }: { vertical?: boolean }) {
  return (
    <div
      style={
        vertical
          ? { width: 1, alignSelf: 'stretch', background: 'var(--border)', flexShrink: 0 }
          : { height: 1, background: 'var(--border)', margin: '20px 0' }
      }
    />
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function AssetThumb({
  url, name, onRemove, isActive, onClick, badge,
}: {
  url: string; name: string; onRemove: () => void;
  isActive?: boolean; onClick?: () => void; badge?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="relative group"
      style={{
        width: 76, height: 76, flexShrink: 0,
        borderRadius: 6, overflow: 'hidden',
        border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border-2)'}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive ? '0 0 0 3px var(--accent-glow)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 5 }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove"
          style={{
            width: 22, height: 22, borderRadius: 4,
            background: 'var(--danger)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
          </svg>
        </button>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 font-mono truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.85)', color: 'var(--text)', fontSize: 9, padding: '3px 5px' }}
      >
        {name}
      </div>
      {badge && (
        <div
          className="absolute top-1 left-1 font-mono font-bold"
          style={{ background: 'var(--accent)', color: '#080808', fontSize: 9, padding: '1px 5px', borderRadius: 3 }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [artImages, setArtImages]           = useState<ArtImage[]>([]);
  const [mockups, setMockups]               = useState<MockupTemplate[]>([]);
  const [activeMockupId, setActiveMockupId] = useState<string | null>(null);
  const [results, setResults]               = useState<GeneratedResult[]>([]);
  const [generatedIds, setGeneratedIds]     = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating]     = useState(false);
  const [progress, setProgress]             = useState({ done: 0, total: 0 });
  const [tolerance, setTolerance]           = useState(60);

  // Reset results only when the file set actually changes
  const artKey    = artImages.map((a) => a.id).join(',');
  const mockupKey = mockups.map((m) => m.id).join(',');
  const prevKeysRef = useRef({ artKey: '', mockupKey: '' });
  useEffect(() => {
    const prev = prevKeysRef.current;
    if (artKey !== prev.artKey || mockupKey !== prev.mockupKey) {
      prevKeysRef.current = { artKey, mockupKey };
      if (prev.artKey !== '' || prev.mockupKey !== '') {
        setResults([]);
        setGeneratedIds(new Set());
      }
    }
  });

  const allCombinations = useMemo(
    () => orderCombinations(computeCombinations(mockups, artImages), mockups),
    [mockups, artImages]
  );
  const pendingCombinations = useMemo(
    () => allCombinations.filter((c) => !generatedIds.has(c.id)),
    [allCombinations, generatedIds]
  );
  const remainingCount    = pendingCombinations.length;
  const isExhausted       = allCombinations.length > 0 && remainingCount === 0;
  const hasNoCombinations = artImages.length > 0 && mockups.some((m) => m.frames.length > 0) && allCombinations.length === 0;
  const activeMockup      = mockups.find((m) => m.id === activeMockupId) ?? null;
  const canGenerate       = !isGenerating && pendingCombinations.length > 0;

  // ── Upload handlers ───────────────────────────────────────────────────────
  const handleArtUpload = useCallback(async (files: File[]) => {
    const slots = MAX_ART - artImages.length;
    if (slots <= 0) return;
    const newArts = await Promise.all(
      files.slice(0, slots).map(async (f) => {
        const url = URL.createObjectURL(f);
        const { w, h } = await loadImageDimensions(url);
        return { id: genId(), name: f.name.replace(/\.[^.]+$/, ''), url, w, h } as ArtImage;
      })
    );
    setArtImages((prev) => {
      const s = MAX_ART - prev.length;
      return s <= 0 ? prev : [...prev, ...newArts.slice(0, s)];
    });
  }, [artImages.length]);

  const removeArt = useCallback((id: string) => {
    setArtImages((prev) => {
      const art = prev.find((a) => a.id === id);
      if (art) URL.revokeObjectURL(art.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleMockupUpload = useCallback((files: File[]) => {
    setMockups((prev) => {
      const slots = MAX_MOCKUPS - prev.length;
      if (slots <= 0) return prev;
      const added: MockupTemplate[] = files.slice(0, slots).map((f) => ({
        id: genId(),
        name: f.name.replace(/\.[^.]+$/, ''),
        url: URL.createObjectURL(f),
        frames: [],
      }));
      setActiveMockupId((cur) => cur ?? added[0]?.id ?? null);
      return [...prev, ...added];
    });
  }, []);

  const removeMockup = useCallback((id: string) => {
    setMockups((prev) => {
      const m = prev.find((x) => x.id === id);
      if (m) URL.revokeObjectURL(m.url);
      return prev.filter((x) => x.id !== id);
    });
    if (activeMockupId === id) {
      setActiveMockupId(() => mockups.find((m) => m.id !== id)?.id ?? null);
    }
  }, [activeMockupId, mockups]);

  // ── Frame handlers ────────────────────────────────────────────────────────
  const handleAddFrame = useCallback((frameData: Omit<Frame, 'id' | 'color'>) => {
    if (!activeMockupId) return;
    setMockups((prev) =>
      prev.map((m) => {
        if (m.id !== activeMockupId) return m;
        return {
          ...m,
          frames: [...m.frames, {
            ...frameData,
            id: genId(),
            color: FRAME_COLORS[m.frames.length % FRAME_COLORS.length],
          }],
        };
      })
    );
  }, [activeMockupId]);

  const handleRemoveFrame = useCallback((frameId: string) => {
    if (!activeMockupId) return;
    setMockups((prev) =>
      prev.map((m) => m.id !== activeMockupId ? m : { ...m, frames: m.frames.filter((f) => f.id !== frameId) })
    );
  }, [activeMockupId]);

  const clearAllFrames = useCallback(() => {
    if (!activeMockupId) return;
    setMockups((prev) => prev.map((m) => m.id === activeMockupId ? { ...m, frames: [] } : m));
  }, [activeMockupId]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    const batch = pendingCombinations.slice(0, BATCH_SIZE);
    setIsGenerating(true);
    setProgress({ done: 0, total: batch.length });
    try {
      const newResults = await generateBatch(batch, mockups, artImages, (done, total) =>
        setProgress({ done, total })
      );
      setResults((prev) => [...prev, ...newResults]);
      setGeneratedIds((prev) => {
        const next = new Set(prev);
        batch.forEach((c) => next.add(c.id));
        return next;
      });
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, pendingCombinations, mockups, artImages]);

  const handleClearResults = useCallback(() => {
    setResults([]);
    setGeneratedIds(new Set());
  }, []);

  return (
    // Page shell — dark bg, top padding, vertical centering of content
    <div
      style={{
        minHeight: '100vh',
        paddingTop: 40,
        paddingBottom: 80,
      }}
    >
      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: CARD_MAX,
          margin: '0 auto',
          padding: `0 ${CARD_PAD}px`,
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="0.6" fill="#080808" />
              <rect x="7.5" y="1" width="5.5" height="5.5" rx="0.6" fill="#080808" opacity="0.55" />
              <rect x="1" y="7.5" width="5.5" height="5.5" rx="0.6" fill="#080808" opacity="0.55" />
              <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="0.6" fill="#080808" opacity="0.35" />
            </svg>
          </div>
          <span
            className="font-display"
            style={{ fontSize: 40, letterSpacing: '0.18em', color: 'var(--text)', lineHeight: 1 }}
          >
            MOCKPLACER
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <PageStat label="ART" value={artImages.length} />
          <div style={{ width: 1, height: 20, background: 'var(--border-2)' }} />
          <PageStat label="TEMPLATES" value={mockups.length} />
          {results.length > 0 && (
            <>
              <div style={{ width: 1, height: 20, background: 'var(--border-2)' }} />
              <PageStat label="RESULTS" value={results.length} accent />
            </>
          )}
        </div>
      </div>

      {/* ── MAIN CARD ────────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: CARD_MAX,
          margin: '0 auto',
          borderRadius: 16,
          border: '1px solid var(--border-2)',
          background: 'var(--surface)',
          overflow: 'hidden',
          boxShadow: '0 2px 40px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', minHeight: 600 }}>

          {/* ── LEFT COLUMN: uploads + generate ─────────────────────────────── */}
          <div
            style={{
              width: COL_LEFT,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: CARD_PAD,
              gap: 28,
              background: 'var(--surface-2)',
              borderRight: '1px solid var(--border)',
            }}
          >
            {/* ART IMAGES */}
            <div>
              <SectionTitle badge={artImages.length}>ART IMAGES</SectionTitle>
              <DropZone
                onFiles={handleArtUpload}
                label="Drop artwork here"
                sublabel="PNG · JPG · WEBP"
                multiple
                disabled={artImages.length >= MAX_ART}
                minHeight={130}
              />
              <p
                className="font-mono"
                style={{
                  fontSize: 13, marginTop: 8,
                  color: artImages.length >= MAX_ART ? 'var(--danger)' : 'var(--text-2)',
                }}
              >
                {artImages.length >= MAX_ART ? `Limit reached (${MAX_ART})` : `${artImages.length} / ${MAX_ART} files`}
              </p>
              {artImages.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {artImages.map((art) => (
                    <AssetThumb key={art.id} url={art.url} name={art.name} onRemove={() => removeArt(art.id)} />
                  ))}
                </div>
              )}
            </div>

            <Divider />

            {/* MOCKUP TEMPLATES */}
            <div>
              <SectionTitle badge={mockups.length}>MOCKUP TEMPLATES</SectionTitle>
              <DropZone
                onFiles={handleMockupUpload}
                label="Drop templates here"
                sublabel="Light/white frame areas"
                multiple
                disabled={mockups.length >= MAX_MOCKUPS}
                minHeight={130}
              />
              <p
                className="font-mono"
                style={{
                  fontSize: 13, marginTop: 8,
                  color: mockups.length >= MAX_MOCKUPS ? 'var(--danger)' : 'var(--text-2)',
                }}
              >
                {mockups.length >= MAX_MOCKUPS ? `Limit reached (${MAX_MOCKUPS})` : `${mockups.length} / ${MAX_MOCKUPS} files`}
              </p>
              {mockups.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
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
            </div>

            {/* Spacer pushes generate button to bottom */}
            <div style={{ flex: 1 }} />

            {/* Combination info */}
            {(artImages.length > 0 || mockups.length > 0) && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <ComboChip value={artImages.length} label="art" />
                  <span className="font-mono" style={{ fontSize: 14, color: 'var(--text-3)' }}>×</span>
                  <ComboChip value={mockups.filter((m) => m.frames.length > 0).length} label="tmpls" />
                  <span className="font-mono" style={{ fontSize: 14, color: 'var(--text-3)' }}>=</span>
                  <ComboChip value={allCombinations.length} label="combos" accent />
                </div>

                {isGenerating && progress.total > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border-2)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%', borderRadius: 2, background: 'var(--accent)',
                          width: `${(progress.done / progress.total) * 100}%`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                    <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-2)', flexShrink: 0 }}>
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                )}

                {hasNoCombinations && (
                  <p className="font-mono" style={{ fontSize: 12, color: 'var(--danger)' }}>
                    No orientation matches between art and frames.
                  </p>
                )}
                {artImages.length > 0 && mockups.length > 0 && !mockups.some((m) => m.frames.length > 0) && (
                  <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    Pin frames on a template to enable generation.
                  </p>
                )}
              </div>
            )}

            {/* Generate / exhausted button */}
            {isExhausted ? (
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, height: 48, borderRadius: 8,
                  background: 'var(--surface-3)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  All {results.length} generated
                </span>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="font-display"
                style={{
                  width: '100%', height: 50, borderRadius: 8,
                  fontSize: 16, letterSpacing: '0.14em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: canGenerate ? 'var(--accent)' : 'var(--surface-3)',
                  color: canGenerate ? '#080808' : 'var(--text-3)',
                  border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s, transform 0.1s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (canGenerate) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              >
                {isGenerating ? (
                  <>
                    <span
                      className="animate-spin"
                      style={{
                        width: 15, height: 15, display: 'inline-block', borderRadius: '50%',
                        border: '2px solid #080808', borderTopColor: 'transparent',
                      }}
                    />
                    GENERATING…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {results.length === 0 ? 'GENERATE' : `GENERATE MORE (${remainingCount})`}
                  </>
                )}
              </button>
            )}

            {results.length > 0 && (
              <button
                onClick={handleClearResults}
                className="font-mono"
                style={{
                  width: '100%', height: 36, borderRadius: 6, fontSize: 13,
                  border: '1px solid var(--border-2)',
                  color: 'var(--text-2)', background: 'transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              >
                Clear {results.length} results
              </button>
            )}
          </div>

          {/* ── RIGHT COLUMN: frame editor ───────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            {/* Top bar */}
            <div
              style={{
                padding: `${CARD_PAD}px ${CARD_PAD}px 0`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <SectionTitle>FRAME EDITOR</SectionTitle>

                {/* Tolerance */}
                {activeMockup && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {activeMockup.frames.length > 0 && (
                      <>
                        <button
                          onClick={clearAllFrames}
                          className="font-mono"
                          style={{
                            fontSize: 12, color: 'var(--text-3)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            transition: 'color 0.15s', padding: 0,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                        >
                          Clear frames
                        </button>
                        <div style={{ width: 1, height: 14, background: 'var(--border-2)' }} />
                      </>
                    )}
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-2)', letterSpacing: '0.08em' }}>
                      TOLERANCE
                    </span>
                    <input
                      type="range" min={10} max={120} value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      style={{ width: 100, accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <span className="font-mono" style={{ fontSize: 13, color: 'var(--accent)', width: 28, textAlign: 'right' }}>
                      {tolerance}
                    </span>
                  </div>
                )}
              </div>

              {/* Mockup tabs */}
              {mockups.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                  {mockups.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setActiveMockupId(m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 6,
                        fontSize: BODY_SZ, fontFamily: 'var(--font-body)',
                        background: m.id === activeMockupId ? 'var(--surface-3)' : 'transparent',
                        border: `1px solid ${m.id === activeMockupId ? 'var(--border-2)' : 'var(--border)'}`,
                        color: m.id === activeMockupId ? 'var(--text)' : 'var(--text-2)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {m.name}
                      {m.frames.length > 0 && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                            background: 'var(--accent)', color: '#080808',
                          }}
                        >
                          {m.frames.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Canvas area */}
            <div style={{ flex: 1, padding: `0 ${CARD_PAD}px ${CARD_PAD}px`, minHeight: 400 }}>
              {activeMockup ? (
                <MockupEditor
                  key={activeMockup.id}
                  mockupUrl={activeMockup.url}
                  frames={activeMockup.frames}
                  tolerance={tolerance}
                  onAddFrame={handleAddFrame}
                  onRemoveFrame={handleRemoveFrame}
                />
              ) : (
                <div
                  style={{
                    height: '100%', minHeight: 400,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 16,
                    borderRadius: 10,
                    border: '1.5px dashed var(--border)',
                    background: 'var(--surface-2)',
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  <p
                    className="font-mono"
                    style={{ fontSize: BODY_SZ, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}
                  >
                    {mockups.length === 0
                      ? 'Upload a mockup template to begin'
                      : 'Select a template above to pin frames'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RESULTS ──────────────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div
          style={{
            maxWidth: CARD_MAX,
            margin: '32px auto 0',
            padding: `0 ${CARD_PAD}px`,
          }}
        >
          <ResultsGrid results={results} />
        </div>
      )}

      {/* Footer */}
      <p
        className="font-mono"
        style={{
          textAlign: 'center', marginTop: 48,
          fontSize: 12, color: 'var(--text-3)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}
      >
        All processing is client-side · No uploads · No backend
      </p>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function PageStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <span className="font-mono" style={{ fontSize: 18, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--text)' }}>
        {value}
      </span>
    </div>
  );
}

function ComboChip({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span className="font-mono" style={{ fontSize: 18, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--text)' }}>
        {value}
      </span>
      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
        {label}
      </span>
    </span>
  );
}
