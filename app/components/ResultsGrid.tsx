'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { GeneratedResult } from '@/app/utils/types';

interface Props {
  results: GeneratedResult[];
  lang?: 'tr' | 'en';
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

// Convert a data URL to a Uint8Array (base64 decode, no atob size limit issues)
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function ResultsGrid({ results, lang = 'en' }: Props) {
  const isTR = lang === 'tr';
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      downloadDataUrl(r.dataUrl, `mockup-${i + 1}-${r.mockupName.replace(/\s+/g, '_')}.jpg`);
      // Small delay to avoid browser blocking multiple downloads
      await new Promise((res) => setTimeout(res, 220));
    }
    setDownloadingAll(false);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const filename = `mockup-${i + 1}-${r.mockupName.replace(/\s+/g, '_')}.jpg`;
        zip.file(filename, dataUrlToBytes(r.dataUrl));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mockups.zip';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (results.length === 0) return null;

  const busy = downloadingAll || downloadingZip;

  return (
    <section className="animate-fade-up">
      <div
        className="flex mb-5"
        style={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          gap: isMobile ? 12 : 0,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Section header decoration */}
          <div className="flex flex-col gap-0.5">
            <div className="w-6 h-px" style={{ background: 'var(--accent)' }} />
            <div className="w-3 h-px" style={{ background: 'var(--border-2)' }} />
          </div>
          <h2 className="font-display tracking-wider" style={{ color: 'var(--text)', fontSize: 28 }}>
            {isTR ? 'SONUÇLAR' : 'RESULTS'}
          </h2>
          <span
            className="font-mono px-2 py-0.5 rounded-sm"
            style={{ background: 'var(--surface-3)', color: 'var(--text-2)', fontSize: 14 }}
          >
            {results.length}
          </span>
        </div>

        <div
          className="flex gap-2"
          style={{
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : undefined,
          }}
        >
          {/* Download ZIP */}
          <button
            onClick={handleDownloadZip}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-sm font-medium transition-all"
            style={{
              fontSize: 15,
              padding: '10px 20px',
              height: 44,
              width: isMobile ? '100%' : undefined,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              color: busy ? 'var(--text-2)' : 'var(--text)',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy && !downloadingZip ? 0.5 : 1,
            }}
          >
            {downloadingZip ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin inline-block"
                  style={{ borderColor: 'var(--text-2)', borderTopColor: 'transparent' }}
                />
                {isTR ? 'Sıkıştırılıyor…' : 'Zipping…'}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M9 7h3M9 11h3M9 15h3M12 7v2M12 11v2" />
                </svg>
                {isTR ? 'ZIP İndir' : 'Download ZIP'}
              </>
            )}
          </button>

          {/* Download All */}
          <button
            onClick={handleDownloadAll}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-sm font-medium transition-all"
            style={{
              fontSize: 15,
              padding: '10px 20px',
              height: 44,
              width: isMobile ? '100%' : undefined,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              color: busy ? 'var(--text-2)' : 'var(--text)',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy && !downloadingAll ? 0.5 : 1,
            }}
          >
            {downloadingAll ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin inline-block"
                  style={{ borderColor: 'var(--text-2)', borderTopColor: 'transparent' }}
                />
                {isTR ? 'İndiriliyor…' : 'Downloading…'}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {isTR ? 'Tümünü İndir' : 'Download All'}
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {results.map((result, i) => (
          <ResultCard key={result.id} result={result} index={i} isTR={isTR} />
        ))}
      </div>
    </section>
  );
}

function ResultCard({ result, index, isTR = false }: { result: GeneratedResult; index: number; isTR?: boolean }) {
  const [hovered, setHovered] = useState(false);

  const filename = `mockup-${index + 1}-${result.mockupName.replace(/\s+/g, '_')}.jpg`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-sm overflow-hidden group transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--border-2)' : 'var(--border)'}`,
        transform: hovered ? 'translateY(-2px)' : 'none',
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.dataUrl}
          alt={`Result ${index + 1}`}
          className="w-full h-full object-cover"
        />
        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
          style={{
            background: 'rgba(0,0,0,0.55)',
            opacity: hovered ? 1 : 0,
          }}
        >
          <button
            onClick={() => downloadDataUrl(result.dataUrl, filename)}
            className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-transform active:scale-95"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isTR ? 'İndir' : 'Download'}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className="font-medium truncate"
            style={{ color: 'var(--text)', fontSize: 14 }}
            title={result.mockupName}
          >
            {result.mockupName}
          </p>
          <p
            className="font-mono mt-1 truncate"
            style={{ fontSize: 12, color: 'var(--text-2)' }}
            title={result.artNames.join(', ')}
          >
            {result.artNames.join(' · ')}
          </p>
        </div>
        <button
          onClick={() => downloadDataUrl(result.dataUrl, filename)}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
          style={{
            background: hovered ? 'var(--surface-3)' : 'transparent',
            color: 'var(--text-2)',
          }}
          title="Download"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
