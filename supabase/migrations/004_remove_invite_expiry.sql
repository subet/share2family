-- Remove invite code expiration: codes should never expire
-- Update the create_family_with_code function to set expires_at to null
create or replace function create_family_with_code(p_name text, p_creator_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_family_id uuid;
  v_code text;
  v_exists boolean;
begin
  -- Generate unique invite code
  loop
    v_code := generate_invite_code();
    select exists(select 1 from families where invite_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;

  -- Create family (no expiry on invite code)
  insert into families (name, invite_code, invite_code_expires_at, max_members)
  values (p_name, v_code, null, 2)
  returning id into v_family_id;

  -- Add creator as admin
  insert into family_members (family_id, user_id, role)
  values (v_family_id, p_creator_id, 'admin');

  -- Seed default categories
  perform seed_default_categories(v_family_id);

  return json_build_object(
    'id', v_family_id,
    'name', p_name,
    'invite_code', v_code
  );
end;
$$;

-- Clear expiry on any existing families
update families set invite_code_expires_at = null where invite_code_expires_at is not null;
