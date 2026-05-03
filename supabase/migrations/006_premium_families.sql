-- 006_premium_families.sql
-- Add premium support to families for family-wide premium access

-- Add is_premium column
ALTER TABLE families ADD COLUMN is_premium boolean NOT NULL DEFAULT false;

-- ============================================================
-- RPC: Check if a family can accept new members (pre-join check)
-- ============================================================
CREATE OR REPLACE FUNCTION check_family_can_join(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family record;
  v_member_count integer;
BEGIN
  -- Find family by code
  SELECT * INTO v_family
    FROM families
    WHERE invite_code = upper(replace(p_code, '-', ''))
      AND (invite_code_expires_at IS NULL OR invite_code_expires_at > now());

  IF v_family IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Count current members
  SELECT count(*) INTO v_member_count
    FROM family_members
    WHERE family_id = v_family.id;

  RETURN json_build_object(
    'family_id', v_family.id,
    'family_name', v_family.name,
    'member_count', v_member_count,
    'max_members', v_family.max_members,
    'is_premium', v_family.is_premium
  );
END;
$$;

-- ============================================================
-- RPC: Upgrade a family to premium
-- ============================================================
CREATE OR REPLACE FUNCTION upgrade_family_to_premium(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE families
    SET is_premium = true,
        max_members = 10
    WHERE id = p_family_id;
END;
$$;

-- ============================================================
-- Update invite code invalidation trigger
-- Only nullify invite code for non-premium families
-- Premium families keep their code for 3+ members
-- ============================================================
CREATE OR REPLACE FUNCTION invalidate_invite_code_on_join()
RETURNS trigger AS $$
DECLARE
  member_count integer;
  v_is_premium boolean;
BEGIN
  SELECT count(*) INTO member_count
    FROM family_members
    WHERE family_id = new.family_id;

  SELECT is_premium INTO v_is_premium
    FROM families
    WHERE id = new.family_id;

  -- Only invalidate for non-premium families
  IF member_count >= 2 AND NOT v_is_premium THEN
    UPDATE families
      SET invite_code = NULL,
          invite_code_expires_at = NULL
      WHERE id = new.family_id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql;
