'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import DropZone from '@/app/components/DropZone';
import MockupEditor from '@/app/components/MockupEditor';
import ResultsGrid from '@/app/components/ResultsGrid';
import { ArtImage, MockupTemplate, Frame, GeneratedResult } from '@/app/utils/types';
import { computeCombinations, orderCombinations, generateBatch } from '@/app/utils/compositor';
import { theme, FRAME_COLORS, Divider, SectionLabel, AssetThumb, LibraryTemplateItem, LibraryFav } from './components/ui/editorTheme';
import LibraryModal from './components/LibraryModal';
import AppHeader, { NAV_H } from './components/AppHeader';

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
        <div style={{
          width: isMobile ? '100%' : 300,
          height: isMobile ? 'auto' : '100%',
          background: theme.bg,
          borderRight: isMobile ? 'none' : `1px solid ${theme.border}`,
          borderBottom: isMobile ? `1px solid ${theme.border}` : 'none',
          display: 'flex', flexDirection: 'column',
          padding: 16,
        }}>
          {/* Card — same rounded style as Frame Editor */}
          <div style={{
            flex: 1, background: theme.surface, borderRadius: 20, border: `1px solid ${theme.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <SectionLabel badge={libraryFavorites.length}>
                {isTR ? 'Kayıtlı Şablonlar' : 'My Templates'}
              </SectionLabel>

              {libraryFavorites.length === 0 ? (
                <div style={{ padding: '28px 16px', borderRadius: 12, border: '2px dashed #E5E7EB', background: '#FAFAFA', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                    {isTR ? 'Kütüphaneden şablon ekleyin.' : 'Add templates from the library.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {libraryFavorites.map((fav) => {
                    const isActive = fav.checked;
                    return (
                      <div
                        key={fav.favId}
                        onClick={() => toggleFav(fav.favId)}
                        className="group"
                        style={{
                          position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                          cursor: 'pointer',
                          border: `2px solid ${isActive ? '#F97316' : '#E5E7EB'}`,
                          boxShadow: isActive ? '0 2px 10px rgba(249, 115, 22, 0.22)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fav.image} alt={fav.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isActive ? 1 : 0.55, transition: 'opacity 0.2s' }} />

                        {/* Tik overlay — always visible */}
                        <div style={{
                          position: 'absolute', top: 5, left: 5,
                          width: 20, height: 20, borderRadius: '50%',
                          background: isActive ? '#F97316' : 'rgba(255,255,255,0.88)',
                          border: `2px solid ${isActive ? '#F97316' : '#C9CDD4'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <polyline points="2.5,6 5,8.5 9.5,3.5" stroke={isActive ? '#fff' : '#9CA3AF'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>

                        {/* X button — hover only */}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFav(fav.favId); }}
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            position: 'absolute', top: 5, right: 5,
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#EF4444', transition: 'opacity 0.2s',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COL 2: Art Images + Mockup Templates + Generate ──────────────── */}
        <div style={{
          width: isMobile ? '100%' : 320,
          height: isMobile ? 'auto' : '100%',
          display: 'flex', flexDirection: 'column',
          background: theme.bg,
          borderRight: isMobile ? 'none' : `1px solid ${theme.border}`,
          borderBottom: isMobile ? `1px solid ${theme.border}` : 'none',
          padding: 16, gap: 12,
        }}>

          {/* Content card — same rounded style as Frame Editor */}
          <div style={{
            flex: 1, background: theme.surface, borderRadius: 20, border: `1px solid ${theme.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Art Images */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionLabel badge={artImages.length}>{isTR ? 'Sanat Görselleri' : 'Art Images'}</SectionLabel>
                <DropZone onFiles={handleArtUpload} label={isTR ? 'Görselleri sürükleyin' : 'Drop artwork here'} sublabel="PNG · JPG · WEBP" multiple disabled={artImages.length >= MAX_ART} minHeight={120} />
                {artImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                    {artImages.map((art) => (
                      <AssetThumb key={art.id} url={art.url} name={art.name} onRemove={() => removeArt(art.id)} isMobile={isMobile} />
                    ))}
                  </div>
                )}
              </div>

              <Divider />

              {/* Mockup Templates — manual uploads + active library ones */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionLabel badge={mockups.length}>
                  {isTR ? 'Mockup Şablonları' : 'Mockup Templates'}
                </SectionLabel>
                <DropZone onFiles={handleMockupUpload} label={isTR ? 'Kendi şablonunuzu yükleyin' : 'Upload custom template'} sublabel={isTR ? 'Açık/beyaz çerçeve alanları' : 'Light/white frame areas'} multiple={false} minHeight={120} disabled={mockups.length >= MAX_MOCKUPS} />

                {/* Mockup Library button */}
                <button
                  onClick={() => setLibraryModalOpen(true)}
                  style={{
                    width: '100%', marginTop: 10, padding: '11px 16px',
                    background: 'rgba(249, 115, 22, 0.07)',
                    color: '#F97316', border: '1.5px dashed rgba(249, 115, 22, 0.35)',
                    borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.13)'; e.currentTarget.style.borderColor = '#F97316'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.07)'; e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.35)'; }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  {isTR ? 'Kütüphaneden Şablon Ekle' : 'Browse Mockup Library'}
                </button>

                {mockups.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                    {mockups.map((m) => (
                      <AssetThumb key={m.id} url={m.url} name={m.name} onRemove={() => removeMockup(m.id)} isActive={m.id === activeMockupId} onClick={() => setActiveMockupId(m.id)} badge={m.frames.length > 0 ? `${m.frames.length}f` : undefined} isMobile={isMobile} />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Generate block — below content card, with big stats + 3D button */}
          <div style={{ background: theme.surface, borderRadius: 16, border: `1px solid ${theme.border}`, padding: '20px 16px', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            {/* Big stats */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 44, fontWeight: 800, color: artImages.length > 0 ? theme.textMain : '#D1D5DB', fontFamily: theme.fontFamily, lineHeight: 1, transition: 'color 0.3s' }}>{artImages.length}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{isTR ? 'Sanat' : 'Art'}</div>
              </div>
              <div style={{ fontSize: 26, color: '#D1D5DB', fontWeight: 300, paddingBottom: 22, lineHeight: 1 }}>×</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 44, fontWeight: 800, color: mockups.filter(m => m.frames.length > 0).length > 0 ? theme.textMain : '#D1D5DB', fontFamily: theme.fontFamily, lineHeight: 1, transition: 'color 0.3s' }}>{mockups.filter(m => m.frames.length > 0).length}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{isTR ? 'Şablon' : 'Tpl'}</div>
              </div>
              <div style={{ fontSize: 26, color: '#D1D5DB', fontWeight: 300, paddingBottom: 22, lineHeight: 1 }}>=</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 44, fontWeight: 800, color: allCombinations.length > 0 ? theme.accent : '#D1D5DB', fontFamily: theme.fontFamily, lineHeight: 1, transition: 'color 0.3s' }}>{allCombinations.length}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{isTR ? 'Kombo' : 'Combos'}</div>
              </div>
            </div>

            {/* 3D Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isExhausted}
              style={{
                width: '100%', height: 52, borderRadius: 12,
                fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', fontFamily: theme.fontFamily,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: canGenerate && !isExhausted ? 'linear-gradient(to bottom, #fb923c 0%, #f97316 100%)' : '#F3F4F6',
                color: canGenerate && !isExhausted ? '#fff' : '#9CA3AF',
                border: 'none', cursor: canGenerate && !isExhausted ? 'pointer' : 'not-allowed',
                boxShadow: canGenerate && !isExhausted ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 5px 0 #c2410c, 0 6px 0 rgba(194,65,12,0.28), 0 10px 22px rgba(249,115,22,0.22)' : '0 3px 0 #D1D5DB, 0 5px 10px rgba(0,0,0,0.05)',
                transform: 'translateY(0)',
                transition: 'box-shadow 0.1s, transform 0.1s',
                position: 'relative',
              }}
              onMouseEnter={(e) => { if (canGenerate && !isExhausted) { e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 0 #c2410c, 0 4px 0 rgba(194,65,12,0.22), 0 7px 16px rgba(249,115,22,0.18)'; e.currentTarget.style.transform = 'translateY(2px)'; } }}
              onMouseLeave={(e) => { if (canGenerate && !isExhausted) { e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.18), 0 5px 0 #c2410c, 0 6px 0 rgba(194,65,12,0.28), 0 10px 22px rgba(249,115,22,0.22)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              onMouseDown={(e) => { if (canGenerate && !isExhausted) { e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0px 0 #c2410c, 0 2px 8px rgba(249,115,22,0.12)'; e.currentTarget.style.transform = 'translateY(5px)'; } }}
              onMouseUp={(e) => { if (canGenerate && !isExhausted) { e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 0 #c2410c, 0 4px 0 rgba(194,65,12,0.22), 0 7px 16px rgba(249,115,22,0.18)'; e.currentTarget.style.transform = 'translateY(2px)'; } }}
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
              <p style={{ textAlign: 'center', margin: '10px 0 0', fontSize: 12, color: limitReached ? '#EF4444' : theme.textMuted, fontWeight: 500 }}>
                {limitReached ? (isTR ? 'Limit doldu.' : 'Limit reached.') : (DAILY_LIMIT ? (isTR ? `${generatesRemaining} ücretsiz hak kaldı` : `${generatesRemaining} free left`) : (isTR ? 'Sınırsız Plan' : 'Unlimited Plan'))}
              </p>
            )}
          </div>
        </div>

        {/* ── COL 3: Frame Editor + Results ───────────────────────────────────── */}
        <div style={{ flex: 1, height: isMobile ? 'auto' : '100%', overflowY: 'auto', background: theme.bg, padding: isMobile ? 16 : 32 }}>

          {/* Active Templates Tab Bar */}
          {mockups.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 24, borderBottom: `1px solid ${theme.border}` }}>
              {mockups.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMockupId(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 99,
                    fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily,
                    background: m.id === activeMockupId ? 'linear-gradient(to bottom, #fb923c 0%, #f97316 100%)' : theme.surface,
                    color: m.id === activeMockupId ? '#fff' : theme.textMuted,
                    border: `1px solid ${m.id === activeMockupId ? theme.accent : theme.border}`,
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    boxShadow: m.id === activeMockupId ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 0 #c2410c, 0 4px 0 rgba(194,65,12,0.22), 0 6px 14px rgba(249,115,22,0.18)' : '0 2px 0 rgba(0,0,0,0.08), 0 3px 8px rgba(0,0,0,0.04)'
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

          {/* Frame Editor Card */}
          <div style={{
            background: theme.surface, borderRadius: 20, border: `1px solid ${theme.border}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Editor Toolbar */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
              <div style={{ fontFamily: theme.fontFamily, fontSize: 22, fontWeight: 800, color: theme.textMain, letterSpacing: '-0.02em' }}>{isTR ? 'Çerçeve Düzenleyici' : 'Frame Editor'}</div>
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
            <div style={{ padding: 16, minHeight: 380, display: 'flex', justifyContent: 'center', background: '#f5f5f5' }}>
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
            <div style={{ marginTop: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.textMain, letterSpacing: '-0.02em', fontFamily: theme.fontFamily }}>
                  {isTR ? 'Sonuçlar' : 'Results'}
                </h2>
                <button onClick={handleClearResults} style={{ padding: '8px 16px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', border: 'none', fontWeight: 700, fontFamily: theme.fontFamily, cursor: 'pointer', fontSize: 13, boxShadow: '0 2px 0 rgba(220,38,38,0.28), 0 4px 10px rgba(220,38,38,0.10)', transform: 'translateY(0)', transition: 'transform 0.1s, box-shadow 0.1s' }}>
                  {isTR ? 'Temizle' : 'Clear All'}
                </button>
              </div>
              <ResultsGrid results={results} lang={lang} plan={plan} />
            </div>
          )}

          <p style={{ textAlign: 'center', margin: '40px 0 0', fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>
            MockPlacer · {isTR ? 'Tarayıcıda çalışır, sunucuya veri gitmez.' : 'Runs in browser, no server uploads.'}
          </p>
        </div>
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

