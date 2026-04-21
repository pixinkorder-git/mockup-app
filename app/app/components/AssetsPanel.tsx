'use client';

import DropZone from '@/app/components/DropZone';
import { ArtImage, MockupTemplate } from '@/app/utils/types';
import { theme, SectionLabel, Divider, AssetThumb } from './ui/editorTheme';

const MAX_ART = 6;
const MAX_MOCKUPS = 6;

interface AssetsPanelProps {
  artImages: ArtImage[];
  mockups: MockupTemplate[];
  activeMockupId: string | null;
  allCombinationsCount: number;
  results: { id: string }[];
  remainingCount: number;
  isGenerating: boolean;
  isExhausted: boolean;
  canGenerate: boolean;
  limitReached: boolean;
  generatesRemaining: number | null;
  dailyLimit: number | null;
  isMobile: boolean;
  isTR: boolean;
  handleArtUpload: (files: File[]) => void;
  removeArt: (id: string) => void;
  handleMockupUpload: (files: File[]) => void;
  removeMockup: (id: string) => void;
  handleGenerate: () => void;
  setLibraryModalOpen: (v: boolean) => void;
  setActiveMockupId: (id: string) => void;
}

export default function AssetsPanel({
  artImages, mockups, activeMockupId, allCombinationsCount, results, remainingCount,
  isGenerating, isExhausted, canGenerate, limitReached, generatesRemaining, dailyLimit,
  isMobile, isTR,
  handleArtUpload, removeArt, handleMockupUpload, removeMockup,
  handleGenerate, setLibraryModalOpen, setActiveMockupId,
}: AssetsPanelProps) {
  const mockedWithFrames = mockups.filter((m) => m.frames.length > 0).length;

  return (
    <div style={{
      width: isMobile ? '100%' : 320,
      height: isMobile ? 'auto' : '100%',
      display: 'flex', flexDirection: 'column',
      background: theme.bg,
      borderRight: isMobile ? 'none' : `1px solid ${theme.border}`,
      borderBottom: isMobile ? `1px solid ${theme.border}` : 'none',
      padding: 16, gap: 12,
    }}>

      {/* Content card */}
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

          {/* Mockup Templates */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <SectionLabel badge={mockups.length}>
              {isTR ? 'Mockup Şablonları' : 'Mockup Templates'}
            </SectionLabel>
            <DropZone onFiles={handleMockupUpload} label={isTR ? 'Kendi şablonunuzu yükleyin' : 'Upload custom template'} sublabel={isTR ? 'Açık/beyaz çerçeve alanları' : 'Light/white frame areas'} multiple={false} minHeight={120} disabled={mockups.length >= MAX_MOCKUPS} />

            {/* Browse Library button */}
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

      {/* Generate block */}
      <div style={{ background: theme.surface, borderRadius: 16, border: `1px solid ${theme.border}`, padding: '20px 16px', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        {/* Big stats */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: artImages.length > 0 ? theme.textMain : '#D1D5DB', fontFamily: theme.fontFamily, lineHeight: 1, transition: 'color 0.3s' }}>{artImages.length}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{isTR ? 'Sanat' : 'Art'}</div>
          </div>
          <div style={{ fontSize: 26, color: '#D1D5DB', fontWeight: 300, paddingBottom: 22, lineHeight: 1 }}>×</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: mockedWithFrames > 0 ? theme.textMain : '#D1D5DB', fontFamily: theme.fontFamily, lineHeight: 1, transition: 'color 0.3s' }}>{mockedWithFrames}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{isTR ? 'Şablon' : 'Tpl'}</div>
          </div>
          <div style={{ fontSize: 26, color: '#D1D5DB', fontWeight: 300, paddingBottom: 22, lineHeight: 1 }}>=</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: allCombinationsCount > 0 ? theme.accent : '#D1D5DB', fontFamily: theme.fontFamily, lineHeight: 1, transition: 'color 0.3s' }}>{allCombinationsCount}</div>
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
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> {isTR ? 'Tamamlandı' : 'Completed'}</>
          ) : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg> {results.length === 0 ? (isTR ? 'Oluştur' : 'Generate') : (isTR ? `Devam Et (${remainingCount})` : `Generate More (${remainingCount})`)}</>
          )}
        </button>

        {!isExhausted && (
          <p style={{ textAlign: 'center', margin: '10px 0 0', fontSize: 12, color: limitReached ? '#EF4444' : theme.textMuted, fontWeight: 500 }}>
            {limitReached
              ? (isTR ? 'Limit doldu.' : 'Limit reached.')
              : (dailyLimit
                ? (isTR ? `${generatesRemaining} ücretsiz hak kaldı` : `${generatesRemaining} free left`)
                : (isTR ? 'Sınırsız Plan' : 'Unlimited Plan'))}
          </p>
        )}
      </div>
    </div>
  );
}
