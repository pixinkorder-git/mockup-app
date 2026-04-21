'use client';

import { theme, SectionLabel, LibraryFav } from './ui/editorTheme';

interface MyTemplatesPanelProps {
  libraryFavorites: LibraryFav[];
  isTR: boolean;
  isMobile: boolean;
  toggleFav: (favId: string) => void;
  removeFav: (favId: string) => void;
}

export default function MyTemplatesPanel({ libraryFavorites, isTR, isMobile, toggleFav, removeFav }: MyTemplatesPanelProps) {
  return (
    <div style={{
      width: isMobile ? '100%' : 300,
      height: isMobile ? 'auto' : '100%',
      background: theme.bg,
      borderRight: isMobile ? 'none' : `1px solid ${theme.border}`,
      borderBottom: isMobile ? `1px solid ${theme.border}` : 'none',
      display: 'flex', flexDirection: 'column',
      padding: 16,
    }}>
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

                    {/* Tick overlay — always visible */}
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
                        <polyline points="2.5,6 5,8.5 9.5,3.5" stroke={isActive ? '#fff' : '#9CA3AF'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
  );
}
