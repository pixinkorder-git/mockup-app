import { readFileSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import LandingNavAuth from '@/app/components/LandingNavAuth';

export const metadata: Metadata = {
  title: 'MockPlacer | Bulk Mockup Generator',
  description:
    'Upload your mockup template, add artwork, mark the frames. MockPlacer generates 30 professional mockups in seconds. Free, no signup required.',
};

export default async function LandingPage() {
  let mpUser: { email?: string; name?: string | null; avatar?: string | null; plan?: string } | null = null;
  let mpReviews: { name: string; avatar_url: string | null; rating: number; comment: string | null; created_at: string; occupation: string | null }[] = [];
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      mpUser = {
        email: user.email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        avatar: user.user_metadata?.avatar_url ?? null,
        plan: 'free',
      };
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, avatar_url')
        .eq('id', user.id)
        .single();
      if (profile?.plan === 'basic' || profile?.plan === 'pro') {
        mpUser.plan = profile.plan;
      }
      // Use profile avatar (latest uploaded) rather than OAuth metadata
      if (profile?.avatar_url) {
        mpUser.avatar = profile.avatar_url;
      }
    }
    // Fetch top reviews, then look up live profile data in a second query
    const { data: reviews } = await supabase
      .from('reviews')
      .select('user_id, name, avatar_url, rating, comment, created_at')
      .gte('rating', 4)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(6);

    if (reviews && reviews.length > 0) {
      const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, occupation')
        .in('id', userIds);

      const profileMap = new Map(profileRows?.map(p => [p.id, p]) || []);

      mpReviews = reviews.map(r => {
        const profile = profileMap.get(r.user_id);
        console.log('Profile data:', {
          user_id: r.user_id,
          profile: profile,
          firstName: profile?.first_name,
          lastName: profile?.last_name,
        });
        const firstName = profile?.first_name || r.name?.split(' ')[0] || 'User';
        const lastName = profile?.last_name || '';
        const capitalizedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : '';
        return {
          name: lastInitial ? `${capitalizedFirst} ${lastInitial}` : capitalizedFirst,
          avatar_url: profile?.avatar_url || r.avatar_url || null,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          occupation: profile?.occupation || null,
        };
      });
    }
  } catch {
    // Not critical — landing page still renders without auth or reviews
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

      {/* Inject auth state and reviews — <, >, & are unicode-escaped so </script> in user content can't close the tag early */}
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: `window.__mpUser = ${JSON.stringify(mpUser).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}; window.__mpReviews = ${JSON.stringify(mpReviews).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')};` }} />

      {/* Landing page body HTML */}
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: bodyWithoutScripts }} />

      {/* Inline scripts (i18n, nav scroll, animations) */}
      {scriptBlocks.map((script, i) => (
        // eslint-disable-next-line react/no-danger
        <script key={i} dangerouslySetInnerHTML={{ __html: script }} />
      ))}

      {/* Client component that owns #nav-auth-li and re-checks auth on every
          mount — including soft navigation. Fixes stale server-render display
          bug where users appeared logged out after router.push('/'). */}
      <LandingNavAuth initialUser={mpUser} />
    </>
  );
}
