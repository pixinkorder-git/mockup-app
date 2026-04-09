'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const SUBJECTS_EN = [
  'General question',
  'Bug report',
  'Feature request',
  'Billing and subscription',
  'Other',
];
const SUBJECTS_TR = [
  'Genel soru',
  'Hata bildirimi',
  'Özellik isteği',
  'Fatura ve abonelik',
  'Diğer',
];

export default function ContactPage() {
  const [lang, setLang] = useState<'tr' | 'en'>('en');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isTR = lang === 'tr';
  const subjects = isTR ? SUBJECTS_TR : SUBJECTS_EN;

  useEffect(() => {
    const stored = localStorage.getItem('mp-lang') as 'tr' | 'en' | null;
    if (stored === 'tr' || stored === 'en') {
      setLang(stored);
    } else if (navigator.language.startsWith('tr')) {
      setLang('tr');
    }
  }, []);

  // Pre-fill logged-in user info
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? '');
      const fullName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        '';
      if (fullName) setName(fullName);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg(isTR ? 'Lütfen zorunlu alanları doldurun.' : 'Please fill in all required fields.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    try {
      const supabase = createClient();
      const { error } = await supabase.from('contact_messages').insert({
        name: name.trim(),
        email: email.trim(),
        subject: subject || (isTR ? 'Genel soru' : 'General question'),
        message: message.trim(),
      });

      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error('[Contact] Submit error:', err);
      // Fallback: even if DB insert fails, show success so the user
      // still gets the email-based fallback CTA below.
      setStatus('error');
      setErrorMsg(
        isTR
          ? 'Mesajınız gönderilemedi. Lütfen doğrudan e-posta ile iletişime geçin.'
          : 'Your message could not be sent. Please reach out via email directly.'
      );
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; color: #1a1a1a; }

        .contact-wrap {
          min-height: 100vh;
          background: #fff;
          font-family: 'Satoshi', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .contact-nav {
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
        .contact-nav a { text-decoration: none; }
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

        .contact-hero {
          text-align: center;
          padding: 64px 24px 48px;
        }
        .contact-badge {
          display: inline-block;
          background: rgba(255,107,53,0.08);
          color: #FF6B35;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 20px;
        }
        .contact-title {
          font-family: 'Clash Display', sans-serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 600;
          line-height: 1.12;
          color: #1a1a1a;
          margin-bottom: 14px;
        }
        .contact-title em { font-style: normal; color: #FF6B35; }
        .contact-subtitle {
          color: #777;
          font-size: 1rem;
          line-height: 1.6;
          max-width: 480px;
          margin: 0 auto;
        }

        .contact-body {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 24px 80px;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 48px;
          align-items: start;
        }

        /* LEFT SIDEBAR */
        .contact-sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .contact-info-card {
          background: #FDFCFB;
          border: 1px solid #E5E5E5;
          border-radius: 16px;
          padding: 20px;
        }
        .contact-info-label {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .contact-info-value {
          font-size: 0.95rem;
          color: #1a1a1a;
          font-weight: 500;
        }
        .contact-info-value a {
          color: #FF6B35;
          text-decoration: none;
          font-weight: 600;
        }
        .contact-info-value a:hover { text-decoration: underline; }
        .contact-info-note {
          font-size: 0.84rem;
          color: #999;
          margin-top: 4px;
          line-height: 1.5;
        }

        /* FORM CARD */
        .contact-form-card {
          background: #fff;
          border: 1px solid #E5E5E5;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
          padding: 36px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .form-group:last-of-type { margin-bottom: 0; }
        .form-label {
          font-size: 0.86rem;
          font-weight: 600;
          color: #333;
          letter-spacing: 0.02em;
        }
        .form-label span { color: #FF6B35; }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1px solid #E5E5E5;
          font-family: 'Satoshi', sans-serif;
          font-size: 0.95rem;
          color: #1a1a1a;
          background: #FAFAFA;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          appearance: none;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #FF6B35;
          background: #fff;
        }
        .form-textarea {
          resize: vertical;
          min-height: 130px;
          line-height: 1.6;
        }
        .form-select {
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
          cursor: pointer;
        }

        .submit-btn {
          width: 100%;
          padding: 14px 24px;
          background: #FF6B35;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Clash Display', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(255,107,53,0.3);
          margin-top: 20px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #E85A28;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(255,107,53,0.4);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .form-error {
          margin-top: 14px;
          padding: 10px 16px;
          background: rgba(204,51,0,0.06);
          border: 1px solid rgba(204,51,0,0.2);
          border-radius: 8px;
          color: #CC3300;
          font-size: 0.88rem;
          line-height: 1.5;
        }

        /* SUCCESS STATE */
        .success-state {
          text-align: center;
          padding: 24px 0;
        }
        .success-icon {
          width: 56px;
          height: 56px;
          background: rgba(255,107,53,0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .success-state h2 {
          font-family: 'Clash Display', sans-serif;
          font-size: 1.6rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 10px;
        }
        .success-state p {
          color: #777;
          font-size: 0.97rem;
          line-height: 1.6;
          max-width: 340px;
          margin: 0 auto 24px;
        }
        .success-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: #FF6B35;
          color: #fff;
          border-radius: 12px;
          font-family: 'Clash Display', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(255,107,53,0.28);
          transition: background 0.2s;
        }
        .success-back-btn:hover { background: #E85A28; }

        @media (max-width: 768px) {
          .contact-body { grid-template-columns: 1fr; gap: 32px; }
          .contact-nav { padding: 0 20px; }
          .form-row { grid-template-columns: 1fr; }
          .contact-form-card { padding: 24px 20px; }
        }
      `}</style>
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />

      <div className="contact-wrap">
        <nav className="contact-nav">
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

        <div className="contact-hero">
          <div className="contact-badge">{isTR ? 'Destek' : 'Support'}</div>
          <h1 className="contact-title">
            {isTR ? <>Bize <em>Ulaşın</em></> : <>Get in <em>Touch</em></>}
          </h1>
          <p className="contact-subtitle">
            {isTR
              ? 'Soru, öneri veya sorun bildirimi için buradayız. Genellikle 24-48 saat içinde yanıt veririz.'
              : 'We are here for questions, suggestions, or bug reports. We typically respond within 24-48 hours.'}
          </p>
        </div>

        <div className="contact-body">
          {/* Sidebar */}
          <aside className="contact-sidebar">
            <div className="contact-info-card">
              <div className="contact-info-label">{isTR ? 'E-posta' : 'Email'}</div>
              <div className="contact-info-value">
                <a href="mailto:info@mockplacer.com">info@mockplacer.com</a>
              </div>
              <div className="contact-info-note">
                {isTR ? '24-48 saat içinde yanıt' : 'Reply within 24-48 hours'}
              </div>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-label">{isTR ? 'Fatura ve Abonelik' : 'Billing and Subscription'}</div>
              <div className="contact-info-value" style={{ fontSize: '0.9rem', color: '#555', fontWeight: 400 }}>
                {isTR
                  ? <><a href="https://app.lemonsqueezy.com" target="_blank" rel="noopener noreferrer">LemonSqueezy panelinden</a> aboneliğinizi yönetebilirsiniz.</>
                  : <>Manage your subscription from your <a href="https://app.lemonsqueezy.com" target="_blank" rel="noopener noreferrer">LemonSqueezy dashboard</a>.</>}
              </div>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-label">{isTR ? 'Yasal' : 'Legal'}</div>
              <div className="contact-info-value" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.9rem', fontWeight: 400, color: '#555' }}>
                <a href="/privacy">{isTR ? 'Gizlilik Politikası' : 'Privacy Policy'}</a>
                <a href="/terms">{isTR ? 'Kullanım Koşulları' : 'Terms of Service'}</a>
              </div>
            </div>
          </aside>

          {/* Form */}
          <div className="contact-form-card">
            {status === 'success' ? (
              <div className="success-state">
                <div className="success-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#FF6B35" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>{isTR ? 'Mesajınız İletildi!' : 'Message Sent!'}</h2>
                <p>
                  {isTR
                    ? 'En kısa sürede size geri döneceğiz. Teşekkür ederiz.'
                    : 'We will get back to you as soon as possible. Thank you for reaching out.'}
                </p>
                <a href="/" className="success-back-btn">
                  {isTR ? 'Ana Sayfaya Dön' : 'Back to MockPlacer'}
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      {isTR ? 'Ad Soyad' : 'Name'} <span>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={isTR ? 'Adınız' : 'Your name'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {isTR ? 'E-posta' : 'Email'} <span>*</span>
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{isTR ? 'Konu' : 'Subject'}</label>
                  <select
                    className="form-select"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="">{isTR ? 'Bir konu seçin' : 'Select a subject'}</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {isTR ? 'Mesajınız' : 'Message'} <span>*</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    placeholder={isTR ? 'Nasıl yardımcı olabiliriz?' : 'How can we help you?'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting'
                    ? (isTR ? 'Gönderiliyor...' : 'Sending...')
                    : (isTR ? 'Mesaj Gönder' : 'Send Message')}
                </button>

                {(errorMsg || status === 'error') && (
                  <div className="form-error">
                    {errorMsg || (isTR ? 'Bir hata oluştu. Lütfen tekrar deneyin.' : 'Something went wrong. Please try again.')}
                    {' '}
                    <a href="mailto:info@mockplacer.com" style={{ color: '#CC3300', fontWeight: 600 }}>
                      info@mockplacer.com
                    </a>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
