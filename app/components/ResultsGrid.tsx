'use client';

import { useState } from 'react';
import { GeneratedResult } from '@/app/utils/types';

interface Props {
  results: GeneratedResult[];
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export default function ResultsGrid({ results }: Props) {
  const [downloadingAll, setDownloadingAll] = useState(false);

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

  if (results.length === 0) return null;

  return (
    <section className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Section header decoration */}
          <div className="flex flex-col gap-0.5">
            <div className="w-6 h-px" style={{ background: 'var(--accent)' }} />
            <div className="w-3 h-px" style={{ background: 'var(--border-2)' }} />
          </div>
          <h2 className="font-display text-2xl tracking-wider" style={{ color: 'var(--text)' }}>
            RESULTS
          </h2>
          <span
            className="font-mono text-xs px-2 py-0.5 rounded-sm"
            style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}
          >
            {results.length}
          </span>
        </div>

        <button
          onClick={handleDownloadAll}
          disabled={downloadingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all"
          style={{
            background: downloadingAll ? 'var(--surface-3)' : 'var(--surface-2)',
            border: '1px solid var(--border-2)',
            color: downloadingAll ? 'var(--text-2)' : 'var(--text)',
            cursor: downloadingAll ? 'not-allowed' : 'pointer',
          }}
        >
          {downloadingAll ? (
            <>
              <span
                className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin inline-block"
                style={{ borderColor: 'var(--text-2)', borderTopColor: 'transparent' }}
              />
              Downloading…
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
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
              Download All
            </>
          )}
        </button>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
      >
        {results.map((result, i) => (
          <ResultCard key={result.id} result={result} index={i} />
        ))}
      </div>
    </section>
  );
}

function ResultCard({ result, index }: { result: GeneratedResult; index: number }) {
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
              color: '#080808',
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
            Download
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-xs font-medium truncate"
            style={{ color: 'var(--text)' }}
            title={result.mockupName}
          >
            {result.mockupName}
          </p>
          <p
            className="text-[10px] font-mono mt-0.5 truncate"
            style={{ color: 'var(--text-2)' }}
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
