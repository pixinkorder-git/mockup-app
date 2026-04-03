'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [lang, setLang] = useState<'tr' | 'en'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('mp-lang') as 'tr' | 'en' | null;
    if (stored === 'tr' || stored === 'en') {
      setLang(stored);
    } else if (navigator.language.startsWith('tr')) {
      setLang('tr');
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'auth_failed') {
      setError(isTRRef.current ? 'Giriş başarısız. Lütfen tekrar deneyin.' : 'Sign in failed. Please try again.');
    }
  }, []);

  // Keep a ref for the error message inside useEffect
  const isTRRef = { current: lang === 'tr' };
  const isTR = lang === 'tr';

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    console.log('[MockPlacer] Starting Google OAuth sign in...');
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://mockplacer.com/auth/callback',
      },
    });
    console.log('[MockPlacer] signInWithOAuth result:', { data, error });
    if (error) {
      console.error('[MockPlacer] OAuth error:', error.message);
      setError(isTR ? 'Giriş başarısız. Lütfen tekrar deneyin.' : 'Sign in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; color: #1a1a1a; }

        .login-wrap {
          min-height: 100vh;
          background: #fff;
          font-family: 'Satoshi', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .login-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 68px;
          background: #fff;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .login-nav a { text-decoration: none; }
        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #666;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .back-link:hover { color: #FF6B35; }

        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border: 1px solid #E5E5E5;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
          padding: 40px 36px;
          text-align: center;
        }

        .login-badge {
          display: inline-block;
          background: rgba(255,107,53,0.08);
          color: #FF6B35;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 20px;
        }

        .login-title {
          font-family: 'Clash Display', sans-serif;
          font-size: 2rem;
          font-weight: 600;
          line-height: 1.15;
          color: #1a1a1a;
          margin-bottom: 10px;
        }
        .login-title em {
          font-style: normal;
          color: #FF6B35;
        }

        .login-subtitle {
          color: #777;
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 14px 24px;
          background: #FF6B35;
          color: white;
          border: none;
          border-radius: 12px;
          font-family: 'Clash Display', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(255,107,53,0.3);
          letter-spacing: 0.01em;
        }
        .google-btn:hover:not(:disabled) {
          background: #E85A28;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(255,107,53,0.4);
        }
        .google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .login-error {
          margin-top: 16px;
          padding: 10px 16px;
          background: rgba(204,51,0,0.06);
          border: 1px solid rgba(204,51,0,0.2);
          border-radius: 8px;
          color: #CC3300;
          font-size: 0.88rem;
        }

        .login-note {
          margin-top: 24px;
          color: #aaa;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        @media (max-width: 480px) {
          .login-nav { padding: 0 20px; }
          .login-card { padding: 32px 24px; }
        }
      `}</style>

      <div className="login-wrap">
        <nav className="login-nav">
          <a href="/" className="back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isTR ? "MockPlacer'a Dön" : 'Back to MockPlacer'}
          </a>
          <a href="/">
            <Image src="/1logo.png" width={140} height={35} alt="MockPlacer" style={{ display: 'block' }} />
          </a>
        </nav>

        <main className="login-main">
          <div className="login-card">
            <div className="login-badge">{isTR ? 'Giriş Yap' : 'Sign In'}</div>
            <h1 className="login-title">
              {isTR ? <>MockPlacer&apos;a<br /><em>Hoş Geldin</em></> : <>Welcome to<br /><em>MockPlacer</em></>}
            </h1>
            <p className="login-subtitle">
              {isTR
                ? 'Devam etmek için Google hesabınla giriş yap.'
                : 'Sign in with your Google account to continue.'}
            </p>

            <button
              className="google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {/* Google "G" logo */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.8h5.39a4.6 4.6 0 0 1-2 3.02v2.52h3.22c1.89-1.74 2.99-4.3 2.99-7.34z" fill="white" fillOpacity="0.9"/>
                <path d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.22-2.52a6.02 6.02 0 0 1-3.39.97 6.01 6.01 0 0 1-5.66-4.15H1.07v2.6A9.99 9.99 0 0 0 10 20z" fill="white" fillOpacity="0.9"/>
                <path d="M4.34 11.87A6.04 6.04 0 0 1 4.03 10c0-.65.11-1.28.31-1.87V5.53H1.07A9.99 9.99 0 0 0 0 10c0 1.61.38 3.14 1.07 4.47l3.27-2.6z" fill="white" fillOpacity="0.9"/>
                <path d="M10 3.96a5.44 5.44 0 0 1 3.84 1.5l2.87-2.87A9.63 9.63 0 0 0 10 0 9.99 9.99 0 0 0 1.07 5.53l3.27 2.6A6.01 6.01 0 0 1 10 3.96z" fill="white" fillOpacity="0.9"/>
              </svg>
              {loading
                ? (isTR ? 'Yönlendiriliyor...' : 'Redirecting...')
                : (isTR ? 'Google ile Giriş Yap' : 'Sign in with Google')}
            </button>

            {error && <div className="login-error">{error}</div>}

            <p className="login-note">
              {isTR
                ? 'Giriş yaparak Kullanım Şartları ve Gizlilik Politikamızı kabul etmiş olursunuz.'
                : 'By signing in, you agree to our Terms of Service and Privacy Policy.'}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
