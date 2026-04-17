import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mockplacer.com'),
  title: 'MockPlacer - Bulk Mockup Generator',
  description: 'Create professional mockups instantly. Upload your designs, auto-detect frames, generate bulk mockups. Free, fast, no setup required.',
  openGraph: {
    title: 'MockPlacer - Bulk Mockup Generator',
    description: 'Create professional mockups instantly. Free, fast, no setup.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MockPlacer - Bulk Mockup Generator',
    description: 'Create professional mockups instantly. Free, fast, no setup.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts — Outfit (display) + Plus Jakarta Sans (body) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-E7QGN4W75R"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-E7QGN4W75R');
          `}
        </Script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
