-- Add updated_at to checklist_items for LWW conflict resolution in offline sync
alter table checklist_items add column updated_at timestamptz not null default now();

-- Reuse existing trigger function to auto-update updated_at on modification
create trigger trg_checklist_items_updated_at
  before update on checklist_items
  for each row execute function update_notes_updated_at();

-- Backfill existing rows: use completed_at if available, otherwise created_at
update checklist_items set updated_at = coalesce(completed_at, created_at);
