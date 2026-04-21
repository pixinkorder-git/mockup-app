'use client';

import Link from 'next/link';
import UserDropdown from '@/app/components/UserDropdown';
import { theme, NavStat } from './ui/editorTheme';

export const NAV_H = 90;

interface AppHeaderProps {
  artCount: number;
  mockupCount: number;
  resultCount: number;
  user: { id?: string; email?: string; name?: string; avatar?: string } | null;
  plan: 'free' | 'basic' | 'pro';
  lang: 'tr' | 'en';
  isTR: boolean;
  onSignOut: () => void;
}

export default function AppHeader({
  artCount, mockupCount, resultCount, user, plan, lang, isTR, onSignOut,
}: AppHeaderProps) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, height: NAV_H,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${theme.border}`,
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/1logo.png" width="220" height="55" style={{ display: 'block', objectFit: 'contain' }} alt="MockPlacer" />
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <NavStat label={isTR ? 'Görsel' : 'Art'} value={artCount} />
          <div style={{ width: 1, height: 24, background: theme.border, alignSelf: 'center' }} />
          <NavStat label={isTR ? 'Şablon' : 'Templates'} value={mockupCount} />
          {resultCount > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: theme.border, alignSelf: 'center' }} />
              <NavStat label={isTR ? 'Sonuç' : 'Results'} value={resultCount} accent />
            </>
          )}
        </div>
        <div style={{ width: 1, height: 24, background: theme.border }} />
        {user ? (
          <UserDropdown user={user} plan={plan} lang={lang} onSignOut={onSignOut} />
        ) : (
          <Link
            href="/login"
            style={{ fontSize: 18, fontWeight: 700, fontFamily: theme.fontFamily, color: theme.accent, textDecoration: 'none', padding: '10px 24px', borderRadius: 8, background: 'rgba(249, 115, 22, 0.08)', display: 'inline-block', boxShadow: 'inset 0 1px 0 rgba(249,115,22,0.10), 0 4px 0 rgba(234,88,12,0.45), 0 5px 0 rgba(234,88,12,0.18), 0 8px 16px rgba(249,115,22,0.14)', transform: 'translateY(0)', transition: 'transform 0.1s, box-shadow 0.1s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(249,115,22,0.10), 0 2px 0 rgba(234,88,12,0.40), 0 3px 0 rgba(234,88,12,0.14), 0 5px 10px rgba(249,115,22,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(249,115,22,0.10), 0 4px 0 rgba(234,88,12,0.45), 0 5px 0 rgba(234,88,12,0.18), 0 8px 16px rgba(249,115,22,0.14)'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(5px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(249,115,22,0.08), 0 0px 0 rgba(234,88,12,0.40), 0 2px 6px rgba(249,115,22,0.10)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(249,115,22,0.10), 0 2px 0 rgba(234,88,12,0.40), 0 3px 0 rgba(234,88,12,0.14), 0 5px 10px rgba(249,115,22,0.12)'; }}
          >
            {isTR ? 'Giriş Yap' : 'Sign In'}
          </Link>
        )}
      </div>
    </header>
  );
}
