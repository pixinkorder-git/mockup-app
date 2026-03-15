'use client';

import { useRef, useState, useCallback } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export default function DropZone({
  onFiles,
  accept = 'image/*',
  multiple = true,
  label,
  sublabel,
  disabled = false,
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
      className={[
        'relative flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed transition-all duration-200 cursor-pointer select-none',
        'py-8 px-6 min-h-[140px]',
        isDragging
          ? 'border-accent bg-[rgba(219,168,66,0.06)] scale-[1.01]'
          : 'border-border-2 hover:border-accent/40 hover:bg-surface-2',
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
      ].join(' ')}
    >
      {/* Upload icon */}
      <div
        className={[
          'w-10 h-10 rounded-sm flex items-center justify-center transition-colors',
          isDragging ? 'bg-accent/20' : 'bg-surface-3',
        ].join(' ')}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragging ? 'var(--accent)' : 'var(--text-2)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div className="text-center">
        <p
          className="text-sm font-medium"
          style={{ color: isDragging ? 'var(--accent)' : 'var(--text)' }}
        >
          {label}
        </p>
        {sublabel && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
            {sublabel}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
