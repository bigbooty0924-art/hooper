-- Scout profiles, media links and drill history

CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.scout_profiles WHERE slug = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE TABLE public.scout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT true,
  -- Player bio
  full_name text NOT NULL,
  class_year integer,
  height_inches integer,
  weight_lbs integer,
  wingspan_inches integer,
  position text,
  -- Team info
  high_school_team text,
  aau_team text,
  jersey_number text,
  head_coach_name text,
  head_coach_email text,
  head_coach_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scout_profiles
  ALTER COLUMN slug SET DEFAULT public.generate_profile_slug();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scout_profiles TO authenticated;
GRANT SELECT ON public.scout_profiles TO anon;
GRANT ALL ON public.scout_profiles TO service_role;

ALTER TABLE public.scout_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public scout profiles are viewable by anyone"
  ON public.scout_profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Owners can view their profile"
  ON public.scout_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can create their profile"
  ON public.scout_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their profile"
  ON public.scout_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their profile"
  ON public.scout_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Highlight reels (YouTube / Hudl)
CREATE TABLE public.profile_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.scout_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profile_media_profile_id_idx ON public.profile_media(profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_media TO authenticated;
GRANT SELECT ON public.profile_media TO anon;
GRANT ALL ON public.profile_media TO service_role;

ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media on public profiles is viewable by anyone"
  ON public.profile_media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.scout_profiles p
    WHERE p.id = profile_id AND p.is_public = true
  ));

CREATE POLICY "Owners can manage their media"
  ON public.profile_media FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.scout_profiles p
    WHERE p.id = profile_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.scout_profiles p
    WHERE p.id = profile_id AND p.user_id = auth.uid()
  ));

-- Drill history powering shooting analytics
CREATE TABLE public.drill_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drill_type text NOT NULL CHECK (drill_type IN ('free_throw', 'three_point')),
  attempts integer NOT NULL CHECK (attempts > 0),
  makes integer NOT NULL CHECK (makes >= 0),
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT makes_within_attempts CHECK (makes <= attempts)
);

CREATE INDEX drill_sessions_user_performed_idx
  ON public.drill_sessions(user_id, performed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drill_sessions TO authenticated;
GRANT ALL ON public.drill_sessions TO service_role;

ALTER TABLE public.drill_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their drill sessions"
  ON public.drill_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 30-day shooting averages for a public profile, readable without exposing raw drill rows
CREATE OR REPLACE FUNCTION public.scout_profile_shooting_stats(p_slug text)
RETURNS TABLE (
  ft_attempts integer,
  ft_makes integer,
  ft_pct numeric,
  three_attempts integer,
  three_makes integer,
  three_pct numeric,
  sessions_logged integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target AS (
    SELECT user_id FROM public.scout_profiles
    WHERE slug = p_slug AND is_public = true
  ), recent AS (
    SELECT d.*
    FROM public.drill_sessions d
    JOIN target t ON t.user_id = d.user_id
    WHERE d.performed_at >= now() - interval '30 days'
  )
  SELECT
    COALESCE(SUM(attempts) FILTER (WHERE drill_type = 'free_throw'), 0)::int,
    COALESCE(SUM(makes) FILTER (WHERE drill_type = 'free_throw'), 0)::int,
    ROUND(
      100.0 * COALESCE(SUM(makes) FILTER (WHERE drill_type = 'free_throw'), 0)
      / NULLIF(SUM(attempts) FILTER (WHERE drill_type = 'free_throw'), 0), 1),
    COALESCE(SUM(attempts) FILTER (WHERE drill_type = 'three_point'), 0)::int,
    COALESCE(SUM(makes) FILTER (WHERE drill_type = 'three_point'), 0)::int,
    ROUND(
      100.0 * COALESCE(SUM(makes) FILTER (WHERE drill_type = 'three_point'), 0)
      / NULLIF(SUM(attempts) FILTER (WHERE drill_type = 'three_point'), 0), 1),
    COUNT(*)::int
  FROM recent;
$$;

GRANT EXECUTE ON FUNCTION public.scout_profile_shooting_stats(text) TO anon, authenticated, service_role;

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER scout_profiles_touch_updated_at
  BEFORE UPDATE ON public.scout_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
