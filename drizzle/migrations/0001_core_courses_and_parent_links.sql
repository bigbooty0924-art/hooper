ALTER TABLE public.scout_profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- NCAA core course checklist items
CREATE TABLE public.core_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  slot integer NOT NULL,
  course_name text,
  completed boolean NOT NULL DEFAULT false,
  grade text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category, slot)
);

CREATE INDEX core_courses_user_idx ON public.core_courses(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_courses TO authenticated;
GRANT ALL ON public.core_courses TO service_role;

ALTER TABLE public.core_courses ENABLE ROW LEVEL SECURITY;

-- Parent/player links
CREATE TABLE public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_user_id uuid NOT NULL,
  parent_user_id uuid,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  linked_at timestamptz
);

CREATE UNIQUE INDEX parent_links_active_code_idx
  ON public.parent_links(code) WHERE status = 'pending';
CREATE INDEX parent_links_player_idx ON public.parent_links(player_user_id);
CREATE INDEX parent_links_parent_idx ON public.parent_links(parent_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_links TO authenticated;
GRANT ALL ON public.parent_links TO service_role;

ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players manage their own link codes"
  ON public.parent_links FOR ALL TO authenticated
  USING (auth.uid() = player_user_id)
  WITH CHECK (auth.uid() = player_user_id);

CREATE POLICY "Parents can view their links"
  ON public.parent_links FOR SELECT TO authenticated
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents can revoke their links"
  ON public.parent_links FOR UPDATE TO authenticated
  USING (auth.uid() = parent_user_id)
  WITH CHECK (auth.uid() = parent_user_id);

-- helper: is the current user a linked parent of this player?
CREATE OR REPLACE FUNCTION public.is_linked_parent(p_player uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_links
    WHERE player_user_id = p_player
      AND parent_user_id = auth.uid()
      AND status = 'linked'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_linked_parent(uuid) TO authenticated, service_role;

CREATE POLICY "Owners manage their core courses"
  ON public.core_courses FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Linked parents can view core courses"
  ON public.core_courses FOR SELECT TO authenticated
  USING (public.is_linked_parent(user_id));

CREATE POLICY "Linked parents can view drill sessions"
  ON public.drill_sessions FOR SELECT TO authenticated
  USING (public.is_linked_parent(user_id));

CREATE POLICY "Linked parents can view player profile"
  ON public.scout_profiles FOR SELECT TO authenticated
  USING (public.is_linked_parent(user_id));

-- player generates a fresh 6-digit code
CREATE OR REPLACE FUNCTION public.create_parent_link_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.parent_links
    SET status = 'revoked'
    WHERE player_user_id = auth.uid() AND status = 'pending';

  LOOP
    new_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.parent_links WHERE code = new_code AND status = 'pending'
    );
  END LOOP;

  INSERT INTO public.parent_links (player_user_id, code)
  VALUES (auth.uid(), new_code);

  RETURN new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_parent_link_code() TO authenticated;

-- parent redeems a code
CREATE OR REPLACE FUNCTION public.redeem_parent_link_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.parent_links%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO target FROM public.parent_links
  WHERE code = p_code AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF target.id IS NULL THEN
    RAISE EXCEPTION 'That code is invalid or has expired';
  END IF;

  IF target.player_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot link to your own account';
  END IF;

  UPDATE public.parent_links
    SET parent_user_id = auth.uid(), status = 'linked', linked_at = now()
    WHERE id = target.id;

  RETURN target.player_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_parent_link_code(text) TO authenticated;
