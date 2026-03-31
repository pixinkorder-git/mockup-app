'use client';

import { useState } from 'react';
import Image from 'next/image';

const PLANS = {
  basic: {
    name: 'Basic',
    monthlyPrice: 5,
    yearlyPrice: 48,
    monthlyLink: 'https://mockplacer.lemonsqueezy.com/checkout/buy/403b32f8-9722-469a-9ce4-497acaa131d2',
    yearlyLink: 'https://mockplacer.lemonsqueezy.com/checkout/buy/bf285ed6-8825-4769-b7d2-cb22474aad09',
    features: [
      '15 generates per day',
      'Up to 30 images per generate',
      'PNG download',
      'ZIP download',
      'Browser-based, no upload',
    ],
    popular: false,
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 10,
    yearlyPrice: 84,
    monthlyLink: 'https://mockplacer.lemonsqueezy.com/checkout/buy/0dc6f329-5943-4183-a9e1-abcdd1a82299',
    yearlyLink: 'https://mockplacer.lemonsqueezy.com/checkout/buy/bbb2a9fa-d965-4488-a695-824d2851ec3e',
    features: [
      'Unlimited generates',
      'Up to 30 images per generate',
      'PNG download',
      'ZIP download',
      'Mockup library access (coming soon)',
      'Browser-based, no upload',
      'Early access to new features',
    ],
    popular: true,
  },
};

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="#FF6B35" fillOpacity="0.12" />
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #fff; color: #1a1a1a; }

        .pricing-wrap {
          min-height: 100vh;
          background: #fff;
          font-family: 'Satoshi', sans-serif;
        }

        /* NAV */
        .pricing-nav {
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
        .pricing-nav a { text-decoration: none; }
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
        .pricing-hero {
          text-align: center;
          padding: 72px 24px 48px;
        }
        .pricing-badge {
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
        .pricing-title {
          font-family: 'Clash Display', sans-serif;
          font-size: clamp(2.2rem, 5vw, 3.4rem);
          font-weight: 600;
          line-height: 1.12;
          color: #1a1a1a;
          margin-bottom: 16px;
        }
        .pricing-title em {
          font-style: normal;
          color: #FF6B35;
        }
        .pricing-sub {
          color: #666;
          font-size: 1.05rem;
          max-width: 480px;
          margin: 0 auto 36px;
          line-height: 1.6;
        }

        /* TOGGLE */
        .toggle-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 56px;
        }
        .toggle-label {
          font-size: 0.95rem;
          font-weight: 500;
          color: #1a1a1a;
        }
        .toggle-label.muted { color: #999; }
        .toggle-switch {
          position: relative;
          width: 48px;
          height: 26px;
          cursor: pointer;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-track {
          position: absolute;
          inset: 0;
          background: #e5e5e5;
          border-radius: 100px;
          transition: background 0.22s;
        }
        .toggle-switch input:checked + .toggle-track { background: #FF6B35; }
        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.22s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        }
        .toggle-switch input:checked ~ .toggle-thumb { transform: translateX(22px); }
        .save-badge {
          background: rgba(255,107,53,0.1);
          color: #FF6B35;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 100px;
        }

        /* CARDS */
        .plans-grid {
          display: flex;
          justify-content: center;
          gap: 24px;
          padding: 0 24px 80px;
          flex-wrap: wrap;
        }

        .plan-card {
          background: #fff;
          border: 1px solid #E5E5E5;
          border-radius: 20px;
          padding: 36px 32px;
          width: 340px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.10), 0 16px 48px rgba(0,0,0,0.08);
        }
        .plan-card.popular {
          border-color: #FF6B35;
          box-shadow: 0 1px 3px rgba(255,107,53,0.08), 0 8px 40px rgba(255,107,53,0.14);
        }
        .plan-card.popular:hover {
          box-shadow: 0 4px 24px rgba(255,107,53,0.16), 0 16px 56px rgba(255,107,53,0.18);
        }

        .popular-badge {
          position: absolute;
          top: -13px;
          left: 50%;
          transform: translateX(-50%);
          background: #FF6B35;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 4px 16px;
          border-radius: 100px;
          white-space: nowrap;
        }

        .plan-name {
          font-family: 'Clash Display', sans-serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 4px;
        }
        .plan-tagline {
          font-size: 0.88rem;
          color: #999;
          margin-bottom: 24px;
        }

        .plan-price {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          margin-bottom: 6px;
        }
        .plan-currency {
          font-size: 1.2rem;
          font-weight: 600;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .plan-amount {
          font-family: 'Clash Display', sans-serif;
          font-size: 3rem;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1;
        }
        .plan-period {
          font-size: 0.9rem;
          color: #999;
          margin-bottom: 6px;
          line-height: 2;
        }
        .plan-yearly-note {
          font-size: 0.82rem;
          color: #FF6B35;
          font-weight: 500;
          margin-bottom: 28px;
          min-height: 20px;
        }

        .plan-divider {
          height: 1px;
          background: #f0f0f0;
          margin-bottom: 24px;
        }

        .plan-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }
        .plan-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.93rem;
          color: #444;
        }

        .plan-cta {
          display: block;
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          font-size: 0.97rem;
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s, opacity 0.2s;
          border: none;
        }
        .plan-cta.primary {
          background: #FF6B35;
          color: #fff;
          box-shadow: 0 4px 20px rgba(255,107,53,0.3);
        }
        .plan-cta.primary:hover {
          background: #E85A28;
          box-shadow: 0 6px 28px rgba(255,107,53,0.4);
        }
        .plan-cta.secondary {
          background: #f7f7f7;
          color: #1a1a1a;
        }
        .plan-cta.secondary:hover { background: #efefef; }

        /* FREE TIER NOTE */
        .free-note {
          text-align: center;
          color: #999;
          font-size: 0.88rem;
          padding-bottom: 56px;
        }
        .free-note a {
          color: #FF6B35;
          text-decoration: none;
          font-weight: 500;
        }
        .free-note a:hover { text-decoration: underline; }

        @media (max-width: 720px) {
          .pricing-nav { padding: 0 20px; }
          .plan-card { width: 100%; max-width: 380px; }
        }
      `}</style>

      <div className="pricing-wrap">
        {/* NAV */}
        <nav className="pricing-nav">
          <a href="/" className="back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to MockPlacer
          </a>
          <a href="/">
            <Image src="/1logo.png" width={140} height={35} alt="MockPlacer" style={{ display: 'block' }} />
          </a>
        </nav>

        {/* HERO */}
        <div className="pricing-hero">
          <div className="pricing-badge">Pricing</div>
          <h1 className="pricing-title">
            Simple, <em>Transparent</em><br />Pricing
          </h1>
          <p className="pricing-sub">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>

          {/* TOGGLE */}
          <div className="toggle-wrap">
            <span className={`toggle-label${yearly ? ' muted' : ''}`}>Monthly</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={yearly}
                onChange={() => setYearly(v => !v)}
              />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
            <span className={`toggle-label${!yearly ? ' muted' : ''}`}>Yearly</span>
            {yearly && <span className="save-badge">Save up to 30%</span>}
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="plans-grid">
          {(Object.values(PLANS) as typeof PLANS[keyof typeof PLANS][]).map((plan) => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const link = yearly ? plan.yearlyLink : plan.monthlyLink;
            const monthlyEquiv = yearly ? (plan.yearlyPrice / 12).toFixed(2) : null;
            const savePct = plan.name === 'Basic' ? 20 : 30;

            return (
              <div key={plan.name} className={`plan-card${plan.popular ? ' popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}

                <div className="plan-name">{plan.name}</div>
                <div className="plan-tagline">
                  {plan.name === 'Basic' ? 'Perfect for occasional creators' : 'For serious sellers and designers'}
                </div>

                <div className="plan-price">
                  <span className="plan-currency">$</span>
                  <span className="plan-amount">{price}</span>
                </div>
                <div className="plan-period">/{yearly ? 'year' : 'month'}</div>
                <div className="plan-yearly-note">
                  {yearly
                    ? `~$${monthlyEquiv}/mo — save ${savePct}%`
                    : '\u00a0'}
                </div>

                <div className="plan-divider" />

                <ul className="plan-features">
                  {plan.features.map(f => (
                    <li key={f}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={link}
                  className={`plan-cta${plan.popular ? ' primary' : ' secondary'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get {plan.name}
                </a>
              </div>
            );
          })}
        </div>

        {/* FREE NOTE */}
        <p className="free-note">
          Not ready to commit? <a href="https://mockplacer.com/app">Try the free tier</a> — 1 generate/day, no signup required.
        </p>
      </div>
    </>
  );
}
