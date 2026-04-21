'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArtImage, MockupTemplate, Frame, GeneratedResult } from '@/app/utils/types';
import { computeCombinations, orderCombinations, generateBatch } from '@/app/utils/compositor';
import { theme, FRAME_COLORS, LibraryTemplateItem, LibraryFav } from './components/ui/editorTheme';
import LibraryModal from './components/LibraryModal';
import AppHeader, { NAV_H } from './components/AppHeader';
import MyTemplatesPanel from './components/MyTemplatesPanel';
import AssetsPanel from './components/AssetsPanel';
import FrameEditorPanel from './components/FrameEditorPanel';

const BATCH_SIZE = 36;
const MAX_ART = 6;
const MAX_MOCKUPS = 6;

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

    const applyProfile = async (authUser: { id: string; email?: string; user_metadata?: Record<string, string> }) => {
      const base = {
        id: authUser.id, email: authUser.email,
        name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? undefined,
        avatar: authUser.user_metadata?.avatar_url ?? undefined,
      };
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', authUser.id)
          .single();
        // profiles.avatar_url (user-uploaded) takes priority over OAuth metadata
        if (profile?.avatar_url) base.avatar = profile.avatar_url;
        if (profile?.display_name) base.name = profile.display_name;
      } catch { /* profile row may not exist */ }
      setUser(base);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) applyProfile(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) applyProfile(session.user);
      else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isTR = lang === 'tr';

  const FREE_TEMPLATES = ['mockup1', 'mockup2', 'mockup18'];
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
    const fileName = tpl.image.split('/').pop() || tpl.name;
    const newMockup: MockupTemplate = {
      id: mockupId, name: fileName, url: tpl.image,
      frames: tpl.frames.map((f, i) => ({
        id: genId(), color: FRAME_COLORS[i % FRAME_COLORS.length],
        x: f.x * imgW, y: f.y * imgH, w: f.w * imgW, h: f.h * imgH, cornerRadius: f.cornerRadius,
      })),
    };
    const newFav: LibraryFav = { favId: genId(), tplId: tpl.image, name: fileName, image: tpl.image, mockup: newMockup, checked: false };
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
      <AppHeader
        artCount={artImages.length}
        mockupCount={mockups.length}
        resultCount={results.length}
        user={user}
        plan={plan}
        lang={lang}
        isTR={isTR}
        onSignOut={() => setUser(null)}
      />

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: `calc(100vh - ${NAV_H}px)` }}>

        {/* ── COL 1: My Templates (Library Favorites) ──────────────────────── */}
        <MyTemplatesPanel
          libraryFavorites={libraryFavorites}
          isTR={isTR}
          isMobile={isMobile}
          toggleFav={toggleFav}
          removeFav={removeFav}
        />

        {/* ── COL 2: Art Images + Mockup Templates + Generate ──────────────── */}
        <AssetsPanel
          artImages={artImages}
          mockups={mockups}
          activeMockupId={activeMockupId}
          allCombinationsCount={allCombinations.length}
          results={results}
          remainingCount={remainingCount}
          isGenerating={isGenerating}
          isExhausted={isExhausted}
          canGenerate={canGenerate}
          limitReached={limitReached}
          generatesRemaining={generatesRemaining}
          dailyLimit={DAILY_LIMIT}
          isMobile={isMobile}
          isTR={isTR}
          handleArtUpload={handleArtUpload}
          removeArt={removeArt}
          handleMockupUpload={handleMockupUpload}
          removeMockup={removeMockup}
          handleGenerate={handleGenerate}
          setLibraryModalOpen={setLibraryModalOpen}
          setActiveMockupId={setActiveMockupId}
        />

        {/* ── COL 3: Frame Editor + Results ───────────────────────────────────── */}
        <FrameEditorPanel
          mockups={mockups}
          activeMockupId={activeMockupId}
          activeMockup={activeMockup}
          tolerance={tolerance}
          results={results}
          lang={lang}
          plan={plan}
          isTR={isTR}
          isMobile={isMobile}
          setActiveMockupId={setActiveMockupId}
          setTolerance={setTolerance}
          clearAllFrames={clearAllFrames}
          handleAddFrame={handleAddFrame}
          handleRemoveFrame={handleRemoveFrame}
          handleUpdateFrame={handleUpdateFrame}
          handleClearResults={handleClearResults}
        />
      </div>

      {/* ── BROWSE LIBRARY MODAL ───────────────────────────────────────────── */}
      <LibraryModal
        open={libraryModalOpen}
        loading={libraryLoading}
        templates={filteredLibraryTemplates}
        categories={libraryCategories}
        category={libraryCategory}
        favorites={libraryFavorites}
        plan={plan}
        isTR={isTR}
        setOpen={setLibraryModalOpen}
        setCategory={setLibraryCategory}
        addFromLibrary={addFromLibrary}
        setToast={setToast}
      />

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 300, pointerEvents: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: theme.fontFamily, padding: '12px 24px', borderRadius: 99, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', animation: 'fadeUp 0.2s ease' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

