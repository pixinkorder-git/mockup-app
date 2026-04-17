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
  'rgba(249, 115, 22, 0.50)', // Tailwind Orange 500
  'rgba(56, 189, 248, 0.50)', // Sky 400
  'rgba(74, 222, 128, 0.50)', // Green 400
  'rgba(167, 139, 250, 0.50)', // Violet 400
  'rgba(244, 114, 182, 0.50)', // Pink 400
  'rgba(250, 204, 21, 0.50)', // Yellow 400
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
const SIDEBAR_W = 380;
const NAV_H = 68;

// ─── Shared Theme Styles ──────────────────────────────────────────────────────
const theme = {
  bg: '#F9FAFB', // Light gray background for canvas area
  surface: '#FFFFFF', // White for panels
  border: '#E5E7EB',
  accent: '#F97316', // Orange 500
  accentHover: '#EA580C', // Orange 600
  textMain: '#111827',
  textMuted: '#6B7280',
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, badge, action }: { children: React.ReactNode; badge?: number; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{
          fontFamily: theme.fontFamily,
          fontSize: 16,
          fontWeight: 700,
          color: theme.textMain,
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          {children}
        </h3>
        {badge !== undefined && (
          <span style={{
            fontSize: 12, fontWeight: 600, fontFamily: theme.fontFamily,
            padding: '2px 8px', borderRadius: 99,
            background: badge > 0 ? 'rgba(249, 115, 22, 0.1)' : '#F3F4F6',
            color: badge > 0 ? theme.accent : theme.textMuted,
          }}>
            {badge}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
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
      className="group relative"
      style={{
        width: 72, height: 72, flexShrink: 0,
        borderRadius: 12, overflow: 'hidden',
        border: `2px solid ${isActive ? theme.accent : theme.border}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive ? '0 4px 12px rgba(249, 115, 22, 0.2)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#fff'
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)',
        opacity: isActive ? 1 : 0, transition: 'opacity 0.2s'
      }} className="group-hover:opacity-100" />

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove"
        className={isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}
        style={{
          position: 'absolute', top: 4, right: 4,
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2, color: '#EF4444',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>

      {badge && (
        <div
          className="absolute bottom-1 right-1"
          style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, backdropFilter: 'blur(4px)' }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface LibraryTemplateItem {
  id: number;
  name: string;
  category: string;
  image: string;
  frames: { x: number; y: number; w: number; h: number; cornerRadius: number }[];
}

interface LibraryFav {
  favId: string;
  tplId: string;
  name: string;
  image: string;
  mockup: MockupTemplate;
  checked: boolean;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [artImages, setArtImages]             = useState<ArtImage[]>([]);
  const [mockups, setMockups]                 = useState<MockupTemplate[]>([]);
  const [activeMockupId, setActiveMockupId]   = useState<string | null>(null);
  const [results, setResults]                 = useState<GeneratedResult[]>([]);
  const [generatedIds, setGeneratedIds]       = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating]       = useState(false);
  const [progress, setProgress]               = useState({ done: 0, total: 0 });
  const [tolerance, setTolerance]             = useState(60);
  const [isMobile, setIsMobile]               = useState(false);
  const [lang, setLang]                       = useState<'tr' | 'en'>('tr');
  const [user, setUser]                       = useState<{ id?: string; email?: string; name?: string; avatar?: string } | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900); // Expanded mobile breakpoint for sidebar layout
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
          id: user.id, email: user.email,
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined,
          avatar: user.user_metadata?.avatar_url ?? undefined,
        });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id, email: session.user.email,
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
  const [libraryFavorites, setLibraryFavorites] = useState<LibraryFav[]>([]);
  const [toast, setToast]                       = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setPlan('free'); return; }
    const supabase = createClient();
    supabase.from('profiles').select('plan').eq('id', user.id).single()
      .then(({ data }) => {
        const fetched = data?.plan;
        if (fetched === 'basic' || fetched === 'pro') setPlan(fetched);
        else setPlan('free');
      });
  }, [user?.id]);

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
      try { localStorage.setItem('mockplacer_generates', JSON.stringify({ count: next, date: today })); } catch { }
      return next;
    });
  }, []);

  const activeMockups = mockups;
  const artKey    = artImages.map((a) => a.id).join(',');
  const mockupKey = activeMockups.map((m) => m.id).join(',');
  const prevKeysRef = useRef({ artKey: '', mockupKey: '' });
  useEffect(() => {
    const prev = prevKeysRef.current;
    if (artKey !== prev.artKey || mockupKey !== prev.mockupKey) {
      prevKeysRef.current = { artKey, mockupKey };
      if (prev.artKey !== '' || prev.mockupKey !== '') {
        setResults([]); setGeneratedIds(new Set());
      }
    }
  });

  const allCombinations = useMemo(() => orderCombinations(computeCombinations(activeMockups, artImages), activeMockups), [activeMockups, artImages]);
  const pendingCombinations = useMemo(() => allCombinations.filter((c) => !generatedIds.has(c.id)), [allCombinations, generatedIds]);
  const remainingCount    = pendingCombinations.length;
  const isExhausted       = allCombinations.length > 0 && remainingCount === 0;
  const hasNoCombinations = artImages.length > 0 && activeMockups.some((m) => m.frames.length > 0) && allCombinations.length === 0;
  const activeMockup      = mockups.find((m) => m.id === activeMockupId) ?? null;
  const canGenerate       = !isGenerating && pendingCombinations.length > 0 && !limitReached;

  const libraryCategories = useMemo(() => [...new Set(libraryTemplates.map((t) => t.category))].sort(), [libraryTemplates]);
  const filteredLibraryTemplates = useMemo(() => libraryCategory === 'all' ? libraryTemplates : libraryTemplates.filter((t) => t.category === libraryCategory), [libraryTemplates, libraryCategory]);

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
        id: genId(), name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f), frames: [],
      }));
      setActiveMockupId((cur) => cur ?? added[0]?.id ?? null);
      return [...prev, ...added];
    });
  }, []);

  const removeMockup = useCallback((id: string) => {
    setLibraryFavorites((prev) => prev.map((f) => f.mockup.id === id ? { ...f, checked: false } : f));
    setMockups((prev) => {
      const m = prev.find((x) => x.id === id);
      if (m && m.url.startsWith('blob:')) URL.revokeObjectURL(m.url);
      return prev.filter((x) => x.id !== id);
    });
    if (activeMockupId === id) setActiveMockupId(mockups.find((m) => m.id !== id)?.id ?? null);
  }, [activeMockupId, mockups]);

  const handleAddFrame = useCallback((frameData: Omit<Frame, 'id' | 'color'>) => {
    if (!activeMockupId) return;
    setMockups((prev) => prev.map((m) => {
      if (m.id !== activeMockupId) return m;
      return { ...m, frames: [...m.frames, { ...frameData, id: genId(), color: FRAME_COLORS[m.frames.length % FRAME_COLORS.length] }] };
    }));
  }, [activeMockupId]);

  const handleRemoveFrame = useCallback((frameId: string) => {
    if (!activeMockupId) return;
    setMockups((prev) => prev.map((m) => m.id !== activeMockupId ? m : { ...m, frames: m.frames.filter((f) => f.id !== frameId) }));
  }, [activeMockupId]);

  const handleUpdateFrame = useCallback((frameId: string, changes: Partial<Pick<import('@/app/utils/types').Frame, 'x' | 'y' | 'w' | 'h'>>) => {
    if (!activeMockupId) return;
    setMockups((prev) => prev.map((m) => m.id !== activeMockupId ? m : { ...m, frames: m.frames.map((f) => f.id === frameId ? { ...f, ...changes } : f) }));
  }, [activeMockupId]);

  const clearAllFrames = useCallback(() => {
    if (!activeMockupId) return;
    setMockups((prev) => prev.map((m) => m.id === activeMockupId ? { ...m, frames: [] } : m));
  }, [activeMockupId]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    const batch = pendingCombinations.slice(0, BATCH_SIZE);
    setIsGenerating(true); setProgress({ done: 0, total: batch.length });
    try {
      const newResults = await generateBatch(batch, mockups, artImages, (done, total) => setProgress({ done, total }));
      setResults((prev) => [...prev, ...newResults]);
      incrementGenerateCount();
      setGeneratedIds((prev) => { const next = new Set(prev); batch.forEach((c) => next.add(c.id)); return next; });
    } finally { setIsGenerating(false); }
  }, [canGenerate, pendingCombinations, mockups, artImages, incrementGenerateCount]);

  const handleClearResults = useCallback(() => { setResults([]); setGeneratedIds(new Set()); }, []);

  const addFromLibrary = useCallback(async (tpl: LibraryTemplateItem) => {
    if (libraryFavorites.some((f) => f.tplId === tpl.image)) { setToast(isTR ? 'Zaten kayıtlı' : 'Already in your templates'); return; }
    const { w: imgW, h: imgH } = await loadImageDimensions(tpl.image);
    if (imgW === 0) return;
    const mockupId = genId();
    const newMockup: MockupTemplate = {
      id: mockupId, name: tpl.name, url: tpl.image,
      frames: tpl.frames.map((f, i) => ({
        id: genId(), color: FRAME_COLORS[i % FRAME_COLORS.length],
        x: f.x * imgW, y: f.y * imgH, w: f.w * imgW, h: f.h * imgH, cornerRadius: f.cornerRadius,
      })),
    };
    const newFav: LibraryFav = { favId: genId(), tplId: tpl.image, name: tpl.name, image: tpl.image, mockup: newMockup, checked: false };
    setLibraryFavorites((prev) => [...prev, newFav]);
    setToast(isTR ? 'Şablonlarınıza eklendi' : 'Added to My Templates');
  }, [libraryFavorites, isTR]);

  const toggleFav = useCallback((favId: string) => {
    const fav = libraryFavorites.find((f) => f.favId === favId);
    if (!fav) return;
    if (fav.checked) {
      setLibraryFavorites((prev) => prev.map((f) => f.favId === favId ? { ...f, checked: false } : f));
      setMockups((prev) => prev.filter((m) => m.id !== fav.mockup.id));
      if (activeMockupId === fav.mockup.id) setActiveMockupId(mockups.find((m) => m.id !== fav.mockup.id)?.id ?? null);
    } else {
      if (mockups.length >= MAX_MOCKUPS) { setToast(isTR ? 'En fazla 6 aktif şablon' : 'Max 6 active templates'); return; }
      setLibraryFavorites((prev) => prev.map((f) => f.favId === favId ? { ...f, checked: true } : f));
      setMockups((prev) => [...prev, fav.mockup]);
      setActiveMockupId(fav.mockup.id);
    }
  }, [libraryFavorites, mockups, activeMockupId, isTR]);

  const removeFav = useCallback((favId: string) => {
    const fav = libraryFavorites.find((f) => f.favId === favId);
    if (!fav) return;
    setLibraryFavorites((prev) => prev.filter((f) => f.favId !== favId));
    if (fav.checked) {
      setMockups((prev) => prev.filter((m) => m.id !== fav.mockup.id));
      if (activeMockupId === fav.mockup.id) setActiveMockupId(null);
    }
  }, [libraryFavorites, activeMockupId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!libraryModalOpen || libraryTemplates.length > 0) return;
    setLibraryLoading(true);
    fetch('/templates.json')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setLibraryTemplates(data))
      .catch(() => null)
      .finally(() => setLibraryLoading(false));
  }, [libraryModalOpen, libraryTemplates.length]);

  // suppress unused variable warning
  void hasNoCombinations;
  void progress;

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, fontFamily: theme.fontFamily }}>

      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, height: NAV_H,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/1logo.png" width="160" height="40" style={{ display: 'block', objectFit: 'contain' }} alt="MockPlacer" />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <NavStat label={isTR ? 'Görsel' : 'Art'} value={artImages.length} />
            <div style={{ width: 1, height: 24, background: theme.border, alignSelf: 'center' }} />
            <NavStat label={isTR ? 'Şablon' : 'Templates'} value={mockups.length} />
            {results.length > 0 && (
              <>
                <div style={{ width: 1, height: 24, background: theme.border, alignSelf: 'center' }} />
                <NavStat label={isTR ? 'Sonuç' : 'Results'} value={results.length} accent />
              </>
            )}
          </div>
          <div style={{ width: 1, height: 24, background: theme.border }} />
          {user ? (
            <UserDropdown user={user} plan={plan} lang={lang} onSignOut={() => setUser(null)} />
          ) : (
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textDecoration: 'none', padding: '8px 16px', borderRadius: 8, background: 'rgba(249, 115, 22, 0.1)' }}>
              {isTR ? 'Giriş Yap' : 'Sign In'}
            </Link>
          )}
        </div>
      </header>

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: `calc(100vh - ${NAV_H}px)` }}>

        {/* ── LEFT SIDEBAR (Assets & Settings) ─────────────────────────────── */}
        <div style={{
          width: isMobile ? '100%' : SIDEBAR_W,
          background: theme.surface,
          borderRight: isMobile ? 'none' : `1px solid ${theme.border}`,
          display: 'flex', flexDirection: 'column',
          height: isMobile ? 'auto' : '100%',
          overflow: 'hidden'
        }}>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Art Images Section */}
            <div>
              <SectionLabel badge={artImages.length}>{isTR ? 'Sanat Görselleri' : 'Art Images'}</SectionLabel>
              <DropZone
                onFiles={handleArtUpload}
                label={isTR ? 'Görselleri sürükleyin' : 'Drop artwork here'}
                sublabel="PNG · JPG · WEBP"
                multiple disabled={artImages.length >= MAX_ART} minHeight={100}
              />
              <p style={{ fontSize: 12, marginTop: 10, color: artImages.length >= MAX_ART ? '#EF4444' : theme.textMuted, fontWeight: 500 }}>
                {artImages.length >= MAX_ART ? (isTR ? `Sınıra ulaşıldı (${MAX_ART})` : `Limit reached (${MAX_ART})`) : `${artImages.length} / ${MAX_ART} files`}
              </p>
              {artImages.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                  {artImages.map((art) => (
                    <AssetThumb key={art.id} url={art.url} name={art.name} onRemove={() => removeArt(art.id)} isMobile={isMobile} />
                  ))}
                </div>
              )}
            </div>

            {/* My Templates Section */}
            <div>
              <SectionLabel
                badge={libraryFavorites.length}
                action={
                  <button
                    onClick={() => setLibraryModalOpen(true)}
                    style={{
                      background: 'rgba(249, 115, 22, 0.1)', color: theme.accent, border: 'none',
                      padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'background 0.2s',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    {isTR ? 'Ekle' : 'Add'}
                  </button>
                }
              >
                {isTR ? 'Şablonlarım' : 'My Templates'}
              </SectionLabel>

              {libraryFavorites.length === 0 ? (
                <div style={{ padding: '24px 16px', borderRadius: 12, border: `2px dashed ${theme.border}`, background: '#FAFAFA', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: theme.textMuted, margin: 0, fontWeight: 500 }}>
                    {isTR ? 'Kütüphaneden şablon seçerek başlayın.' : 'Start by adding templates from the library.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {libraryFavorites.map((fav) => {
                    const isActive = fav.checked;
                    return (
                      <div
                        key={fav.favId}
                        onClick={() => setActiveMockupId(fav.mockup.id)}
                        className="group"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 12,
                          background: isActive ? 'rgba(249, 115, 22, 0.04)' : theme.surface,
                          border: `1px solid ${isActive ? theme.accent : theme.border}`,
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          boxShadow: isActive ? '0 2px 8px rgba(249, 115, 22, 0.08)' : 'none'
                        }}
                      >
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleFav(fav.favId); }}
                          style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            border: `2px solid ${isActive ? theme.accent : '#D1D5DB'}`,
                            background: isActive ? theme.accent : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s', cursor: 'pointer'
                          }}
                        >
                          {isActive && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2.5,6 5,8.5 9.5,3.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fav.image} alt={fav.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: `1px solid ${theme.border}`, opacity: isActive ? 1 : 0.6, transition: 'opacity 0.2s' }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isActive ? theme.textMain : theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: theme.textMuted, marginTop: 2, fontWeight: 500 }}>{fav.mockup.frames.length} {isTR ? 'çerçeve' : 'frames'}</p>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); removeFav(fav.favId); }}
                          className="opacity-0 group-hover:opacity-100"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, transition: 'color 0.2s, opacity 0.2s', display: 'flex' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Manual Upload Fallback */}
              <div style={{ marginTop: 20 }}>
                <DropZone onFiles={handleMockupUpload} label={isTR ? 'Kendi şablonunuzu yükleyin' : 'Upload custom template'} multiple={false} minHeight={80} disabled={mockups.length >= MAX_MOCKUPS} />
              </div>
            </div>

          </div>

          {/* Sticky Generate Section */}
          <div style={{
            padding: 24, background: theme.surface, borderTop: `1px solid ${theme.border}`,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.02)', zIndex: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>
                {artImages.length} {isTR ? 'Sanat' : 'Art'} × {mockups.filter((m) => m.frames.length > 0).length} {isTR ? 'Şablon' : 'Tpl'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.textMain }}>
                {allCombinations.length} {isTR ? 'Kombinasyon' : 'Combos'}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isExhausted}
              style={{
                width: '100%', height: 52, borderRadius: 12,
                fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', fontFamily: theme.fontFamily,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: canGenerate && !isExhausted ? theme.accent : '#F3F4F6',
                color: canGenerate && !isExhausted ? '#fff' : '#9CA3AF',
                border: 'none', cursor: canGenerate && !isExhausted ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: canGenerate && !isExhausted ? '0 4px 14px rgba(249, 115, 22, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => { if (canGenerate && !isExhausted) { e.currentTarget.style.background = theme.accentHover; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={(e) => { if (canGenerate && !isExhausted) { e.currentTarget.style.background = theme.accent; e.currentTarget.style.transform = 'none'; } }}
              onMouseDown={(e) => { if (canGenerate && !isExhausted) e.currentTarget.style.transform = 'translateY(1px)'; }}
              onMouseUp={(e) => { if (canGenerate && !isExhausted) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            >
              {isGenerating ? (
                <><span style={{ width: 16, height: 16, display: 'inline-block', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> {isTR ? 'Oluşturuluyor...' : 'Generating...'}</>
              ) : isExhausted ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {isTR ? 'Tamamlandı' : 'Completed'}</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> {results.length === 0 ? (isTR ? 'Oluştur' : 'Generate') : (isTR ? `Devam Et (${remainingCount})` : `Generate More (${remainingCount})`)}</>
              )}
            </button>

            {!isExhausted && (
              <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: 12, color: limitReached ? '#EF4444' : theme.textMuted, fontWeight: 500 }}>
                {limitReached ? (isTR ? 'Limit doldu.' : 'Limit reached.') : (DAILY_LIMIT ? (isTR ? `${generatesRemaining} ücretsiz hak kaldı` : `${generatesRemaining} free left`) : (isTR ? 'Sınırsız Plan' : 'Unlimited Plan'))}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT MAIN CANVAS AREA ───────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%', overflowY: 'auto', padding: isMobile ? 16 : 40 }}>

          {/* Active Templates Tab Bar */}
          {mockups.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 24, borderBottom: `1px solid ${theme.border}` }}>
              {mockups.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMockupId(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 99,
                    fontSize: 14, fontWeight: 600, fontFamily: theme.fontFamily,
                    background: m.id === activeMockupId ? theme.accent : theme.surface,
                    color: m.id === activeMockupId ? '#fff' : theme.textMuted,
                    border: `1px solid ${m.id === activeMockupId ? theme.accent : theme.border}`,
                    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    boxShadow: m.id === activeMockupId ? '0 2px 8px rgba(249, 115, 22, 0.2)' : 'none'
                  }}
                >
                  {m.name}
                  {m.frames.length > 0 && (
                    <span style={{ fontSize: 11, background: m.id === activeMockupId ? 'rgba(0,0,0,0.2)' : '#F3F4F6', color: m.id === activeMockupId ? '#fff' : theme.textMuted, padding: '2px 6px', borderRadius: 10 }}>
                      {m.frames.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Canvas Container */}
          <div style={{
            background: theme.surface, borderRadius: 20, border: `1px solid ${theme.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Editor Toolbar */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
              <div style={{ fontWeight: 600, color: theme.textMain }}>{isTR ? 'Çerçeve Düzenleyici' : 'Frame Editor'}</div>
              {activeMockup && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {activeMockup.frames.length > 0 && (
                    <button onClick={clearAllFrames} style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {isTR ? 'Temizle' : 'Clear all'}
                    </button>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: theme.textMuted }}>{isTR ? 'Tolerans' : 'Tolerance'}</span>
                    <input type="range" min={10} max={120} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} style={{ width: 100, accentColor: theme.accent }} />
                  </div>
                </div>
              )}
            </div>

            {/* The Editor */}
            <div style={{ padding: 24, minHeight: 500, display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
              {activeMockup ? (
                <MockupEditor key={activeMockup.id} mockupUrl={activeMockup.url} frames={activeMockup.frames} tolerance={tolerance} lang={lang} onAddFrame={handleAddFrame} onRemoveFrame={handleRemoveFrame} onUpdateFrame={handleUpdateFrame} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                  </div>
                  <p style={{ fontWeight: 500 }}>{isTR ? 'Düzenlemek için sol taraftan bir şablon seçin veya ekleyin.' : 'Select or add a template from the left to start editing.'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Results Area */}
          {results.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: theme.textMain, letterSpacing: '-0.02em' }}>
                  {isTR ? 'Sonuçlar' : 'Results'}
                </h2>
                <button onClick={handleClearResults} style={{ padding: '8px 16px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  {isTR ? 'Temizle' : 'Clear All'}
                </button>
              </div>
              <ResultsGrid results={results} lang={lang} plan={plan} />
            </div>
          )}

          <div style={{ flex: 1 }} />
          <p style={{ textAlign: 'center', margin: '40px 0 0', fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>
            MockPlacer · {isTR ? 'Tarayıcıda çalışır, sunucuya veri gitmez.' : 'Runs in browser, no server uploads.'}
          </p>
        </div>
      </div>

      {/* ── BROWSE LIBRARY MODAL ───────────────────────────────────────────── */}
      {libraryModalOpen && (
        <div
          onClick={() => setLibraryModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 800, maxHeight: '85vh', background: theme.surface, borderRadius: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: `1px solid ${theme.border}` }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.textMain }}>{isTR ? 'Kütüphane' : 'Browse Library'}</h2>
              <button onClick={() => setLibraryModalOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#E5E7EB'} onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
              {libraryCategories.length > 1 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                  {['all', ...libraryCategories].map((cat) => (
                    <button key={cat} onClick={() => setLibraryCategory(cat)} style={{ padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: libraryCategory === cat ? theme.textMain : '#F3F4F6', color: libraryCategory === cat ? '#fff' : theme.textMuted, transition: 'all 0.2s' }}>
                      {cat === 'all' ? (isTR ? 'Tümü' : 'All') : cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              )}

              {libraryLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: theme.textMuted, fontWeight: 500 }}>{isTR ? 'Yükleniyor...' : 'Loading...'}</div>
              ) : filteredLibraryTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: theme.textMuted, fontWeight: 500 }}>{isTR ? 'Şablon bulunamadı' : 'No templates found'}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                  {filteredLibraryTemplates.map((tpl) => {
                    const isSelected = libraryFavorites.some((f) => f.tplId === tpl.image);
                    return (
                      <div
                        key={tpl.id} onClick={() => addFromLibrary(tpl)} className="group"
                        style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${isSelected ? theme.accent : theme.border}`, boxShadow: isSelected ? '0 8px 24px rgba(249, 115, 22, 0.15)' : 'none', transition: 'all 0.2s', position: 'relative', background: theme.surface }}
                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = theme.accent; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isSelected ? theme.accent : theme.border; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tpl.image} alt={tpl.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                        <div style={{ padding: '12px 16px', background: theme.surface }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: theme.textMain, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.name}</p>
                        </div>
                        {tpl.frames.length > 0 && <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>{tpl.frames.length}f</div>}
                        {isSelected && <div style={{ position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5,6 5,8.5 9.5,3.5" /></svg></div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 300, pointerEvents: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: theme.fontFamily, padding: '12px 24px', borderRadius: 99, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', animation: 'fadeUp 0.2s ease' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Micro-components ─────────────────────────────────────────────────────────
function NavStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: accent ? theme.accent : theme.textMain }}>{value}</span>
    </div>
  );
}
