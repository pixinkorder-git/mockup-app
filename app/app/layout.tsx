// Light-theme layout for the /app tool route.
// Loads Clash Display + Satoshi from Fontshare and overrides the dark
// globals.css variables so every child component picks up the light theme.

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const lightTheme = `
    :root {
      --bg: #FFFFFF;
      --surface: #FFFFFF;
      --surface-2: #F8F7F5;
      --surface-3: #EDECE9;
      --border: #E5E5E5;
      --border-2: #D0CFCD;
      --accent: #FF6B35;
      --accent-dim: #E85A28;
      --accent-glow: rgba(255,107,53,0.12);
      --text: #151515;
      --text-2: #737373;
      --text-3: #A3A3A3;
      --success: #2D7A2D;
      --danger: #CC3300;
      --font-display: 'Clash Display', sans-serif;
      --font-body: 'Satoshi', system-ui, sans-serif;
    }
    html { color-scheme: light; }
    body { background: #FFFFFF; color: #151515; font-family: 'Satoshi', system-ui, sans-serif; }
  `;

  return (
    <>
      {/* Fontshare — Clash Display (headings) + Satoshi (body) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap"
        rel="stylesheet"
      />
      {/* Override dark globals for this route */}
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: lightTheme }} />
      {children}
    </>
  );
}
