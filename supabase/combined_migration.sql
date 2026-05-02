-- 001_initial_schema.sql
-- Share2Family database schema
-- Designed for v1 (checklist only) but extensible for v2+ note types

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'User',
  avatar_emoji text not null default '😊',
  created_at timestamptz not null default now()
);

-- ============================================================
-- FAMILIES
-- ============================================================
create table families (
  id uuid primary key default uuid_generate_v4(),
  name text,
  invite_code text unique,
  invite_code_expires_at timestamptz,
  max_members integer not null default 2,
  created_at timestamptz not null default now()
);

-- Index for invite code lookups
create index idx_families_invite_code on families (invite_code)
  where invite_code is not null;

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================
create table family_members (
  family_id uuid not null references families on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Index to quickly find a user's families
create index idx_family_members_user on family_members (user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families on delete cascade,
  name text not null,
  emoji text,
  color text,
  position integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_categories_family on categories (family_id);

-- ============================================================
-- NOTES (generic container for all note types)
-- ============================================================
create table notes (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families on delete cascade,
  category_id uuid references categories on delete set null,
  type text not null check (type in ('checklist')),
  title text not null,
  emoji text,
  position integer not null default 0,
  created_by uuid references profiles,
  updated_by uuid references profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_notes_family on notes (family_id)
  where archived_at is null;

-- ============================================================
-- CHECKLIST ITEMS
-- ============================================================
create table checklist_items (
  id uuid primary key default uuid_generate_v4(),
  note_id uuid not null references notes on delete cascade,
  content text not null,
  is_completed boolean not null default false,
  position integer not null default 0,
  created_by uuid references profiles,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_checklist_items_note on checklist_items (note_id);

-- ============================================================
-- ITEM HISTORY (for smart suggestions)
-- ============================================================
create table item_history (
  family_id uuid not null references families on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  item_name text not null,
  use_count integer not null default 1,
  last_used timestamptz not null default now(),
  primary key (family_id, item_name)
);

-- ============================================================
-- V2+ TABLES (created now for migration planning, unused in v1)
-- ============================================================
create table note_content (
  note_id uuid primary key references notes on delete cascade,
  body_markdown text,
  updated_at timestamptz not null default now()
);

create table devices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  device_name text,
  platform text check (platform in ('ios', 'android')),
  push_token text,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_devices_user on devices (user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on notes
create or replace function update_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_notes_updated_at
  before update on notes
  for each row execute function update_notes_updated_at();

-- Enforce max_members on family_members INSERT
create or replace function enforce_family_max_members()
returns trigger as $$
declare
  current_count integer;
  max_allowed integer;
begin
  select count(*) into current_count
    from family_members
    where family_id = new.family_id;

  select max_members into max_allowed
    from families
    where id = new.family_id;

  if current_count >= max_allowed then
    raise exception 'Family has reached the maximum number of members (%)', max_allowed;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_max_members
  before insert on family_members
  for each row execute function enforce_family_max_members();

-- Invalidate invite code on first successful join (after family has 2 members)
create or replace function invalidate_invite_code_on_join()
returns trigger as $$
declare
  member_count integer;
begin
  select count(*) into member_count
    from family_members
    where family_id = new.family_id;

  if member_count >= 2 then
    update families
      set invite_code = null,
          invite_code_expires_at = null
      where id = new.family_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_invalidate_invite_on_join
  after insert on family_members
  for each row execute function invalidate_invite_code_on_join();

-- Auto-set completed_at when is_completed changes
create or replace function update_checklist_item_completed()
returns trigger as $$
begin
  if new.is_completed = true and old.is_completed = false then
    new.completed_at = now();
  elsif new.is_completed = false and old.is_completed = true then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_checklist_item_completed
  before update on checklist_items
  for each row execute function update_checklist_item_completed();

-- Enable realtime for the tables we need to sync
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table checklist_items;
-- 002_rls_policies.sql
-- Row Level Security policies for Share2Family
-- CRITICAL: test every policy with both anon and authenticated roles

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table families enable row level security;
alter table family_members enable row level security;
alter table categories enable row level security;
alter table notes enable row level security;
alter table checklist_items enable row level security;
alter table item_history enable row level security;
alter table note_content enable row level security;
alter table devices enable row level security;

-- ============================================================
-- Helper function: check if user is a member of a family
-- ============================================================
create or replace function is_family_member(p_family_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from family_members
    where family_id = p_family_id
      and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

-- Helper: check if user is admin of a family
create or replace function is_family_admin(p_family_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from family_members
    where family_id = p_family_id
      and user_id = auth.uid()
      and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- Helper: get all family IDs for the current user
create or replace function user_family_ids()
returns setof uuid as $$
  select family_id from family_members where user_id = auth.uid();
$$ language sql security definer stable;

-- ============================================================
-- PROFILES
-- ============================================================
-- Users can read their own profile and profiles of family co-members
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or id in (
    select fm.user_id from family_members fm
    where fm.family_id in (select user_family_ids())
  )
);

-- Users can insert their own profile
create policy profiles_insert on profiles for insert with check (
  id = auth.uid()
);

-- Users can update their own profile
create policy profiles_update on profiles for update using (
  id = auth.uid()
);

-- ============================================================
-- FAMILIES
-- ============================================================
-- Members can read their own families
create policy families_select on families for select using (
  is_family_member(id)
);

-- Any authenticated user can create a family
create policy families_insert on families for insert with check (
  auth.uid() is not null
);

-- Members can update their family
create policy families_update on families for update using (
  is_family_member(id)
);

-- Only admin can delete a family
create policy families_delete on families for delete using (
  is_family_admin(id)
);

-- ============================================================
-- FAMILIES: Invite code lookup (for join flow)
-- Allows any authenticated user to look up a family by invite code
-- This is a limited SELECT that only works via the RPC function below
-- ============================================================

-- Public function to lookup invite code (returns limited info)
create or replace function lookup_invite_code(code text)
returns table (family_id uuid, family_name text) as $$
begin
  return query
    select f.id, f.name
    from families f
    where f.invite_code = code
      and (f.invite_code_expires_at is null or f.invite_code_expires_at > now());
end;
$$ language plpgsql security definer;

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================
-- Members can see other members of their families
create policy family_members_select on family_members for select using (
  is_family_member(family_id)
);

-- Insert allowed for authenticated users (trigger enforces max_members)
create policy family_members_insert on family_members for insert with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

-- Users can remove themselves (leave), admin can remove anyone
create policy family_members_delete on family_members for delete using (
  user_id = auth.uid()
  or is_family_admin(family_id)
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create policy categories_select on categories for select using (
  is_family_member(family_id)
);

create policy categories_insert on categories for insert with check (
  is_family_member(family_id)
);

create policy categories_update on categories for update using (
  is_family_member(family_id)
);

create policy categories_delete on categories for delete using (
  is_family_member(family_id)
);

-- ============================================================
-- NOTES
-- ============================================================
create policy notes_select on notes for select using (
  is_family_member(family_id)
);

create policy notes_insert on notes for insert with check (
  is_family_member(family_id)
);

create policy notes_update on notes for update using (
  is_family_member(family_id)
);

-- Soft delete only (via archived_at), but allow hard delete for cleanup
create policy notes_delete on notes for delete using (
  is_family_member(family_id)
);

-- ============================================================
-- CHECKLIST ITEMS
-- ============================================================
create policy checklist_items_select on checklist_items for select using (
  exists (
    select 1 from notes n
    where n.id = checklist_items.note_id
      and is_family_member(n.family_id)
  )
);

create policy checklist_items_insert on checklist_items for insert with check (
  exists (
    select 1 from notes n
    where n.id = note_id
      and is_family_member(n.family_id)
  )
);

create policy checklist_items_update on checklist_items for update using (
  exists (
    select 1 from notes n
    where n.id = checklist_items.note_id
      and is_family_member(n.family_id)
  )
);

create policy checklist_items_delete on checklist_items for delete using (
  exists (
    select 1 from notes n
    where n.id = checklist_items.note_id
      and is_family_member(n.family_id)
  )
);

-- ============================================================
-- ITEM HISTORY
-- ============================================================
-- Family members can read item history for their family
create policy item_history_select on item_history for select using (
  is_family_member(family_id)
);

-- Users can insert/update their own history
create policy item_history_insert on item_history for insert with check (
  user_id = auth.uid()
  and is_family_member(family_id)
);

create policy item_history_update on item_history for update using (
  user_id = auth.uid()
  and is_family_member(family_id)
);

-- ============================================================
-- V2+ tables (minimal policies for now)
-- ============================================================
create policy note_content_select on note_content for select using (
  exists (
    select 1 from notes n
    where n.id = note_content.note_id
      and is_family_member(n.family_id)
  )
);

create policy devices_select on devices for select using (
  user_id = auth.uid()
);

create policy devices_insert on devices for insert with check (
  user_id = auth.uid()
);

create policy devices_update on devices for update using (
  user_id = auth.uid()
);

create policy devices_delete on devices for delete using (
  user_id = auth.uid()
);
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
