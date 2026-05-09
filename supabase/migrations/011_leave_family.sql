-- 011_leave_family.sql
-- Replaces direct family_members deletion with an atomic RPC that handles:
--   1. A regular member leaving      -> reassign their content to the admin
--   2. The admin leaving             -> promote oldest other member to admin
--                                       and reassign content to them
--   3. The last member leaving       -> hard-delete the family (cascades wipe
--                                       notes, checklist_items, categories,
--                                       family_members, item_history)
-- Profiles and auth.users are intentionally left untouched.

CREATE OR REPLACE FUNCTION public.leave_family(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_member_count integer;
  v_max_members integer;
  v_existing_code text;
  v_target_id uuid;
  v_new_code text;
  v_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role
    FROM family_members
    WHERE family_id = p_family_id AND user_id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this family';
  END IF;

  SELECT count(*) INTO v_member_count
    FROM family_members WHERE family_id = p_family_id;

  -- Last member leaves: nuke the family. Cascades clear all related rows.
  IF v_member_count <= 1 THEN
    DELETE FROM families WHERE id = p_family_id;
    RETURN;
  END IF;

  -- Pick the transfer target.
  -- If the leaver is admin, promote the oldest other member to admin and use
  -- them as the transfer target. Otherwise, transfer to the existing admin.
  IF v_role = 'admin' THEN
    SELECT user_id INTO v_target_id
      FROM family_members
      WHERE family_id = p_family_id AND user_id <> v_user_id
      ORDER BY joined_at ASC
      LIMIT 1;

    IF v_target_id IS NULL THEN
      -- Defensive: count said >1 members but we found nobody else.
      RAISE EXCEPTION 'No other member found to receive content';
    END IF;

    UPDATE family_members
      SET role = 'admin'
      WHERE family_id = p_family_id AND user_id = v_target_id;
  ELSE
    SELECT user_id INTO v_target_id
      FROM family_members
      WHERE family_id = p_family_id AND role = 'admin'
      LIMIT 1;

    IF v_target_id IS NULL THEN
      -- Defensive: family with no admin shouldn't exist; fall back to oldest other.
      SELECT user_id INTO v_target_id
        FROM family_members
        WHERE family_id = p_family_id AND user_id <> v_user_id
        ORDER BY joined_at ASC
        LIMIT 1;
    END IF;
  END IF;

  -- Transfer the leaver's content to the target so nothing is lost.
  UPDATE notes
    SET created_by = v_target_id
    WHERE family_id = p_family_id AND created_by = v_user_id;

  UPDATE notes
    SET updated_by = v_target_id
    WHERE family_id = p_family_id AND updated_by = v_user_id;

  UPDATE checklist_items ci
    SET created_by = v_target_id
    WHERE created_by = v_user_id
      AND EXISTS (
        SELECT 1 FROM notes n
        WHERE n.id = ci.note_id AND n.family_id = p_family_id
      );

  UPDATE item_history
    SET user_id = v_target_id
    WHERE family_id = p_family_id AND user_id = v_user_id;

  -- Remove the leaver.
  DELETE FROM family_members
    WHERE family_id = p_family_id AND user_id = v_user_id;

  -- If the family fell below capacity and the invite code was nullified,
  -- mint a fresh one so the (possibly new) admin can invite a replacement.
  SELECT count(*) INTO v_member_count
    FROM family_members WHERE family_id = p_family_id;

  SELECT max_members, invite_code
    INTO v_max_members, v_existing_code
    FROM families WHERE id = p_family_id;

  IF v_existing_code IS NULL AND v_member_count < v_max_members THEN
    LOOP
      v_new_code := generate_invite_code();
      SELECT EXISTS(SELECT 1 FROM families WHERE invite_code = v_new_code)
        INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;

    UPDATE families
      SET invite_code = v_new_code,
          invite_code_expires_at = NULL
      WHERE id = p_family_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_family(uuid) TO authenticated;
