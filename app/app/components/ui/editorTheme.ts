import React from 'react';
import { MockupTemplate } from '@/app/utils/types';

export const FRAME_COLORS = [
  'rgba(249, 115, 22, 0.50)', // Tailwind Orange 500
  'rgba(56, 189, 248, 0.50)', // Sky 400
  'rgba(74, 222, 128, 0.50)', // Green 400
  'rgba(167, 139, 250, 0.50)', // Violet 400
  'rgba(244, 114, 182, 0.50)', // Pink 400
  'rgba(250, 204, 21, 0.50)', // Yellow 400
];

export const theme = {
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  accent: '#F97316',
  accentHover: '#EA580C',
  textMain: '#111827',
  textMuted: '#6B7280',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export interface LibraryTemplateItem {
  id: number;
  name: string;
  category: string;
  image: string;
  frames: { x: number; y: number; w: number; h: number; cornerRadius: number }[];
}

export interface LibraryFav {
  favId: string;
  tplId: string;
  name: string;
  image: string;
  mockup: MockupTemplate;
  checked: boolean;
}

export function Divider() {
  return React.createElement('div', { style: { height: 1, background: '#E5E7EB', margin: '4px 0' } });
}

export function SectionLabel({ children, badge, action }: { children: React.ReactNode; badge?: number; action?: React.ReactNode }) {
  return React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      React.createElement('h3', {
        style: {
          fontFamily: theme.fontFamily,
          fontSize: 22,
          fontWeight: 800,
          color: theme.textMain,
          margin: 0,
          letterSpacing: '-0.02em',
        },
      }, children),
      badge !== undefined && React.createElement(
        'span',
        {
          style: {
            fontSize: 12, fontWeight: 600, fontFamily: theme.fontFamily,
            padding: '2px 8px', borderRadius: 99,
            background: badge > 0 ? 'rgba(249, 115, 22, 0.1)' : '#F3F4F6',
            color: badge > 0 ? theme.accent : theme.textMuted,
          },
        },
        badge,
      ),
    ),
    action && React.createElement('div', null, action),
  );
}

export function AssetThumb({
  url, name, onRemove, isActive, onClick, badge, isMobile,
}: {
  url: string; name: string; onRemove: () => void;
  isActive?: boolean; onClick?: () => void; badge?: string; isMobile?: boolean;
}) {
  return React.createElement(
    'div',
    {
      onClick,
      className: 'group relative',
      style: {
        width: 72, height: 72, flexShrink: 0,
        borderRadius: 12, overflow: 'hidden',
        border: `2px solid ${isActive ? theme.accent : theme.border}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isActive ? '0 4px 12px rgba(249, 115, 22, 0.2)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#fff',
      },
    },
    React.createElement('img', { src: url, alt: name, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }),
    React.createElement('div', {
      style: {
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)',
        opacity: isActive ? 1 : 0, transition: 'opacity 0.2s',
      },
      className: 'group-hover:opacity-100',
    }),
    React.createElement(
      'button',
      {
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onRemove(); },
        title: 'Remove',
        className: isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity',
        style: {
          position: 'absolute', top: 4, right: 4,
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2, color: '#EF4444',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
      React.createElement(
        'svg',
        { width: 10, height: 10, viewBox: '0 0 10 10', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' },
        React.createElement('line', { x1: 1, y1: 1, x2: 9, y2: 9 }),
        React.createElement('line', { x1: 9, y1: 1, x2: 1, y2: 9 }),
      ),
    ),
    badge && React.createElement(
      'div',
      {
        className: 'absolute bottom-1 right-1',
        style: { background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, backdropFilter: 'blur(4px)' },
      },
      badge,
    ),
  );
}

export function NavStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
    React.createElement('span', { style: { fontSize: 16, color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' } }, label),
    React.createElement('span', { style: { fontSize: 26, fontWeight: 800, color: accent ? theme.accent : theme.textMain } }, value),
  );
}
