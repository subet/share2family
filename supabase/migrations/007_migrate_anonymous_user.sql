-- 007_migrate_anonymous_user.sql
-- Transfer ownership of an anonymous user's data to the calling permanent user.
-- Used when an anonymous user signs in with Apple/Google to "upgrade" their account.

CREATE OR REPLACE FUNCTION public.migrate_anonymous_user_data(p_old_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new_user_id uuid := auth.uid();
  v_old_is_anon boolean;
  v_new_is_anon boolean;
  v_old_display_name text;
  v_old_avatar_emoji text;
BEGIN
  IF v_new_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_new_user_id = p_old_user_id THEN
    RETURN;
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

  SELECT display_name, avatar_emoji
    INTO v_old_display_name, v_old_avatar_emoji
    FROM public.profiles
    WHERE id = p_old_user_id;

  -- Ensure new user has a profile, copying old display_name/avatar
  INSERT INTO public.profiles (id, display_name, avatar_emoji)
  VALUES (
    v_new_user_id,
    COALESCE(v_old_display_name, 'User'),
    COALESCE(v_old_avatar_emoji, '😊')
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = COALESCE(v_old_display_name, public.profiles.display_name),
        avatar_emoji = COALESCE(v_old_avatar_emoji, public.profiles.avatar_emoji);

  -- Reassign all rows that reference the old profile
  UPDATE public.family_members SET user_id = v_new_user_id WHERE user_id = p_old_user_id;
  UPDATE public.notes SET created_by = v_new_user_id WHERE created_by = p_old_user_id;
  UPDATE public.notes SET updated_by = v_new_user_id WHERE updated_by = p_old_user_id;
  UPDATE public.checklist_items SET created_by = v_new_user_id WHERE created_by = p_old_user_id;
  UPDATE public.item_history SET user_id = v_new_user_id WHERE user_id = p_old_user_id;
  UPDATE public.devices SET user_id = v_new_user_id WHERE user_id = p_old_user_id;

  -- Old profile no longer referenced; remove it and the anon auth row
  DELETE FROM public.profiles WHERE id = p_old_user_id;
  DELETE FROM auth.users WHERE id = p_old_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_anonymous_user_data(uuid) TO authenticated;
