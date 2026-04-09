import { readFileSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export const metadata: Metadata = {
  title: 'MockPlacer | Bulk Mockup Generator',
  description:
    'Upload your mockup template, add artwork, mark the frames. MockPlacer generates 30 professional mockups in seconds. Free, no signup required.',
};

export default async function LandingPage() {
  // Auth check is outside try-catch because redirect() throws a special
  // Next.js exception that must not be caught.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/app');
  }

  let mpReviews: { name: string | null; avatar_url: string | null; rating: number; comment: string | null; created_at: string }[] = [];
  try {
    // Fetch top reviews (rating >= 4 and has a comment) for testimonials
    const { data: reviews } = await supabase
      .from('reviews')
      .select('name, avatar_url, rating, comment, created_at')
      .gte('rating', 4)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6);
    if (reviews) mpReviews = reviews;
  } catch {
    // Not critical — landing page still renders without reviews
  }

  const html = readFileSync(join(process.cwd(), 'mockplacer-landing.html'), 'utf-8');

  // Extract <style> block content
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const styleContent = styleMatch ? styleMatch[1] : '';

  // Extract body content (everything between <body> and </body>, minus scripts)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const rawBody = bodyMatch ? bodyMatch[1] : '';

  // Separate out <script> blocks so they can be rendered as proper script elements
  const scriptBlocks: string[] = [];
  const bodyWithoutScripts = rawBody.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, content) => {
    scriptBlocks.push(content);
    return '';
  });

  return (
    <>
      {/* External fonts used by the landing page */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap"
        rel="stylesheet"
      />

      {/* Landing page styles — override dark globals for this route */}
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: styleContent }} />

      {/* Inject reviews for landing page (user is always null here — logged-in users are redirected to /app) */}
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: `window.__mpUser = null; window.__mpReviews = ${JSON.stringify(mpReviews)};` }} />

      {/* Landing page body HTML */}
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: bodyWithoutScripts }} />

      {/* Inline scripts (i18n, nav scroll, animations) */}
      {scriptBlocks.map((script, i) => (
        // eslint-disable-next-line react/no-danger
        <script key={i} dangerouslySetInnerHTML={{ __html: script }} />
      ))}

      {/* LandingNavAuth is not needed here: logged-in users are redirected to
          /app before this renders, so the nav always shows Sign In. */}
    </>
  );
}
