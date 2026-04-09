-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Enable RLS on reviews, add missing profile columns + policies
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. profiles: add columns that the profile settings page uses ─────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS country      TEXT,
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS age          INTEGER,
  ADD COLUMN IF NOT EXISTS phone        TEXT;


-- ── 2. profiles: add INSERT policy so upsert works for the first save ────────
--    (the auto-create trigger uses SECURITY DEFINER and bypasses RLS, but the
--    profile page does an explicit upsert which needs INSERT permission)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;


-- ── 3. reviews: enable RLS (was explicitly disabled during initial setup) ─────

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;


-- ── 4. reviews: create policies ───────────────────────────────────────────────

-- Public read — reviews are testimonials, visible to everyone
CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Authenticated users can submit a review
CREATE POLICY "Users can insert own review"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR auth.uid() = user_id)
  );

-- Users can update only their own review
CREATE POLICY "Users can update own review"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete only their own review
CREATE POLICY "Users can delete own review"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);
