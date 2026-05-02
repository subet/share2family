-- 003_seed_categories_function.sql
-- Function to seed default categories when a family is created
-- Called from app code after family creation

create or replace function seed_default_categories(p_family_id uuid)
returns void as $$
begin
  insert into categories (family_id, name, emoji, color, position, is_default)
  values
    (p_family_id, 'Shopping', '🛒', '#D97757', 0, true),
    (p_family_id, 'Movies & Books', '🎬', '#7B68EE', 1, true),
    (p_family_id, 'Home', '🏠', '#28A745', 2, true),
    (p_family_id, 'Personal', '💜', '#E91E8C', 3, true);
end;
$$ language plpgsql security definer;

-- Function to generate a random invite code
-- Uses only unambiguous characters: ABCDEFGHJKMNPQRSTUVWXYZ23456789
create or replace function generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Function to create a family with an invite code and seed categories
-- Returns the created family record
create or replace function create_family_with_code(
  p_name text,
  p_creator_id uuid
)
returns json as $$
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

  -- Create family
  insert into families (name, invite_code, invite_code_expires_at, max_members)
  values (p_name, v_code, now() + interval '7 days', 2)
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
$$ language plpgsql security definer;

-- Function to upsert item history with incrementing use_count
create or replace function upsert_item_history(
  p_family_id uuid,
  p_user_id uuid,
  p_item_name text
)
returns void as $$
begin
  insert into item_history (family_id, user_id, item_name, use_count, last_used)
  values (p_family_id, p_user_id, p_item_name, 1, now())
  on conflict (family_id, item_name)
  do update set
    use_count = item_history.use_count + 1,
    last_used = now();
end;
$$ language plpgsql security definer;

-- Function to join a family via invite code
create or replace function join_family_with_code(
  p_code text,
  p_user_id uuid
)
returns json as $$
declare
  v_family record;
begin
  -- Find valid family by code
  select * into v_family
    from families
    where invite_code = upper(replace(p_code, '-', ''))
      and (invite_code_expires_at is null or invite_code_expires_at > now());

  if v_family is null then
    raise exception 'Invalid or expired invite code';
  end if;

  -- Check user isn't already a member
  if exists (
    select 1 from family_members
    where family_id = v_family.id and user_id = p_user_id
  ) then
    raise exception 'You are already a member of this family';
  end if;

  -- Insert member (trigger enforces max_members)
  insert into family_members (family_id, user_id, role)
  values (v_family.id, p_user_id, 'member');

  return json_build_object(
    'family_id', v_family.id,
    'family_name', v_family.name
  );
end;
$$ language plpgsql security definer;
