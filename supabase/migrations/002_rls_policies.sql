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
