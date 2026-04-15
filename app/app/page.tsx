'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import DropZone from '@/app/components/DropZone';
import MockupEditor from '@/app/components/MockupEditor';
import ResultsGrid from '@/app/components/ResultsGrid';
import UserDropdown from '@/app/components/UserDropdown';
import { ArtImage, MockupTemplate, Frame, GeneratedResult } from '@/app/utils/types';
import { computeCombinations, orderCombinations, generateBatch } from '@/app/utils/compositor';

const BATCH_SIZE = 36;
const MAX_ART = 6;
const MAX_MOCKUPS = 6;

const FRAME_COLORS = [
  'rgba(255,107,53,0.50)',
  'rgba(66,168,219,0.50)',
  'rgba(100,200,66,0.50)',
  'rgba(200,66,168,0.50)',
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

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_MAX = 1100;
const CARD_PAD = 28;
const COL_LEFT = 340;
const NAV_H    = 64;

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, badge }: { children: React.ReactNode; badge?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{
        fontFamily: "'Clash Display', sans-serif",
        fontSize: 18, fontWeight: 700,
        letterSpacing: '-0.01em',
        color: '#151515',
        borderLeft: '3px solid #FF6B35',
        paddingLeft: 10,
      }}>
        {children}
      </span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '1px 7px', borderRadius: 99,
          background: 'var(--accent)', color: '#fff',
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />;
}

// ─── Asset thumbnail ──────────────────────────────────────────────────────────
function AssetThumb({
  url, name, onRemove, isActive, onClick, badge, isMobile,
}: {
  url: string; name: string; onRemove: () => void;
  isActive?: boolean; onClick?: () => void; badge?: string; isMobile?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className="relative group"
      style={{
        width: 76, height: 76, flexShrink: 0,
        borderRadius: 8, overflow: 'hidden',
        border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive ? '0 0 0 3px var(--accent-glow)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

      {/* X button — top-right, circular; always visible on mobile, hover on desktop */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove"
        className={isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}
        style={{
          position: 'absolute', top: 4, right: 4,
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
        </svg>
      </button>

      <div
        className="absolute bottom-0 left-0 right-0 truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.80)', color: '#fff', fontSize: 9, padding: '3px 5px' }}
      >
        {name}
      </div>
      {badge && (
        <div
          className="absolute top-1 left-1"
          style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

// ─── Library template type (from DB) ─────────────────────────────────────────
interface LibraryTemplateItem {
  id: number;
  name: string;
  category: string;
  image: string;
  frames: { x: number; y: number; w: number; h: number; cornerRadius: number }[];
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
  const [isMobile, setIsMobile]             = useState(false);
  const [lang, setLang]                     = useState<'tr' | 'en'>('tr');
  const [user, setUser]                     = useState<{ id?: string; email?: string; name?: string; avatar?: string } | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setLang((localStorage.getItem('mp-lang') as 'tr' | 'en') || 'tr');
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mp-lang' && (e.newValue === 'tr' || e.newValue === 'en')) setLang(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined,
          avatar: user.user_metadata?.avatar_url ?? undefined,
        });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name ?? undefined,
          avatar: session.user.user_metadata?.avatar_url ?? undefined,
        });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const isTR = lang === 'tr';

  const [plan, setPlan] = useState<'free' | 'basic' | 'pro'>('free');
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [libraryTemplates, setLibraryTemplates] = useState<LibraryTemplateItem[]>([]);
  const [libraryLoading, setLibraryLoading]     = useState(false);
  const [libraryCategory, setLibraryCategory]   = useState('all');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setPlan('free'); return; }
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const fetched = data?.plan;
        if (fetched === 'basic' || fetched === 'pro') setPlan(fetched);
        else setPlan('free');
      });
  }, [user?.id]);

  // ── Daily generate limit ──────────────────────────────────────────────────
  // null = unlimited (pro plan)
  const DAILY_LIMIT: number | null = plan === 'pro' ? null : plan === 'basic' ? 15 : 3;
  const [generateCount, setGenerateCount] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem('mockplacer_generates');
      if (raw) {
        const saved = JSON.parse(raw) as { count: number; date: string };
        setGenerateCount(saved.date === today ? saved.count : 0);
      }
    } catch { /* ignore */ }
  }, []);

  const limitReached       = DAILY_LIMIT !== null && generateCount >= DAILY_LIMIT;
  const generatesRemaining = DAILY_LIMIT !== null ? Math.max(0, DAILY_LIMIT - generateCount) : null;

  const incrementGenerateCount = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setGenerateCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('mockplacer_generates', JSON.stringify({ count: next, date: today }));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

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
  const canGenerate       = !isGenerating && pendingCombinations.length > 0 && !limitReached;

  const libraryCategories = useMemo(
    () => [...new Set(libraryTemplates.map((t) => t.category))].sort(),
    [libraryTemplates]
  );
  const filteredLibraryTemplates = useMemo(
    () => libraryCategory === 'all' ? libraryTemplates : libraryTemplates.filter((t) => t.category === libraryCategory),
    [libraryTemplates, libraryCategory]
  );

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

  const handleUpdateFrame = useCallback((frameId: string, changes: Partial<Pick<import('@/app/utils/types').Frame, 'x' | 'y' | 'w' | 'h'>>) => {
    if (!activeMockupId) return;
    setMockups((prev) =>
      prev.map((m) => m.id !== activeMockupId ? m : {
        ...m,
        frames: m.frames.map((f) => f.id === frameId ? { ...f, ...changes } : f),
      })
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
      incrementGenerateCount();
      setGeneratedIds((prev) => {
        const next = new Set(prev);
        batch.forEach((c) => next.add(c.id));
        return next;
      });
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, pendingCombinations, mockups, artImages, incrementGenerateCount]);

  const handleClearResults = useCallback(() => {
    setResults([]);
    setGeneratedIds(new Set());
  }, []);

  // ── Browse Library ────────────────────────────────────────────────────────
  const addFromLibrary = useCallback(async (tpl: LibraryTemplateItem) => {
    if (mockups.length >= MAX_MOCKUPS) return;
    const { w: imgW, h: imgH } = await loadImageDimensions(tpl.image);
    if (imgW === 0) return;
    const id = genId();
    const newMockup: MockupTemplate = {
      id,
      name: tpl.name,
      url: tpl.image,
      frames: tpl.frames.map((f, i) => ({
        id: genId(),
        color: FRAME_COLORS[i % FRAME_COLORS.length],
        x: f.x * imgW,
        y: f.y * imgH,
        w: f.w * imgW,
        h: f.h * imgH,
        cornerRadius: f.cornerRadius,
      })),
    };
    setMockups((prev) => {
      const slots = MAX_MOCKUPS - prev.length;
      if (slots <= 0) return prev;
      return [...prev, newMockup];
    });
    setActiveMockupId(id);
    setSelectedLibraryId(String(tpl.id));
    setLibraryModalOpen(false);
  }, [mockups.length]);

  useEffect(() => {
    if (!libraryModalOpen) return;
    if (libraryTemplates.length > 0) return;
    setLibraryLoading(true);
    fetch('/templates.json')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setLibraryTemplates(data))
      .catch(() => null)
      .finally(() => setLibraryLoading(false));
  }, [libraryModalOpen, libraryTemplates.length]);

  // ── Generate section (combo info + generate button + clear) ──────────────
  const generateSection = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Combination info */}
      {(artImages.length > 0 || mockups.length > 0) && (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: '#fff',
          border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <ComboChip value={artImages.length} label="art" />
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'monospace' }}>×</span>
            <ComboChip value={mockups.filter((m) => m.frames.length > 0).length} label="templates" />
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'monospace' }}>=</span>
            <ComboChip value={allCombinations.length} label="combos" accent />
          </div>

          {isGenerating && progress.total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'var(--accent)',
                  width: `${(progress.done / progress.total) * 100}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-2)', flexShrink: 0, fontFamily: 'monospace' }}>
                {progress.done}/{progress.total}
              </span>
            </div>
          )}

          {hasNoCombinations && (
            <p style={{ fontSize: 12, color: 'var(--danger)', fontFamily: 'monospace' }}>
              {isTR ? 'Sanat ve çerçeveler arasında uygun oryantasyon bulunamadı.' : 'No orientation matches between art and frames.'}
            </p>
          )}
          {artImages.length > 0 && mockups.length > 0 && !mockups.some((m) => m.frames.length > 0) && (
            <p style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>
              {isTR ? 'Oluşturmayı etkinleştirmek için şablona çerçeve ekleyin.' : 'Pin frames on a template to enable generation.'}
            </p>
          )}
        </div>
      )}

      {/* Generate / exhausted button */}
      {isExhausted ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, height: 50, borderRadius: 12,
          background: '#F0FBF0', border: '1px solid #B7DFB7',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontSize: 13, color: 'var(--success)', fontFamily: "'Clash Display', sans-serif", fontWeight: 600, letterSpacing: '0.04em' }}>
            {isTR ? `Tümü oluşturuldu (${results.length})` : `All ${results.length} generated`}
          </span>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width: '100%', height: 56, borderRadius: 12,
            fontSize: 16, fontWeight: 700, letterSpacing: '0.04em',
            fontFamily: "'Clash Display', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: canGenerate ? '#FF6B35' : 'rgba(255,107,53,0.4)',
            color: '#fff',
            border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
            boxShadow: canGenerate ? '0 4px 20px rgba(255,107,53,0.3)' : 'none',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (canGenerate) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,107,53,0.40)';
              e.currentTarget.style.background = '#E85A28';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = canGenerate ? '0 4px 20px rgba(255,107,53,0.3)' : 'none';
            e.currentTarget.style.background = canGenerate ? '#FF6B35' : 'rgba(255,107,53,0.4)';
          }}
        >
          {isGenerating ? (
            <>
              <span style={{
                width: 15, height: 15, display: 'inline-block', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                animation: 'spin 0.8s linear infinite',
              }} />
              {isTR ? 'Oluşturuluyor…' : 'Generating…'}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {results.length === 0
                ? (isTR ? 'Oluştur' : 'Generate')
                : (isTR ? `Daha Fazla Oluştur (${remainingCount})` : `Generate More (${remainingCount})`)
              }
            </>
          )}
        </button>
      )}

      {/* Plan badge + daily limit indicator */}
      {!isExhausted && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: '-4px 0' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
            padding: '2px 8px', borderRadius: 99,
            background: plan === 'pro' ? 'rgba(255,107,53,0.12)' : plan === 'basic' ? 'rgba(66,168,219,0.10)' : 'var(--surface-3)',
            color: plan === 'pro' ? '#FF6B35' : plan === 'basic' ? '#2A8FC2' : 'var(--text-2)',
            border: plan === 'pro' ? '1px solid rgba(255,107,53,0.25)' : plan === 'basic' ? '1px solid rgba(66,168,219,0.25)' : '1px solid var(--border)',
          }}>
            {plan === 'pro'
              ? (isTR ? 'Pro Plan (Sınırsız)' : 'Pro Plan (Unlimited)')
              : plan === 'basic'
                ? (isTR ? 'Basic Plan (15/gün)' : 'Basic Plan (15/day)')
                : (isTR ? 'Ücretsiz Plan (3/gün)' : 'Free Plan (3/day)')
            }
          </span>
          {DAILY_LIMIT !== null && (
            <p style={{
              fontSize: 12, textAlign: 'center', fontFamily: 'monospace',
              color: limitReached ? 'var(--danger)' : 'var(--text-2)',
              margin: 0,
            }}>
              {limitReached
                ? (isTR ? 'Günlük üretim limitine ulaştınız.' : 'Daily limit reached.')
                : (isTR
                    ? `Bugün ${generatesRemaining} / ${DAILY_LIMIT} ücretsiz üretim hakkınız kaldı`
                    : `${generatesRemaining} of ${DAILY_LIMIT} free generates remaining today`)
              }
            </p>
          )}
        </div>
      )}

      {results.length > 0 && (
        <button
          onClick={handleClearResults}
          style={{
            width: '100%', height: 36, borderRadius: 8, fontSize: 13,
            border: '1px solid var(--border)',
            color: 'var(--text-2)', background: 'transparent',
            cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--danger)';
            e.currentTarget.style.color = 'var(--danger)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-2)';
          }}
        >
          {isTR ? `${results.length} sonucu temizle` : `Clear ${results.length} results`}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', paddingTop: NAV_H }}>

      {/* ── BROWSE LIBRARY MODAL ───────────────────────────────────────────── */}
      {libraryModalOpen && (
        <div
          onClick={() => setLibraryModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 700,
              maxHeight: '80vh',
              background: '#fff', borderRadius: 20,
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Clash Display', sans-serif",
                fontSize: 20, fontWeight: 700, color: '#151515',
                borderLeft: '3px solid #FF6B35', paddingLeft: 10,
              }}>
                {isTR ? 'Kütüphane' : 'Browse Library'}
              </span>
              <button
                onClick={() => setLibraryModalOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--surface-3)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#eee')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
              >
                <svg width="11" height="11" viewBox="0 0 8 8" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
                </svg>
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Category filter */}
              {libraryCategories.length > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {['all', ...libraryCategories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLibraryCategory(cat)}
                      style={{
                        padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
                        background: libraryCategory === cat ? '#FF6B35' : 'var(--surface-3)',
                        color: libraryCategory === cat ? '#fff' : 'var(--text-2)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cat === 'all'
                        ? (isTR ? 'Tümü' : 'All')
                        : cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid */}
              {libraryLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-2)', fontSize: 14 }}>
                  {isTR ? 'Yükleniyor...' : 'Loading...'}
                </div>
              ) : filteredLibraryTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-2)', fontSize: 14 }}>
                  {isTR ? 'Şablon bulunamadı' : 'No templates found'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {filteredLibraryTemplates.map((tpl) => {
                    const isSelected = selectedLibraryId === String(tpl.id);
                    const isDisabled = !isSelected && mockups.length >= MAX_MOCKUPS;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => !isDisabled && addFromLibrary(tpl)}
                        style={{
                          borderRadius: 10, overflow: 'hidden',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          border: `2px solid ${isSelected ? '#FF6B35' : 'var(--border)'}`,
                          boxShadow: isSelected ? '0 0 0 3px rgba(255,107,53,0.18)' : 'none',
                          transition: 'all 0.15s',
                          opacity: isDisabled ? 0.45 : 1,
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => { if (!isDisabled) (e.currentTarget as HTMLDivElement).style.borderColor = '#FF6B35'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isSelected ? '#FF6B35' : 'var(--border)'; }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tpl.image}
                          alt={tpl.name}
                          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{ padding: '5px 8px', background: '#fff' }}>
                          <p style={{
                            fontSize: 11, fontWeight: 600, color: '#151515',
                            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {tpl.name}
                          </p>
                        </div>
                        {tpl.frames.length > 0 && (
                          <div style={{
                            position: 'absolute', top: 6, right: 6,
                            background: 'rgba(255,107,53,0.90)', color: '#fff',
                            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          }}>
                            {tpl.frames.length}f
                          </div>
                        )}
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 6, left: 6,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#FF6B35',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="9" height="9" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1,4 3,6 7,2" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: NAV_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 3vw, 40px)',
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/1logo.png" width="180" height="45" style={{ display: 'block' }} alt="MockPlacer" />
        </Link>

        {/* Stats + back link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NavStat label={isTR ? 'Görsel' : 'Art'} value={artImages.length} />
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <NavStat label={isTR ? 'Şablon' : 'Templates'} value={mockups.length} />
          {results.length > 0 && (
            <>
              <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
              <NavStat label={isTR ? 'Sonuç' : 'Results'} value={results.length} accent />
            </>
          )}
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <a
            href="/"
            style={{ fontSize: 15, fontWeight: 600, color: '#FF6B35', textDecoration: 'none' }}
          >
            {isTR ? '← Ana Sayfa' : '← Home'}
          </a>
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          {user ? (
            <UserDropdown
              user={user}
              plan={plan}
              lang={lang}
              onSignOut={() => setUser(null)}
            />
          ) : (
            <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#FF6B35', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {isTR ? 'Giriş Yap' : 'Sign In'}
            </Link>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: CARD_MAX, margin: '0 auto', padding: `32px ${CARD_PAD}px 80px` }}>

        {/* ── TOOL CARD ──────────────────────────────────────────────────── */}
        <div style={{
          borderRadius: 20,
          border: '1px solid rgba(255,107,53,0.12)',
          background: '#FDFCFB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: isMobile ? undefined : 600 }}>

            {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
            <div style={{
              width: isMobile ? '100%' : COL_LEFT, flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              padding: CARD_PAD, gap: 24,
              background: 'var(--surface-2)',
              borderRight: isMobile ? 'none' : '1px solid var(--border)',
              borderBottom: isMobile ? '1px solid var(--border)' : 'none',
            }}>

              {/* ART IMAGES */}
              <div>
                <SectionLabel badge={artImages.length}>{isTR ? 'Sanat Görselleri' : 'Art Images'}</SectionLabel>
                <DropZone
                  onFiles={handleArtUpload}
                  label={isTR ? 'Görselleri buraya bırakın' : 'Drop artwork here'}
                  sublabel="PNG · JPG · WEBP"
                  multiple
                  disabled={artImages.length >= MAX_ART}
                  minHeight={130}
                />
                <p style={{
                  fontSize: 12, marginTop: 8, fontFamily: 'var(--font-mono, monospace)',
                  color: artImages.length >= MAX_ART ? 'var(--danger)' : 'var(--text-2)',
                }}>
                  {artImages.length >= MAX_ART
                    ? (isTR ? `Sınıra ulaşıldı (${MAX_ART})` : `Limit reached (${MAX_ART})`)
                    : (isTR ? `${artImages.length} / ${MAX_ART} dosya` : `${artImages.length} / ${MAX_ART} files`)}
                </p>
                {artImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {artImages.map((art) => (
                      <AssetThumb key={art.id} url={art.url} name={art.name} onRemove={() => removeArt(art.id)} isMobile={isMobile} />
                    ))}
                  </div>
                )}
              </div>

              <Divider />

              {/* MOCKUP TEMPLATES */}
              <div>
                <SectionLabel badge={mockups.length}>{isTR ? 'Mockup Şablonları' : 'Mockup Templates'}</SectionLabel>

                {/* Upload drop zone */}
                <DropZone
                  onFiles={handleMockupUpload}
                  label={isTR ? 'Şablonları buraya bırakın' : 'Drop templates here'}
                  sublabel={isTR ? 'Açık/beyaz çerçeve alanları' : 'Light/white frame areas'}
                  multiple
                  disabled={mockups.length >= MAX_MOCKUPS}
                  minHeight={110}
                />
                <p style={{
                  fontSize: 12, marginTop: 8, fontFamily: 'var(--font-mono, monospace)',
                  color: mockups.length >= MAX_MOCKUPS ? 'var(--danger)' : 'var(--text-2)',
                }}>
                  {mockups.length >= MAX_MOCKUPS
                    ? (isTR ? `Sınıra ulaşıldı (${MAX_MOCKUPS})` : `Limit reached (${MAX_MOCKUPS})`)
                    : (isTR ? `${mockups.length} / ${MAX_MOCKUPS} dosya` : `${mockups.length} / ${MAX_MOCKUPS} files`)}
                </p>

                {/* Selected mockup cards */}
                {mockups.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {mockups.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setActiveMockupId(m.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 10px', borderRadius: 10,
                          background: m.id === activeMockupId ? 'rgba(255,107,53,0.06)' : '#fff',
                          border: `1.5px solid ${m.id === activeMockupId ? '#FF6B35' : 'var(--border)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.url}
                          alt={m.name}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid var(--border)' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0, fontSize: 12, fontWeight: 600, color: '#151515',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{m.name}</p>
                          {m.frames.length > 0 && (
                            <p style={{ margin: 0, fontSize: 10, color: '#FF6B35', fontFamily: 'monospace', fontWeight: 700 }}>
                              {m.frames.length}f
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeMockup(m.id); }}
                          title="Remove"
                          style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(0,0,0,0.08)', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
                            <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Browse Library button */}
                <button
                  onClick={() => setLibraryModalOpen(true)}
                  disabled={mockups.length >= MAX_MOCKUPS}
                  style={{
                    width: '100%', marginTop: 10, height: 38, borderRadius: 10,
                    border: '1.5px dashed rgba(255,107,53,0.4)',
                    background: 'transparent',
                    color: mockups.length >= MAX_MOCKUPS ? 'var(--text-2)' : '#FF6B35',
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                    cursor: mockups.length >= MAX_MOCKUPS ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.15s',
                    opacity: mockups.length >= MAX_MOCKUPS ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (mockups.length < MAX_MOCKUPS) e.currentTarget.style.borderColor = '#FF6B35'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,107,53,0.4)'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                  {isTR ? 'Kütüphaneye Gözat' : 'Browse Library'}
                </button>
              </div>

              {/* Spacer — desktop only */}
              {!isMobile && <div style={{ flex: 1 }} />}

              {/* Generate section — desktop: render inline in sidebar */}
              {!isMobile && generateSection}
            </div>

            {/* ── RIGHT COLUMN: frame editor ──────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

              {/* Top bar */}
              <div style={{ padding: `${CARD_PAD}px ${CARD_PAD}px 0`, flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16, flexWrap: 'wrap', gap: 12,
                }}>
                  <SectionLabel>{isTR ? 'Çerçeve Düzenleyici' : 'Frame Editor'}</SectionLabel>

                  {/* Tolerance + clear */}
                  {activeMockup && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {activeMockup.frames.length > 0 && (
                        <>
                          <button
                            onClick={clearAllFrames}
                            style={{
                              fontSize: 12, color: 'var(--text-2)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              transition: 'color 0.15s', padding: 0,
                              fontFamily: 'var(--font-body)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
                          >
                            {isTR ? 'Çerçeveleri temizle' : 'Clear frames'}
                          </button>
                          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
                        </>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-2)', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                        {isTR ? 'Tolerans' : 'Tolerance'}
                      </span>
                      <input
                        type="range" min={10} max={120} value={tolerance}
                        onChange={(e) => setTolerance(Number(e.target.value))}
                        style={{ width: 100, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--accent)', width: 28, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
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
                          padding: '6px 14px', borderRadius: 8,
                          fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500,
                          background: 'transparent',
                          border: `1.5px solid ${m.id === activeMockupId ? '#FF6B35' : '#E5E5E5'}`,
                          borderBottom: m.id === activeMockupId ? '2.5px solid #FF6B35' : '1.5px solid #E5E5E5',
                          color: m.id === activeMockupId ? '#FF6B35' : 'var(--text-2)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: m.id === activeMockupId ? '0 2px 8px rgba(255,107,53,0.15)' : 'none',
                        }}
                      >
                        {m.name}
                        {m.frames.length > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                            background: m.id === activeMockupId ? 'var(--accent)' : 'var(--surface-3)',
                            color: m.id === activeMockupId ? '#fff' : 'var(--text-2)',
                          }}>
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
                    lang={lang}
                    onAddFrame={handleAddFrame}
                    onRemoveFrame={handleRemoveFrame}
                    onUpdateFrame={handleUpdateFrame}
                  />
                ) : (
                  <div style={{
                    height: '100%', minHeight: 400,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 16,
                    borderRadius: 12,
                    border: '1.5px dashed var(--border)',
                    background: 'var(--surface-2)',
                  }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,107,53,0.3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                    <p style={{ fontSize: 14, color: '#737373', textAlign: 'center', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                      {mockups.length === 0
                        ? (isTR ? 'Başlamak için mockup şablonu yükleyin' : 'Upload a mockup template to begin')
                        : (isTR ? 'Çerçeve eklemek için yukarıdan şablon seçin' : 'Select a template above to pin frames')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── MOBILE: Generate section below Frame Editor ──────────── */}
            {isMobile && (
              <div style={{ padding: CARD_PAD, borderTop: '1px solid var(--border)' }}>
                {generateSection}
              </div>
            )}

          </div>
        </div>

        {/* ── RESULTS ────────────────────────────────────────────────────── */}
        {limitReached && results.length === 0 && (
          <div style={{
            marginTop: 40, padding: '28px 32px', borderRadius: 16,
            background: 'rgba(255,107,53,0.06)',
            border: '1px solid rgba(255,107,53,0.25)',
            display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,107,53,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', fontFamily: "'Clash Display', sans-serif" }}>
                {isTR ? `Bugünkü ${DAILY_LIMIT ?? 0} ücretsiz üretiminizi kullandınız.` : `You've used your ${DAILY_LIMIT ?? 0} free generates today.`}
              </p>
            </div>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, paddingLeft: 46 }}>
              {isTR
                ? 'Yarın tekrar gelin veya daha fazlası için yükseltin.'
                : 'Come back tomorrow or upgrade for more.'}
            </p>
            <a
              href="/pricing?upgrade=true"
              style={{
                marginLeft: 46,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10,
                background: '#FF6B35', color: '#fff',
                fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(255,107,53,0.28)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#E85A28')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
            >
              {isTR ? 'Planları Gör' : 'View Plans'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <ResultsGrid results={results} lang={lang} plan={plan} />
          </div>
        )}

        {/* Footer note */}
        <p style={{
          textAlign: 'center', marginTop: 48,
          fontSize: 12, color: '#A3A3A3',
          letterSpacing: '0.04em', fontFamily: 'monospace',
        }}>
          {isTR ? 'Tüm işlemler tarayıcıda · Yükleme yok · Sunucu yok' : 'All processing is client-side · No uploads · No backend'}
        </p>
      </div>
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function NavStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontSize: 14, color: 'var(--text-3)', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
        {value}
      </span>
    </div>
  );
}

function ComboChip({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text)', fontFamily: 'var(--font-display)' }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace' }}>
        {label}
      </span>
    </span>
  );
}
