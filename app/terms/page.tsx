'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function TermsPage() {
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
          <div className="privacy-badge">{isTR ? 'Yasal Metin' : 'Legal Notice'}</div>
          <h1 className="privacy-title">
            {isTR ? <>Kullanım <em>Şartları</em></> : <>Terms of <em>Service</em></>}
          </h1>
          <p className="privacy-updated">
            {isTR ? 'Son güncelleme: Nisan 2026' : 'Last updated: April 2026'}
          </p>
        </div>

        {/* CONTENT */}
        <div className="privacy-content">

          {/* 1. Acceptance of Terms */}
          <div className="privacy-section">
            <h2>{isTR ? 'Şartların Kabulü' : 'Acceptance of Terms'}</h2>
            <p>
              {isTR
                ? 'MockPlacer\'ı kullanarak bu kullanım şartlarını kabul etmiş olursunuz. Şartları kabul etmiyorsanız lütfen hizmeti kullanmayınız.'
                : 'By using MockPlacer, you agree to these Terms of Service. If you do not agree to these terms, please do not use the service.'}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* 2. Service Description */}
          <div className="privacy-section">
            <h2>{isTR ? 'Hizmet Açıklaması' : 'Service Description'}</h2>
            <p>
              {isTR
                ? 'MockPlacer, tarayıcı tabanlı bir toplu mockup oluşturma aracıdır.'
                : 'MockPlacer is a browser-based bulk mockup generator.'}
            </p>
            <div className="highlight-box">
              <p>
                {isTR
                  ? 'Tüm görsel işleme işlemleri tarayıcınızda gerçekleşir. Görselleriniz sunucularımıza yüklenmez.'
                  : 'All image processing happens locally in your browser. No images are uploaded to our servers.'}
              </p>
            </div>
          </div>

          <div className="privacy-divider" />

          {/* 3. Free and Paid Plans */}
          <div className="privacy-section">
            <h2>{isTR ? 'Ücretsiz ve Ücretli Planlar' : 'Free and Paid Plans'}</h2>
            <ul>
              <li>{isTR ? 'Ücretsiz: Günde 3 mockup oluşturma' : 'Free: 3 generates per day'}</li>
              <li>{isTR ? 'Basic ($5/ay): Günde 15 mockup oluşturma, ZIP indirme' : 'Basic ($5/mo): 15 generates per day, ZIP download'}</li>
              <li>{isTR ? 'Pro ($10/ay): Sınırsız mockup oluşturma, mockup kütüphanesi, ZIP indirme' : 'Pro ($10/mo): Unlimited generates, mockup library, ZIP download'}</li>
            </ul>
            <p>
              {isTR
                ? 'Plan ve fiyatlandırmalar önceden bildirim yapılarak değiştirilebilir.'
                : 'Plans and pricing may change with prior notice.'}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* 4. User Content */}
          <div className="privacy-section">
            <h2>{isTR ? 'Kullanıcı İçeriği' : 'User Content'}</h2>
            <ul>
              <li>{isTR ? 'Yüklediğiniz tüm görseller ve oluşturduğunuz tüm mockuplar size aittir.' : 'You own all images you upload and all mockups you generate.'}</li>
              <li>{isTR ? 'Kullandığınız görseller üzerinde gerekli haklara sahip olmanız sizin sorumluluğunuzdadır.' : 'You are responsible for having the rights to the images you use.'}</li>
              <li>{isTR ? 'MockPlacer içeriğiniz üzerinde hiçbir mülkiyet hakkı talep etmez.' : 'MockPlacer does not claim any ownership of your content.'}</li>
            </ul>
          </div>

          <div className="privacy-divider" />

          {/* 5. Payments and Subscriptions */}
          <div className="privacy-section">
            <h2>{isTR ? 'Ödemeler ve Abonelikler' : 'Payments and Subscriptions'}</h2>
            <ul>
              <li>{isTR ? 'Ödemeler LemonSqueezy tarafından işlenir.' : 'Payments are processed by LemonSqueezy.'}</li>
              <li>{isTR ? 'Abonelikler otomatik olarak yenilenir.' : 'Subscriptions renew automatically.'}</li>
              <li>{isTR ? 'LemonSqueezy hesabınızdan istediğiniz zaman iptal edebilirsiniz.' : 'You can cancel anytime from your LemonSqueezy account.'}</li>
              <li>{isTR ? 'Kısmi faturalama dönemleri için geri ödeme yapılmaz.' : 'No refunds are provided for partial billing periods.'}</li>
            </ul>
          </div>

          <div className="privacy-divider" />

          {/* 6. Prohibited Use */}
          <div className="privacy-section">
            <h2>{isTR ? 'Yasaklı Kullanım' : 'Prohibited Use'}</h2>
            <ul>
              <li>{isTR ? 'Yasadışı içerik oluşturmak veya paylaşmak' : 'Creating or sharing illegal content'}</li>
              <li>{isTR ? 'Kullanım limitlerini aşmaya çalışmak' : 'Attempting to bypass usage limits'}</li>
              <li>{isTR ? 'Ters mühendislik yapmak veya hizmeti kopyalamaya çalışmak' : 'Reverse engineering or attempting to copy the service'}</li>
            </ul>
          </div>

          <div className="privacy-divider" />

          {/* 7. Limitation of Liability */}
          <div className="privacy-section">
            <h2>{isTR ? 'Sorumluluk Sınırlaması' : 'Limitation of Liability'}</h2>
            <p>
              {isTR
                ? 'Hizmet "olduğu gibi" sunulmaktadır. Çalışma süresi veya kullanılabilirlik için herhangi bir garanti verilmemektedir. MockPlacer, hizmetin kullanımından kaynaklanabilecek herhangi bir zarardan sorumlu değildir.'
                : 'The service is provided "as is." No warranty is given for uptime or availability. MockPlacer is not liable for any damages resulting from the use of the service.'}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* 8. Changes to Terms */}
          <div className="privacy-section">
            <h2>{isTR ? 'Şartlardaki Değişiklikler' : 'Changes to Terms'}</h2>
            <p>
              {isTR
                ? 'Bu şartları zaman zaman güncelleyebiliriz. Hizmeti kullanmaya devam etmeniz, güncellenmiş şartları kabul ettiğiniz anlamına gelir.'
                : 'We may update these terms from time to time. Continued use of the service means you accept the updated terms.'}
            </p>
          </div>

          <div className="privacy-divider" />

          {/* 9. Contact */}
          <div className="privacy-section">
            <h2>{isTR ? 'İletişim' : 'Contact'}</h2>
            <p>
              {isTR
                ? <>Bu şartlarla ilgili sorularınız için bize ulaşabilirsiniz: <a href="mailto:info@mockplacer.com" target="_blank" rel="noopener noreferrer" style={{color: '#FF6B35', fontWeight: 600}}>info@mockplacer.com</a></>
                : <>For any questions about these terms, you can reach us at: <a href="mailto:info@mockplacer.com" target="_blank" rel="noopener noreferrer" style={{color: '#FF6B35', fontWeight: 600}}>info@mockplacer.com</a></>}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
