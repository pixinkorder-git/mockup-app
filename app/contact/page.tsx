'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ContactPage() {
  const [lang, setLang] = useState<'tr' | 'en'>('en');

  useEffect(() => {
    const stored = localStorage.getItem('mp-lang') as 'tr' | 'en' | null;
    if (stored === 'tr' || stored === 'en') {
      setLang(stored);
    } else if (navigator.language.startsWith('tr')) {
      setLang('tr');
    }
  }, []);

  const isTR = lang === 'tr';

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; color: #1a1a1a; }

        .privacy-wrap {
          min-height: 100vh;
          background: #fff;
          font-family: 'Satoshi', sans-serif;
        }

        /* NAV */
        .privacy-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          height: 68px;
          background: #fff;
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .privacy-nav a { text-decoration: none; }
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

        /* HERO */
        .privacy-hero {
          text-align: center;
          padding: 64px 24px 40px;
        }
        .privacy-badge {
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
        .privacy-title {
          font-family: 'Clash Display', sans-serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 600;
          line-height: 1.12;
          color: #1a1a1a;
          margin-bottom: 12px;
        }
        .privacy-title em {
          font-style: normal;
          color: #FF6B35;
        }
        .privacy-updated {
          color: #999;
          font-size: 0.88rem;
        }

        /* CONTENT */
        .privacy-content {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        .privacy-section {
          margin-bottom: 40px;
        }

        .privacy-section h2 {
          font-family: 'Clash Display', sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 14px;
          padding-left: 10px;
          border-left: 3px solid #FF6B35;
        }

        .privacy-section p {
          color: #555;
          font-size: 0.97rem;
          line-height: 1.75;
          margin-bottom: 10px;
        }

        .privacy-section a {
          color: #FF6B35;
          text-decoration: none;
          font-weight: 500;
        }
        .privacy-section a:hover { text-decoration: underline; }

        .privacy-divider {
          height: 1px;
          background: #f0f0f0;
          margin-bottom: 40px;
        }

        .highlight-box {
          background: rgba(255,107,53,0.05);
          border: 1px solid rgba(255,107,53,0.2);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 10px;
        }
        .highlight-box p {
          margin-bottom: 0 !important;
          font-weight: 500;
          color: #333 !important;
        }

        @media (max-width: 720px) {
          .privacy-nav { padding: 0 20px; }
        }
      `}</style>

      <div className="privacy-wrap">
        {/* NAV */}
        <nav className="privacy-nav">
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

        {/* HERO */}
        <div className="privacy-hero">
          <div className="privacy-badge">{isTR ? 'İletişim' : 'Contact'}</div>
          <h1 className="privacy-title">
            {isTR ? <>Bize <em>Ulaşın</em></> : <>Get in <em>Touch</em></>}
          </h1>
          <p className="privacy-updated">
            {isTR ? 'Son güncelleme: Nisan 2026' : 'Last updated: April 2026'}
          </p>
        </div>

        {/* CONTENT */}
        <div className="privacy-content">

          {/* Email */}
          <div className="privacy-section">
            <h2>{isTR ? 'E-posta' : 'Email'}</h2>
            <div className="highlight-box">
              <p>
                <button
                  onClick={() => window.location.href = 'mailto:info@mockplacer.com'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FF6B35',
                    fontWeight: 600,
                    fontSize: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  info@mockplacer.com
                </button>
              </p>
            </div>
            <p>
              {isTR
                ? 'Genellikle 24-48 saat içinde yanıt veririz.'
                : 'We typically respond within 24-48 hours.'}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* Billing */}
          <div className="privacy-section">
            <h2>{isTR ? 'Abonelik ve Fatura' : 'Subscription and Billing'}</h2>
            <p>
              {isTR
                ? <>Abonelik ve fatura soruları için <a href="https://app.lemonsqueezy.com" target="_blank" rel="noopener noreferrer">LemonSqueezy panelini</a> ziyaret edin.</>
                : <>For subscription and billing questions, visit your <a href="https://app.lemonsqueezy.com" target="_blank" rel="noopener noreferrer">LemonSqueezy dashboard</a>.</>}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
