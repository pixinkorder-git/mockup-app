'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function FeedbackPage() {
  const [lang, setLang] = useState<'tr' | 'en'>('en');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTR = lang === 'tr';

  useEffect(() => {
    const stored = localStorage.getItem('mp-lang') as 'tr' | 'en' | null;
    if (stored === 'tr' || stored === 'en') setLang(stored);
    else if (navigator.language.startsWith('tr')) setLang('tr');
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '');
        setName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError(isTR ? 'Lütfen bir puan seçin.' : 'Please select a rating.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('feedback').insert({
        user_id: user?.id ?? null,
        email: email || null,
        name: name || null,
        rating,
        comment: comment || null,
      });
      if (dbError) console.error('[Feedback] DB error:', dbError.message);
      setSubmitted(true);
    } catch (err) {
      console.error('[Feedback] Error:', err);
      setSubmitted(true); // show success even on error — don't block user
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; color: #1a1a1a; }
        .fb-wrap { min-height: 100vh; background: #fff; font-family: 'Satoshi', sans-serif; display: flex; flex-direction: column; }
        .fb-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 68px; background: #fff;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          position: sticky; top: 0; z-index: 100;
        }
        .fb-nav a { text-decoration: none; }
        .back-link { display: flex; align-items: center; gap: 6px; color: #666; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
        .back-link:hover { color: #FF6B35; }
        .fb-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .fb-card {
          width: 100%; max-width: 480px; background: #fff;
          border: 1px solid #E5E5E5; border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
          padding: 40px 36px;
        }
        .fb-badge {
          display: inline-block; background: rgba(255,107,53,0.08); color: #FF6B35;
          font-size: 0.82rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
          padding: 6px 14px; border-radius: 100px; margin-bottom: 20px;
        }
        .fb-title { font-family: 'Clash Display', sans-serif; font-size: 1.9rem; font-weight: 600; line-height: 1.15; color: #1a1a1a; margin-bottom: 8px; }
        .fb-title em { font-style: normal; color: #FF6B35; }
        .fb-subtitle { color: #777; font-size: 0.95rem; line-height: 1.6; margin-bottom: 32px; }
        .fb-label { display: block; font-size: 0.88rem; font-weight: 600; color: #333; margin-bottom: 8px; letter-spacing: 0.02em; }
        .fb-stars { display: flex; gap: 6px; margin-bottom: 24px; }
        .fb-star { background: none; border: none; cursor: pointer; padding: 2px; font-size: 28px; line-height: 1; transition: transform 0.1s; }
        .fb-star:hover { transform: scale(1.15); }
        .fb-input, .fb-textarea {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1px solid #E5E5E5; font-family: 'Satoshi', sans-serif;
          font-size: 0.95rem; color: #1a1a1a; background: #FAFAFA;
          transition: border-color 0.2s; outline: none; margin-bottom: 16px;
        }
        .fb-input:focus, .fb-textarea:focus { border-color: #FF6B35; background: #fff; }
        .fb-textarea { resize: vertical; min-height: 110px; }
        .fb-row { display: flex; gap: 12px; }
        .fb-row .fb-input { margin-bottom: 0; }
        .fb-row-wrap { display: flex; gap: 12px; margin-bottom: 16px; }
        .fb-row-wrap > * { flex: 1; }
        .fb-btn {
          width: 100%; padding: 14px 24px; background: #FF6B35; color: white;
          border: none; border-radius: 12px; font-family: 'Clash Display', sans-serif;
          font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(255,107,53,0.3); margin-top: 8px;
        }
        .fb-btn:hover:not(:disabled) { background: #E85A28; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(255,107,53,0.4); }
        .fb-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .fb-error { margin-top: 12px; padding: 10px 16px; background: rgba(204,51,0,0.06); border: 1px solid rgba(204,51,0,0.2); border-radius: 8px; color: #CC3300; font-size: 0.88rem; }
        .fb-success { text-align: center; padding: 16px 0; }
        .fb-success-icon { font-size: 48px; margin-bottom: 16px; }
        .fb-success h2 { font-family: 'Clash Display', sans-serif; font-size: 1.5rem; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
        .fb-success p { color: #777; font-size: 0.95rem; line-height: 1.6; }
        .fb-success-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 24px; padding: 10px 20px; background: #FF6B35; color: #fff; border-radius: 10px; font-weight: 600; font-size: 0.9rem; text-decoration: none; font-family: 'Clash Display', sans-serif; }
        @media (max-width: 480px) { .fb-nav { padding: 0 20px; } .fb-card { padding: 32px 20px; } .fb-row-wrap { flex-direction: column; } }
      `}</style>
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />

      <div className="fb-wrap">
        <nav className="fb-nav">
          <Link href="/" className="back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isTR ? "MockPlacer'a Dön" : 'Back to MockPlacer'}
          </Link>
          <Link href="/">
            <Image src="/1logo.png" width={140} height={35} alt="MockPlacer" style={{ display: 'block' }} />
          </Link>
        </nav>

        <main className="fb-main">
          <div className="fb-card">
            {submitted ? (
              <div className="fb-success">
                <div className="fb-success-icon">⭐</div>
                <h2>{isTR ? 'Teşekkürler!' : 'Thank you!'}</h2>
                <p>{isTR ? 'Geri bildiriminiz bizim için çok değerli. MockPlacer\'ı daha iyi yapacağız!' : 'Your feedback means a lot to us. We\'ll use it to make MockPlacer even better!'}</p>
                <Link href="/" className="fb-success-btn">
                  {isTR ? 'Ana Sayfaya Dön' : 'Back to Home'}
                </Link>
              </div>
            ) : (
              <>
                <span className="fb-badge">{isTR ? 'Geri Bildirim' : 'Feedback'}</span>
                <h1 className="fb-title">
                  {isTR ? <>MockPlacer&apos;ı nasıl <em>buldunuz?</em></> : <>How do you like <em>MockPlacer?</em></>}
                </h1>
                <p className="fb-subtitle">
                  {isTR ? 'Görüşleriniz ürünü geliştirmemize yardımcı olur.' : 'Your opinion helps us improve the product.'}
                </p>

                <form onSubmit={handleSubmit}>
                  <label className="fb-label">{isTR ? 'Puanınız' : 'Your Rating'}</label>
                  <div className="fb-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="fb-star"
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(n)}
                        aria-label={`${n} star`}
                      >
                        {n <= (hovered || rating) ? '★' : '☆'}
                      </button>
                    ))}
                  </div>

                  <label className="fb-label">{isTR ? 'Yorumunuz' : 'Your Comment'}</label>
                  <textarea
                    className="fb-textarea"
                    placeholder={isTR ? 'Deneyiminizi paylaşın...' : 'Share your experience...'}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />

                  <div className="fb-row-wrap">
                    <div>
                      <label className="fb-label">{isTR ? 'Ad Soyad' : 'Name'}</label>
                      <input
                        type="text"
                        className="fb-input"
                        placeholder={isTR ? 'Adınız' : 'Your name'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="fb-label">E-mail</label>
                      <input
                        type="email"
                        className="fb-input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="fb-btn" disabled={submitting}>
                    {submitting
                      ? (isTR ? 'Gönderiliyor...' : 'Submitting...')
                      : (isTR ? 'Gönder' : 'Submit Feedback')}
                  </button>

                  {error && <div className="fb-error">{error}</div>}
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
