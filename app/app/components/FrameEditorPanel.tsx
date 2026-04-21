'use client';

import MockupEditor from '@/app/components/MockupEditor';
import ResultsGrid from '@/app/components/ResultsGrid';
import { MockupTemplate, Frame, GeneratedResult } from '@/app/utils/types';
import { theme } from './ui/editorTheme';

interface FrameEditorPanelProps {
  mockups: MockupTemplate[];
  activeMockupId: string | null;
  activeMockup: MockupTemplate | null;
  tolerance: number;
  results: GeneratedResult[];
  lang: 'tr' | 'en';
  plan: 'free' | 'basic' | 'pro';
  isTR: boolean;
  isMobile: boolean;
  setActiveMockupId: (id: string) => void;
  setTolerance: (v: number) => void;
  clearAllFrames: () => void;
  handleAddFrame: (frameData: Omit<Frame, 'id' | 'color'>) => void;
  handleRemoveFrame: (frameId: string) => void;
  handleUpdateFrame: (frameId: string, changes: Partial<Pick<Frame, 'x' | 'y' | 'w' | 'h'>>) => void;
  handleClearResults: () => void;
}

export default function FrameEditorPanel({
  mockups, activeMockupId, activeMockup, tolerance, results, lang, plan, isTR, isMobile,
  setActiveMockupId, setTolerance, clearAllFrames,
  handleAddFrame, handleRemoveFrame, handleUpdateFrame, handleClearResults,
}: FrameEditorPanelProps) {
  return (
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
                boxShadow: m.id === activeMockupId ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 3px 0 #c2410c, 0 4px 0 rgba(194,65,12,0.22), 0 6px 14px rgba(249,115,22,0.18)' : '0 2px 0 rgba(0,0,0,0.08), 0 3px 8px rgba(0,0,0,0.04)',
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
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Editor Toolbar */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
          <div style={{ fontFamily: theme.fontFamily, fontSize: 22, fontWeight: 800, color: theme.textMain, letterSpacing: '-0.02em' }}>
            {isTR ? 'Çerçeve Düzenleyici' : 'Frame Editor'}
          </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <p style={{ fontWeight: 500 }}>
                {isTR ? 'Düzenlemek için sol taraftan bir şablon seçin veya ekleyin.' : 'Select or add a template from the left to start editing.'}
              </p>
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
            <button
              onClick={handleClearResults}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', border: 'none', fontWeight: 700, fontFamily: theme.fontFamily, cursor: 'pointer', fontSize: 13, boxShadow: '0 2px 0 rgba(220,38,38,0.28), 0 4px 10px rgba(220,38,38,0.10)', transform: 'translateY(0)', transition: 'transform 0.1s, box-shadow 0.1s' }}
            >
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
  );
}
