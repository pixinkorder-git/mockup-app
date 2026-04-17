'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';

interface MpUser {
  email?: string;
  name?: string | null;
  avatar?: string | null;
  plan?: string;
}

interface Props {
  initialUser: MpUser | null;
}

export default function LandingNavAuth({ initialUser }: Props) {
  const [user, setUser] = useState<MpUser | null>(initialUser);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<'tr' | 'en'>('en');
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Read language preference
  useEffect(() => {
    const stored = localStorage.getItem('mp-lang') as 'tr' | 'en' | null;
    if (stored === 'tr' || stored === 'en') setLang(stored);
    else if (navigator.language.startsWith('tr')) setLang('tr');
  }, []);

  // On every mount (hard load + soft navigation): clear the HTML-script-rendered
  // content, take ownership of #nav-auth-li, and re-check auth from the browser.
  useEffect(() => {
    const el = document.getElementById('nav-auth-li');
    if (el) el.innerHTML = '';
    setMounted(true);

    const supabase = createClient();
    // getSession() reads from storage without a network round-trip — fast enough
    // that there is no perceptible flash.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setUser(null);
        return;
      }
      const authUser = session.user;
      const base: MpUser = {
        email: authUser.email,
        name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        avatar: authUser.user_metadata?.avatar_url ?? null,
        plan: 'free',
      };
      // Pull display_name / avatar / plan from the profiles table
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, avatar_url, display_name')
          .eq('id', authUser.id)
          .single();
        if (profile?.plan === 'basic' || profile?.plan === 'pro') base.plan = profile.plan;
        if (profile?.display_name) base.name = profile.display_name;
        if (profile?.avatar_url) base.avatar = profile.avatar_url;
      } catch { /* profiles row may not exist yet */ }
      setUser(base);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!mounted) return null;

  const authLi = document.getElementById('nav-auth-li');
  if (!authLi) return null;

  const isTR = lang === 'tr';

  // ── Logged-out state ────────────────────────────────────────────────────────
  if (!user) {
    return createPortal(
      <a href="/login" className="nav-sign-in">
        {isTR ? 'Giriş Yap' : 'Sign In'}
      </a>,
      authLi
    );
  }

  // ── Logged-in state ─────────────────────────────────────────────────────────
  const plan = (user.plan || 'free') as 'free' | 'basic' | 'pro';
  const planLabel  = plan === 'pro' ? 'Pro Plan' : plan === 'basic' ? 'Basic Plan' : (isTR ? 'Ücretsiz Plan' : 'Free Plan');
  const planDetail = plan === 'pro'
    ? (isTR ? 'Sınırsız oluşturma' : 'Unlimited generates')
    : plan === 'basic'
      ? (isTR ? 'Günde 15 oluşturma' : '15 generates/day')
      : (isTR ? 'Günde 3 oluşturma' : '3 generates/day');
  const planColor  = plan === 'pro' ? '#FF6B35' : plan === 'basic' ? '#2A8FC2' : '#888';
  const planBg     = plan === 'pro' ? 'rgba(255,107,53,0.10)' : plan === 'basic' ? 'rgba(66,168,219,0.10)' : 'rgba(0,0,0,0.05)';
  const planBorder = plan === 'pro' ? 'rgba(255,107,53,0.25)' : plan === 'basic' ? 'rgba(66,168,219,0.25)' : 'rgba(0,0,0,0.10)';
  const initials   = ((user.name || user.email || '?')[0] ?? '?').toUpperCase();

  const handleShare = async () => {
    const url  = 'https://mockplacer.com';
    const text = isTR
      ? 'MockPlacer ile saniyeler içinde profesyonel mockuplar oluştur!'
      : 'Create professional mockups in seconds with MockPlacer!';
    if (navigator.share) {
      try { await navigator.share({ title: 'MockPlacer', text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Reuse the CSS classes defined in the landing HTML <style> block so the
  // visual output is pixel-identical to what the JS IIFE produced.
  return createPortal(
    <div className="nav-user" ref={ref}>
      <button
        className={`nav-user-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="User menu"
        aria-expanded={open}
      >
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} className="nav-user-avatar" alt="" />
        ) : (
          <div style={{ width: 45, height: 45, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{initials}</span>
          </div>
        )}
        <svg className="nav-user-chevron" width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`nav-dropdown${open ? ' open' : ''}`}>
        {/* Header */}
        <div className="nav-dd-header">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} className="nav-dd-avatar" alt="" />
          ) : (
            <div style={{ width: 57, height: 57, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{initials}</span>
            </div>
          )}
          <div className="nav-dd-info">
            {user.name && <p className="nav-dd-name">{user.name}</p>}
            <p className="nav-dd-email">{user.email}</p>
            <span className="nav-dd-plan" style={{ background: planBg, color: planColor, border: `1px solid ${planBorder}` }}>
              {planLabel}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="nav-dd-items">
          {/* Plan row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={planColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
            </svg>
            <span style={{ fontSize: 13, color: '#333' }}>{planLabel}</span>
            <span style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>{planDetail}</span>
            {plan === 'free' && (
              <a href="/pricing" style={{ fontSize: 11, fontWeight: 700, color: '#FF6B35', textDecoration: 'none', marginLeft: 'auto', whiteSpace: 'nowrap', fontFamily: "'Satoshi', sans-serif" }}>
                {isTR ? 'Yükselt' : 'Upgrade'}
              </a>
            )}
          </div>

          <a href="/profile" className="nav-dd-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            {isTR ? 'Profil Ayarları' : 'Profile Settings'}
          </a>

          <button className="nav-dd-item" onClick={handleShare}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {copied ? (isTR ? 'Link kopyalandı!' : 'Link copied!') : (isTR ? "MockPlacer'ı Paylaş" : 'Share MockPlacer')}
          </button>

          <a href="/feedback" className="nav-dd-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {isTR ? 'Yorum Bırak' : 'Leave a Review'}
          </a>

          <a href="https://mockplacer.lemonsqueezy.com/billing" target="_blank" rel="noopener noreferrer" className="nav-dd-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            {isTR ? 'Faturalandırma' : 'Billing'}
          </a>

          <div className="nav-dd-divider" />

          <button
            className="nav-dd-item danger"
            onClick={() => { window.location.href = '/auth/signout'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isTR ? 'Çıkış Yap' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>,
    authLi
  );
}
