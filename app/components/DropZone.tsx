'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  minHeight?: number;
}

export default function DropZone({
  onFiles,
  accept = 'image/*',
  multiple = true,
  label,
  sublabel,
  disabled = false,
  minHeight = 200,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;
      const filtered = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (filtered.length > 0) onFiles(filtered);
    },
    [onFiles, disabled]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '24px 20px',
        borderRadius: 10,
        border: `1.5px dashed ${isDragging ? '#FF6B35' : '#E5E5E5'}`,
        background: isDragging ? 'rgba(255,107,53,0.08)' : 'var(--surface-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'border-color 0.2s, background 0.2s',
        userSelect: 'none',
      }}
    >
      {/* Upload icon */}
      <div
        style={{
          width: 48, height: 48, borderRadius: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isDragging ? 'rgba(255,107,53,0.15)' : 'var(--surface-3)',
          transition: 'background 0.2s',
        }}
      >
        <svg
          width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke={isDragging ? 'var(--accent)' : 'var(--text-2)'}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 500, color: isDragging ? 'var(--accent)' : 'var(--text)', margin: 0 }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
            {sublabel}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
