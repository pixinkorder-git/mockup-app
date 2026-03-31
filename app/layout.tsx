import type { Metadata } from 'next';
import { Bebas_Neue, Syne, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

const syne = Syne({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
});

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
      <body className={`${bebasNeue.variable} ${syne.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
