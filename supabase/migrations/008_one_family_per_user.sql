-- 008_one_family_per_user.sql
-- Enforce: each user can be a member of at most one family.
-- Update create/join/migrate RPCs to handle this rule with friendly errors.

-- ============================================================
-- 1. Sanity-check existing data, then add UNIQUE(user_id)
-- ============================================================
DO $$
DECLARE
  v_dup_count integer;
BEGIN
  SELECT count(*) INTO v_dup_count FROM (
    SELECT user_id FROM family_members GROUP BY user_id HAVING count(*) > 1
  ) dups;
  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce one-family-per-user: % user(s) belong to multiple families. Clean up first.', v_dup_count;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'family_members_user_id_key'
  ) THEN
    ALTER TABLE family_members
      ADD CONSTRAINT family_members_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- 2. create_family_with_code: refuse if caller already has a family
-- ============================================================
CREATE OR REPLACE FUNCTION create_family_with_code(
  p_name text,
  p_creator_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id uuid;
  v_code text;
  v_exists boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = p_creator_id) THEN
    RAISE EXCEPTION 'You already belong to a family';
  END IF;

  LOOP
    v_code := generate_invite_code();
    SELECT EXISTS(SELECT 1 FROM families WHERE invite_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO families (name, invite_code, invite_code_expires_at, max_members)
  VALUES (p_name, v_code, now() + interval '7 days', 2)
  RETURNING id INTO v_family_id;

  INSERT INTO family_members (family_id, user_id, role)
  VALUES (v_family_id, p_creator_id, 'admin');

  PERFORM seed_default_categories(v_family_id);

  RETURN json_build_object(
    'id', v_family_id,
    'name', p_name,
    'invite_code', v_code
  );
END;
$$;

-- ============================================================
-- 3. join_family_with_code: refuse if caller already has a family
-- ============================================================
CREATE OR REPLACE FUNCTION join_family_with_code(
  p_code text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family record;
BEGIN
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'You already belong to a family';
  END IF;

  SELECT * INTO v_family
    FROM families
    WHERE invite_code = upper(replace(p_code, '-', ''))
      AND (invite_code_expires_at IS NULL OR invite_code_expires_at > now());

  IF v_family IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  INSERT INTO family_members (family_id, user_id, role)
  VALUES (v_family.id, p_user_id, 'member');

  RETURN json_build_object(
    'family_id', v_family.id,
    'family_name', v_family.name
  );
END;
$$;

-- ============================================================
-- 4. migrate_anonymous_user_data: branch on whether new user has data
-- Returns one of: 'migrated' | 'kept_existing' | 'no_op'
-- (Drop first: 007 created this with RETURNS void; we're widening the return type.)
-- ============================================================
DROP FUNCTION IF EXISTS public.migrate_anonymous_user_data(uuid);

CREATE FUNCTION public.migrate_anonymous_user_data(p_old_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new_user_id uuid := auth.uid();
  v_old_is_anon boolean;
  v_new_is_anon boolean;
  v_new_has_family boolean;
  v_old_display_name text;
  v_old_avatar_emoji text;
BEGIN
  IF v_new_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_new_user_id = p_old_user_id THEN
    RETURN 'no_op';
  END IF;

  SELECT is_anonymous INTO v_new_is_anon FROM auth.users WHERE id = v_new_user_id;
  IF v_new_is_anon IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Caller must be a permanent (non-anonymous) user';
  END IF;

  SELECT is_anonymous INTO v_old_is_anon FROM auth.users WHERE id = p_old_user_id;
  IF v_old_is_anon IS NULL THEN
    RAISE EXCEPTION 'Source user not found';
  END IF;
  IF v_old_is_anon = false THEN
    RAISE EXCEPTION 'Source user is not anonymous; refusing to migrate';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.family_members WHERE user_id = v_new_user_id)
    INTO v_new_has_family;

  IF v_new_has_family THEN
    -- Permanent account already has a family. Discard anon data.
    UPDATE public.notes SET created_by = NULL WHERE created_by = p_old_user_id;
    UPDATE public.notes SET updated_by = NULL WHERE updated_by = p_old_user_id;
    UPDATE public.checklist_items SET created_by = NULL WHERE created_by = p_old_user_id;
    -- family_members, item_history, devices cascade via profiles ON DELETE CASCADE
    DELETE FROM public.profiles WHERE id = p_old_user_id;
    DELETE FROM auth.users WHERE id = p_old_user_id;
    RETURN 'kept_existing';
  END IF;

  SELECT display_name, avatar_emoji
    INTO v_old_display_name, v_old_avatar_emoji
    FROM public.profiles
    WHERE id = p_old_user_id;

  INSERT INTO public.profiles (id, display_name, avatar_emoji)
  VALUES (
    v_new_user_id,
    COALESCE(v_old_display_name, 'User'),
    COALESCE(v_old_avatar_emoji, '😊')
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(v_old_display_name, public.profiles.display_name),
        avatar_emoji = COALESCE(v_old_avatar_emoji, public.profiles.avatar_emoji);

  UPDATE public.family_members SET user_id = v_new_user_id WHERE user_id = p_old_user_id;
  UPDATE public.notes SET created_by = v_new_user_id WHERE created_by = p_old_user_id;
  UPDATE public.notes SET updated_by = v_new_user_id WHERE updated_by = p_old_user_id;
  UPDATE public.checklist_items SET created_by = v_new_user_id WHERE created_by = p_old_user_id;
  UPDATE public.item_history SET user_id = v_new_user_id WHERE user_id = p_old_user_id;
  UPDATE public.devices SET user_id = v_new_user_id WHERE user_id = p_old_user_id;

  DELETE FROM public.profiles WHERE id = p_old_user_id;
  DELETE FROM auth.users WHERE id = p_old_user_id;

  RETURN 'migrated';
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_anonymous_user_data(uuid) TO authenticated;
