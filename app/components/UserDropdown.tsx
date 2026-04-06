'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

interface UserDropdownProps {
  user: { id?: string; email?: string; name?: string; avatar?: string };
  plan: 'free' | 'basic' | 'pro';
  lang?: 'tr' | 'en';
  onSignOut: () => void;
}

export default function UserDropdown({ user, plan, lang = 'en', onSignOut }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isTR = lang === 'tr';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const planLabel = plan === 'pro'
    ? 'Pro Plan'
    : plan === 'basic'
      ? 'Basic Plan'
      : (isTR ? 'Ücretsiz Plan' : 'Free Plan');
  const planColor  = plan === 'pro' ? '#FF6B35' : plan === 'basic' ? '#2A8FC2' : '#888';
  const planBg     = plan === 'pro' ? 'rgba(255,107,53,0.10)' : plan === 'basic' ? 'rgba(66,168,219,0.10)' : 'rgba(0,0,0,0.05)';
  const planBorder = plan === 'pro' ? 'rgba(255,107,53,0.25)' : plan === 'basic' ? 'rgba(66,168,219,0.25)' : 'rgba(0,0,0,0.10)';

  const initials = (user.name || user.email || '?')[0].toUpperCase();

  const Avatar = ({ size }: { size: number }) => user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontSize: size * 0.4, fontWeight: 700 }}>{initials}</span>
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <style>{`
        @keyframes mpDropdown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mp-dd-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 16px; font-size: 13px; text-decoration: none;
          transition: background 0.1s; cursor: pointer;
          background: transparent; border: none; width: 100%; text-align: left;
          font-family: inherit;
        }
        .mp-dd-item:hover { background: #FFF5F1 !important; }
      `}</style>

      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div style={{ borderRadius: '50%', border: open ? '2px solid #FF6B35' : '2px solid transparent', transition: 'border-color 0.15s', lineHeight: 0 }}>
          <Avatar size={28} />
        </div>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ color: '#888', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 240,
          background: '#fff',
          border: '1px solid #E5E5E5',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          zIndex: 500,
          overflow: 'hidden',
          animation: 'mpDropdown 0.15s ease',
        }}>

          {/* User info header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F0F0', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Avatar size={38} />
            <div style={{ minWidth: 0, flex: 1 }}>
              {user.name && (
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Clash Display', sans-serif" }}>
                  {user.name}
                </p>
              )}
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
              <span style={{
                display: 'inline-block',
                fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                padding: '1px 7px', borderRadius: 99,
                background: planBg, color: planColor, border: `1px solid ${planBorder}`,
              }}>
                {planLabel}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            <a href="/pricing" className="mp-dd-item" onClick={() => setOpen(false)} style={{ color: '#333' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
              {isTR ? 'Planım' : 'My Plan'}
            </a>
            <a href="https://mockplacer.lemonsqueezy.com/billing" target="_blank" rel="noopener noreferrer" className="mp-dd-item" onClick={() => setOpen(false)} style={{ color: '#333' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              {isTR ? 'Faturalama' : 'Billing'}
            </a>

            <div style={{ height: 1, background: '#F0F0F0', margin: '6px 0' }} />

            <button
              className="mp-dd-item"
              style={{ color: '#CC3300' }}
              onClick={async () => {
                setOpen(false);
                const supabase = createClient();
                await supabase.auth.signOut();
                onSignOut();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {isTR ? 'Çıkış Yap' : 'Sign Out'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
