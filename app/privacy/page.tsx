'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function PrivacyPage() {
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

        .privacy-section ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }

        .privacy-section ul li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #555;
          font-size: 0.97rem;
          line-height: 1.6;
        }

        .privacy-section ul li::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #FF6B35;
          flex-shrink: 0;
          margin-top: 8px;
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
          <div className="privacy-badge">{isTR ? 'Yasal' : 'Legal'}</div>
          <h1 className="privacy-title">
            {isTR ? <>Gizlilik <em>Politikası</em></> : <>Privacy <em>Policy</em></>}
          </h1>
          <p className="privacy-updated">
            {isTR ? 'Son güncelleme: Nisan 2026' : 'Last updated: April 2026'}
          </p>
        </div>

        {/* CONTENT */}
        <div className="privacy-content">

          {/* 1. What we collect */}
          <div className="privacy-section">
            <h2>{isTR ? 'Topladığımız Veriler' : 'What Data We Collect'}</h2>
            <p>
              {isTR
                ? 'MockPlacer, hizmeti iyileştirmek amacıyla yalnızca anonim kullanım verileri toplar. Bu veriler Google Analytics aracılığıyla toplanır ve şunları içerir:'
                : 'MockPlacer collects only anonymous usage data to help improve the service. This is collected via Google Analytics and includes:'}
            </p>
            <ul>
              <li>{isTR ? 'Sayfa görüntülemeleri ve oturum süresi' : 'Page views and session duration'}</li>
              <li>{isTR ? 'Ülke bazlı konum verisi (şehir düzeyinde değil)' : 'Country-level location data (not city-level)'}</li>
              <li>{isTR ? 'Tarayıcı türü ve ekran boyutu' : 'Browser type and screen size'}</li>
              <li>{isTR ? 'Hangi özelliklerin kullanıldığı (anonim)' : 'Which features are used (anonymous)'}</li>
            </ul>
            <p>
              {isTR
                ? 'Bu veriler hiçbir zaman kişisel olarak tanımlanabilir bilgilerle ilişkilendirilmez.'
                : 'This data is never linked to personally identifiable information.'}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* 2. What we DON'T collect */}
          <div className="privacy-section">
            <h2>{isTR ? 'Toplamadığımız Veriler' : "What We Don't Collect"}</h2>
            <div className="highlight-box">
              <p>
                {isTR
                  ? 'Yüklediğiniz görseller sunucularımıza gönderilmez. Tüm işlemler tarayıcınızda gerçekleşir.'
                  : 'Images you upload are never sent to our servers. All processing happens entirely in your browser.'}
              </p>
            </div>
            <ul>
              <li>{isTR ? 'Görsel veya dosya yüklenmez' : 'No images or files are uploaded'}</li>
              <li>{isTR ? 'Hesap veya profil bilgisi toplanmaz (kayıt gerekmez)' : 'No account or profile data (no signup required)'}</li>
              <li>{isTR ? 'IP adresi saklanmaz' : 'No IP addresses stored'}</li>
              <li>{isTR ? 'Üçüncü taraflarla veri satışı yapılmaz' : 'No data sold to third parties'}</li>
            </ul>
          </div>

          <div className="privacy-divider" />

          {/* 3. Cookies */}
          <div className="privacy-section">
            <h2>{isTR ? 'Çerezler' : 'Cookies'}</h2>
            <p>
              {isTR
                ? 'MockPlacer yalnızca Google Analytics çerezlerini kullanır. Bu çerezler anonim kullanım istatistiklerini toplamak için kullanılır ve reklam amacıyla kullanılmaz.'
                : 'MockPlacer uses only Google Analytics cookies. These are used to collect anonymous usage statistics and are not used for advertising purposes.'}
            </p>
            <p>
              {isTR
                ? 'Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz. Bu, sitenin işlevselliğini etkilemez.'
                : 'You can disable cookies in your browser settings. This will not affect the functionality of the site.'}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* 4. Payments */}
          <div className="privacy-section">
            <h2>{isTR ? 'Ödeme İşlemleri' : 'Payments'}</h2>
            <p>
              {isTR
                ? 'Ödemeler, güvenli bir üçüncü taraf ödeme sağlayıcısı olan LemonSqueezy tarafından işlenir. MockPlacer hiçbir ödeme veya kart bilgisi saklamaz.'
                : 'Payments are processed by LemonSqueezy, a secure third-party payment provider. MockPlacer does not store any payment or card information.'}
            </p>
            <p>
              {isTR
                ? <>LemonSqueezy&apos;nin ödeme verilerini nasıl işlediği hakkında bilgi almak için <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer">gizlilik politikalarını</a> inceleyebilirsiniz.</>
                : <>For information on how LemonSqueezy handles payment data, please review their <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</>}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* 5. Contact */}
          <div className="privacy-section">
            <h2>{isTR ? 'İletişim' : 'Contact'}</h2>
            <p>
              {isTR
                ? <>Gizlilik ile ilgili sorularınız için bize ulaşabilirsiniz: <a href="mailto:info@mockplacer.com">info@mockplacer.com</a></>
                : <>For any privacy-related questions, you can reach us at: <a href="mailto:info@mockplacer.com">info@mockplacer.com</a></>}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
