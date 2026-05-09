-- 010_remove_family_member.sql
-- Admin-driven member removal that reassigns the removed member's content
-- (notes, checklist items, item history) to the calling admin so nothing is
-- lost. Also re-issues an invite code so the admin can invite a replacement.

CREATE OR REPLACE FUNCTION public.remove_family_member(
  p_family_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_member_count integer;
  v_max_members integer;
  v_existing_code text;
  v_new_code text;
  v_exists boolean;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'Admin cannot remove themselves; leave the family instead';
  END IF;

  -- Caller must be admin of the target family
  IF NOT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
      AND user_id = v_admin_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only family admin can remove members';
  END IF;

  -- Target user must currently be a member of this family
  IF NOT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this family';
  END IF;

  -- Reassign content created by the removed member to the admin so the
  -- family still sees their notes/items after removal.
  UPDATE notes
    SET created_by = v_admin_id
    WHERE family_id = p_family_id AND created_by = p_user_id;

  UPDATE notes
    SET updated_by = v_admin_id
    WHERE family_id = p_family_id AND updated_by = p_user_id;

  UPDATE checklist_items ci
    SET created_by = v_admin_id
    WHERE created_by = p_user_id
      AND EXISTS (
        SELECT 1 FROM notes n
        WHERE n.id = ci.note_id AND n.family_id = p_family_id
      );

  -- item_history PK is (family_id, item_name) so reassigning user_id is safe.
  UPDATE item_history
    SET user_id = v_admin_id
    WHERE family_id = p_family_id AND user_id = p_user_id;

  -- Finally remove the membership.
  DELETE FROM family_members
    WHERE family_id = p_family_id AND user_id = p_user_id;

  -- If the family is now below capacity and the invite code was nullified
  -- on the previous join, mint a fresh code so the admin can invite again.
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

GRANT EXECUTE ON FUNCTION public.remove_family_member(uuid, uuid) TO authenticated;
