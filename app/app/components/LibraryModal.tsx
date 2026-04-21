'use client';

import { theme, LibraryTemplateItem, LibraryFav } from './ui/editorTheme';

const FREE_TEMPLATES = ['mockup1', 'mockup2', 'mockup18'];

interface LibraryModalProps {
  open: boolean;
  loading: boolean;
  templates: LibraryTemplateItem[];
  categories: string[];
  category: string;
  favorites: LibraryFav[];
  plan: 'free' | 'basic' | 'pro';
  isTR: boolean;
  setOpen: (v: boolean) => void;
  setCategory: (v: string) => void;
  addFromLibrary: (tpl: LibraryTemplateItem) => void;
  setToast: (msg: string | null) => void;
}

export default function LibraryModal({
  open, loading, templates, categories, category, favorites, plan, isTR,
  setOpen, setCategory, addFromLibrary, setToast,
}: LibraryModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 800, maxHeight: '85vh', background: theme.surface, borderRadius: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: `1px solid ${theme.border}` }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.textMain, fontFamily: theme.fontFamily, letterSpacing: '-0.02em' }}>
            {isTR ? 'Kütüphane' : 'Browse Library'}
          </h2>
          <button
            onClick={() => setOpen(false)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, transition: 'background 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#E5E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#F3F4F6'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {['all', ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{ padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: category === cat ? theme.textMain : '#F3F4F6', color: category === cat ? '#fff' : theme.textMuted, transition: 'all 0.2s' }}
                >
                  {cat === 'all' ? (isTR ? 'Tümü' : 'All') : cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: theme.textMuted, fontWeight: 500 }}>
              {isTR ? 'Yükleniyor...' : 'Loading...'}
            </div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: theme.textMuted, fontWeight: 500 }}>
              {isTR ? 'Şablon bulunamadı' : 'No templates found'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
              {templates.map((tpl) => {
                const isSelected = favorites.some((f) => f.tplId === tpl.image);
                const isLocked = plan !== 'pro' && !FREE_TEMPLATES.includes(tpl.name);
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      if (isLocked) {
                        setToast(isTR ? 'Pro plana geç — tüm şablonlara eriş' : 'Upgrade to Pro to unlock all templates');
                        setTimeout(() => setToast(null), 3000);
                      } else {
                        addFromLibrary(tpl);
                      }
                    }}
                    className="group"
                    style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${isSelected ? theme.accent : theme.border}`, boxShadow: isSelected ? '0 8px 24px rgba(249, 115, 22, 0.15)' : 'none', transition: 'all 0.2s', position: 'relative', background: theme.surface }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = theme.accent; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = isSelected ? theme.accent : theme.border; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tpl.image} alt={tpl.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '12px 16px', background: theme.surface }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: theme.textMain, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tpl.image.split('/').pop() || tpl.name}
                      </p>
                    </div>
                    {tpl.frames.length > 0 && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>
                        {tpl.frames.length}f
                      </div>
                    )}
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2.5,6 5,8.5 9.5,3.5" />
                        </svg>
                      </div>
                    )}
                    {isLocked && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
                        <span style={{ fontSize: 24 }}>🔒</span>
                        <span style={{ background: '#FF6B35', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>Pro</span>
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
  );
}
