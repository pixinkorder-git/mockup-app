import type { Metadata } from 'next';
import { Bebas_Neue, Syne, JetBrains_Mono } from 'next/font/google';
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
  title: 'MockPlacer - Bulk Mockup Generator',
  description: 'Upload your art and mockup templates, pin frames, generate all combinations in bulk',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${bebasNeue.variable} ${syne.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
