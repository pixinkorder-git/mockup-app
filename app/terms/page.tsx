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

        .terms-wrap {
          min-height: 100vh;
          background: #fff;
          font-family: 'Satoshi', sans-serif;
        }

        .terms-nav {
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
        .terms-nav a { text-decoration: none; }
        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #666;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Satoshi', sans-serif;
        }
        .back-link:hover { color: #FF6B35; }

        .terms-hero {
          text-align: center;
          padding: 64px 24px 40px;
        }
        .terms-badge {
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
        .terms-title {
          font-family: 'Clash Display', sans-serif;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 600;
          line-height: 1.12;
          color: #1a1a1a;
          margin-bottom: 12px;
        }
        .terms-title em {
          font-style: normal;
          color: #FF6B35;
        }
        .terms-updated {
          color: #999;
          font-size: 0.88rem;
        }

        .terms-content {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }

        .terms-section {
          margin-bottom: 40px;
        }

        .terms-section h2 {
          font-family: 'Clash Display', sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 14px;
          padding-left: 10px;
          border-left: 3px solid #FF6B35;
        }

        .terms-section p {
          color: #555;
          font-size: 0.97rem;
          line-height: 1.75;
          margin-bottom: 10px;
        }

        .terms-section ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 10px;
        }

        .terms-section ul li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #555;
          font-size: 0.97rem;
          line-height: 1.6;
        }

        .terms-section ul li::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #FF6B35;
          flex-shrink: 0;
          margin-top: 8px;
        }

        .terms-section a {
          color: #FF6B35;
          text-decoration: none;
          font-weight: 500;
        }
        .terms-section a:hover { text-decoration: underline; }

        .terms-divider {
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
          .terms-nav { padding: 0 20px; }
        }
      `}</style>
      <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />

      <div className="terms-wrap">
        <nav className="terms-nav">
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

        <div className="terms-hero">
          <div className="terms-badge">{isTR ? 'Yasal' : 'Legal'}</div>
          <h1 className="terms-title">
            {isTR ? <>Kullanım <em>Koşulları</em></> : <>Terms of <em>Service</em></>}
          </h1>
          <p className="terms-updated">
            {isTR ? 'Son güncelleme: Nisan 2026' : 'Last updated: April 2026'}
          </p>
        </div>

        <div className="terms-content">

          {/* 1. Service Description */}
          <div className="terms-section">
            <h2>{isTR ? 'Hizmet Açıklaması' : 'Service Description'}</h2>
            <p>
              {isTR
                ? 'MockPlacer, tasarımcıların ve e-ticaret sahiplerinin kendi görsellerini profesyonel mockup şablonlarına hızlıca toplu olarak yerleştirmesini sağlayan tarayıcı tabanlı bir araçtır.'
                : 'MockPlacer is a browser-based tool that lets designers and e-commerce owners quickly place their artwork into professional mockup templates in bulk.'}
            </p>
            <div className="highlight-box">
              <p>
                {isTR
                  ? 'Tüm görüntü işleme işlemleri doğrudan tarayıcınızda gerçekleşir. Yüklediğiniz dosyalar sunucularımıza iletilmez.'
                  : 'All image processing runs entirely in your browser. Files you upload are never sent to our servers.'}
              </p>
            </div>
            <ul>
              <li>{isTR ? 'Toplu mockup oluşturma (birden fazla görsel x birden fazla şablon)' : 'Bulk mockup generation across multiple artworks and templates'}</li>
              <li>{isTR ? 'Sürükle-bırak dosya yükleme' : 'Drag-and-drop file uploading'}</li>
              <li>{isTR ? 'Çerçeve düzenleyici ile hassas yerleştirme' : 'Precise placement with the frame editor'}</li>
              <li>{isTR ? 'Tek tıkla toplu ZIP indirme' : 'One-click bulk ZIP download'}</li>
            </ul>
          </div>

          <div className="terms-divider" />

          {/* 2. User Responsibilities */}
          <div className="terms-section">
            <h2>{isTR ? 'Kullanıcı Sorumlulukları' : 'User Responsibilities'}</h2>
            <p>
              {isTR
                ? 'Hizmeti kullanarak aşağıdaki koşulları kabul etmiş olursunuz:'
                : 'By using the service, you agree to the following:'}
            </p>
            <ul>
              <li>{isTR ? 'Yalnızca telif hakkına sahip olduğunuz veya kullanım iznine sahip olduğunuz görselleri yükleyeceksiniz.' : 'You will only upload images you own or have the right to use.'}</li>
              <li>{isTR ? 'Hizmeti yasadışı, zararlı veya aldatıcı amaçlarla kullanmayacaksınız.' : 'You will not use the service for illegal, harmful, or deceptive purposes.'}</li>
              <li>{isTR ? 'Otomatik araçlar veya botlar aracılığıyla hizmete erişmeyeceksiniz.' : 'You will not access the service through automated tools or bots.'}</li>
              <li>{isTR ? 'Hesap bilgilerinizi üçüncü şahıslarla paylaşmayacaksınız.' : 'You will not share your account credentials with third parties.'}</li>
              <li>{isTR ? 'Kullanım limitlerini aşmak veya hizmeti tersine mühendislik yapmak amacıyla girişimlerde bulunmayacaksınız.' : 'You will not attempt to bypass usage limits or reverse-engineer the service.'}</li>
            </ul>
          </div>

          <div className="terms-divider" />

          {/* 3. Intellectual Property */}
          <div className="terms-section">
            <h2>{isTR ? 'Fikri Mülkiyet' : 'Intellectual Property'}</h2>
            <div className="highlight-box">
              <p>
                {isTR
                  ? 'Yüklediğiniz görseller ve oluşturduğunuz tüm mockuplar size aittir. MockPlacer, içerikleriniz üzerinde hiçbir hak talep etmez.'
                  : 'The images you upload and all mockups you generate belong to you. MockPlacer claims no rights over your content.'}
              </p>
            </div>
            <p>
              {isTR
                ? 'MockPlacer platformu, arayüz tasarımı, algoritmaları ve dahili mockup şablonları MockPlacer\'a aittir ve telif hakkı yasalarıyla korunmaktadır. İzin alınmadan kopyalanamaz veya dağıtılamaz.'
                : 'The MockPlacer platform, interface design, algorithms, and built-in mockup templates are the property of MockPlacer and protected by copyright law. They may not be copied or distributed without permission.'}
            </p>
          </div>

          <div className="terms-divider" />

          {/* 4. Payment Terms */}
          <div className="terms-section">
            <h2>{isTR ? 'Ödeme Koşulları' : 'Payment Terms'}</h2>
            <p>
              {isTR
                ? 'Ücretli planlar LemonSqueezy aracılığıyla sunulur. Ödeme, abonelik başladığında tahsil edilir ve seçilen fatura dönemine (aylık veya yıllık) göre otomatik olarak yenilenir.'
                : 'Paid plans are offered through LemonSqueezy. Payment is collected when a subscription starts and renews automatically according to the chosen billing period (monthly or annual).'}
            </p>
            <ul>
              <li>{isTR ? 'Fiyatlar USD cinsindendir ve geçerli vergiler hariçtir.' : 'Prices are in USD and exclusive of any applicable taxes.'}</li>
              <li>{isTR ? 'Aboneliğinizi istediğiniz zaman iptal edebilirsiniz; mevcut dönem sonuna kadar erişiminiz devam eder.' : 'You may cancel your subscription at any time; access continues until the end of the current billing period.'}</li>
              <li>{isTR ? 'Ödeme bilgileriniz MockPlacer tarafından saklanmaz; tüm işlemler LemonSqueezy tarafından güvenli şekilde yönetilir.' : 'Your payment details are not stored by MockPlacer; all transactions are securely handled by LemonSqueezy.'}</li>
            </ul>
          </div>

          <div className="terms-divider" />

          {/* 5. Refund Policy */}
          <div className="terms-section">
            <h2>{isTR ? 'İade Politikası' : 'Refund Policy'}</h2>
            <p>
              {isTR
                ? 'MockPlacer, anında dijital erişim sağlayan bir yazılım hizmetidir. Bu nedenle, ödeme gerçekleştikten sonra iade yapılmamaktadır.'
                : 'MockPlacer is a software service that provides instant digital access. Payments are non-refundable once a charge is made.'}
            </p>
            <p>
              {isTR
                ? 'Hizmetle ilgili teknik bir sorun hizmetten yararlanmanızı engelliyorsa lütfen bizimle iletişime geçin. Her durum bireysel olarak değerlendirilir.'
                : 'If a technical issue prevented you from using the service, please contact us. Each case is reviewed individually.'}
            </p>
          </div>

          <div className="terms-divider" />

          {/* 6. Limitation of Liability */}
          <div className="terms-section">
            <h2>{isTR ? 'Sorumluluk Sınırlaması' : 'Limitation of Liability'}</h2>
            <p>
              {isTR
                ? 'MockPlacer, hizmet kesintileri, veri kaybı veya hizmetin kullanımından kaynaklanan dolaylı ya da arızi zararlardan sorumlu tutulamaz.'
                : 'MockPlacer shall not be liable for any indirect or incidental damages, including service interruptions, data loss, or damages arising from use of the service.'}
            </p>
            <p>
              {isTR
                ? 'Hizmet, olduğu gibi ve mevcut haliyle sunulmaktadır. Kesintisiz veya hatasız çalışacağına dair herhangi bir garanti verilmemektedir.'
                : 'The service is provided as-is and as-available. No warranty is made that it will operate without interruption or error.'}
            </p>
          </div>

          <div className="terms-divider" />

          {/* 7. Termination */}
          <div className="terms-section">
            <h2>{isTR ? 'Hesap Sonlandırma' : 'Termination'}</h2>
            <p>
              {isTR
                ? 'Bu koşulları ihlal etmeniz durumunda MockPlacer, hesabınızı önceden bildirimde bulunmaksızın askıya alabilir veya sonlandırabilir.'
                : 'MockPlacer may suspend or terminate your account without prior notice if you violate these terms.'}
            </p>
            <p>
              {isTR
                ? 'Hesabınızı dilediğiniz zaman kapatabilirsiniz. Hesap kapatma, kalan abonelik süresi için iade hakkı doğurmaz.'
                : 'You may close your account at any time. Account closure does not entitle you to a refund for any remaining subscription period.'}
            </p>
          </div>

          <div className="terms-divider" />

          {/* 8. Changes to Terms */}
          <div className="terms-section">
            <h2>{isTR ? 'Koşullardaki Değişiklikler' : 'Changes to Terms'}</h2>
            <p>
              {isTR
                ? 'MockPlacer bu koşulları zaman zaman güncelleyebilir. Önemli değişiklikler için kayıtlı e-posta adresinize bildirim gönderilecektir. Güncelleme tarihinden sonra hizmeti kullanmaya devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelir.'
                : 'MockPlacer may update these terms from time to time. For significant changes, a notification will be sent to your registered email. Continued use of the service after the update date constitutes acceptance of the new terms.'}
            </p>
          </div>

          <div className="terms-divider" />

          {/* 9. Contact */}
          <div className="terms-section">
            <h2>{isTR ? 'İletişim' : 'Contact'}</h2>
            <p>
              {isTR
                ? <>Bu koşullarla ilgili sorularınız için: <a href="mailto:info@mockplacer.com">info@mockplacer.com</a></>
                : <>For any questions about these terms: <a href="mailto:info@mockplacer.com">info@mockplacer.com</a></>}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
