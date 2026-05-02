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
