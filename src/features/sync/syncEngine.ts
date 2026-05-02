import { supabase } from '@/lib/supabase';
import { getQueue, removeFromQueue } from '@/lib/syncQueue';
import { getCached, setCache, cacheKeys } from '@/lib/offlineCache';
import * as notesApi from '@/features/notes/api';
import * as checklistApi from '@/features/checklists/api';
import * as familyApi from '@/features/families/api';
import type { NoteWithMeta } from '@/features/notes/api';
import type { ChecklistItem, Database } from '@/types/database';

type NotesInsert = Database['public']['Tables']['notes']['Insert'];
type NotesUpdate = Database['public']['Tables']['notes']['Update'];
type ChecklistInsert = Database['public']['Tables']['checklist_items']['Insert'];
type ChecklistUpdate = Database['public']['Tables']['checklist_items']['Update'];
type ProfilesUpdate = Database['public']['Tables']['profiles']['Update'];
type FamiliesUpdate = Database['public']['Tables']['families']['Update'];

/**
 * Replay all queued offline mutations against Supabase.
 * Processes sequentially (FIFO). Stops on network error.
 */
export async function replayQueue(): Promise<void> {
  const queue = getQueue();

  for (const mutation of queue) {
    try {
      await executeMutation(mutation.table, mutation.type, mutation.entityId, mutation.params);
      removeFromQueue(mutation.id);
    } catch (error: unknown) {
      // Network error → stop, retry later
      if (isNetworkError(error)) break;
      // Other errors (e.g., conflict, already deleted) → skip this mutation
      console.warn('[Sync] Skipping failed mutation:', mutation.id, error);
      removeFromQueue(mutation.id);
    }
  }
}

async function executeMutation(
  table: string,
  type: string,
  entityId: string,
  params: Record<string, unknown>,
): Promise<void> {
  switch (table) {
    case 'notes':
      await executeNoteMutation(type, entityId, params);
      break;
    case 'checklist_items':
      await executeChecklistMutation(type, entityId, params);
      break;
    case 'profiles':
      if (type === 'update') {
        await supabase.from('profiles').update(params as ProfilesUpdate).eq('id', entityId);
      }
      break;
    case 'families':
      if (type === 'update') {
        await supabase.from('families').update(params as FamiliesUpdate).eq('id', entityId);
      }
      break;
  }
}

async function executeNoteMutation(
  type: string,
  entityId: string,
  params: Record<string, unknown>,
): Promise<void> {
  switch (type) {
    case 'create': {
      // Check if already exists (e.g., replayed twice)
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('id', entityId)
        .maybeSingle();
      if (existing) return;
      await supabase.from('notes').insert({ id: entityId, ...params } as NotesInsert);
      break;
    }
    case 'update':
      await supabase.from('notes').update(params as NotesUpdate).eq('id', entityId);
      break;
    case 'delete':
      await supabase
        .from('notes')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', entityId);
      break;
  }
}

async function executeChecklistMutation(
  type: string,
  entityId: string,
  params: Record<string, unknown>,
): Promise<void> {
  switch (type) {
    case 'create': {
      const { data: existing } = await supabase
        .from('checklist_items')
        .select('id')
        .eq('id', entityId)
        .maybeSingle();
      if (existing) return;
      await supabase.from('checklist_items').insert({ id: entityId, ...params } as ChecklistInsert);
      break;
    }
    case 'update':
      await supabase.from('checklist_items').update(params as ChecklistUpdate).eq('id', entityId);
      break;
    case 'delete':
      await supabase.from('checklist_items').delete().eq('id', entityId);
      break;
  }
}

/**
 * Pull remote data and merge with local cache using LWW.
 * Called after queue replay to catch partner's changes.
 */
export async function pullRemoteChanges(
  familyId: string,
  userId: string,
): Promise<void> {
  // Pull remote notes
  const remoteNotes = await notesApi.getNotes(familyId);
  const localNotes = getCached<NoteWithMeta[]>(cacheKeys.notes(familyId)) ?? [];
  const mergedNotes = mergeByUpdatedAt(localNotes, remoteNotes, 'id');
  setCache(cacheKeys.notes(familyId), mergedNotes);

  // Pull checklist items for each note
  for (const note of mergedNotes) {
    const remoteItems = await checklistApi.getChecklistItems(note.id);
    const localItems =
      getCached<ChecklistItem[]>(cacheKeys.checklistItems(note.id)) ?? [];
    const mergedItems = mergeChecklistItems(localItems, remoteItems);
    setCache(cacheKeys.checklistItems(note.id), mergedItems);
  }

  // Pull family members (no conflict, just replace)
  const members = await familyApi.getFamilyMembers(familyId);
  setCache(cacheKeys.familyMembers(familyId), members);

  // Pull profile
  const profile = await familyApi.getProfile(userId);
  if (profile) setCache(cacheKeys.profile(userId), profile);

  // Pull family
  const familyData = await familyApi.getUserFamily(userId);
  if (familyData) setCache(cacheKeys.family(userId), familyData);

  // Pull item history
  const history = await checklistApi.getAllItemHistory(familyId);
  setCache(cacheKeys.itemHistory(familyId), history);

  // Update sync timestamp
  setCache(cacheKeys.lastSyncAt, new Date().toISOString());
}

/**
 * LWW merge: for each entity, keep the version with the newer updated_at.
 * Also includes entities that exist only on one side.
 */
function mergeByUpdatedAt<T extends { id: string; updated_at: string }>(
  local: T[],
  remote: T[],
  _key: 'id',
): T[] {
  const remoteMap = new Map(remote.map((r) => [r.id, r]));
  const merged = new Map<string, T>();

  // Start with local, override with remote if newer
  for (const l of local) {
    const r = remoteMap.get(l.id);
    if (!r) {
      // Local-only: keep (was created offline, should exist after queue replay)
      merged.set(l.id, l);
    } else {
      // Both exist: LWW
      merged.set(l.id, r.updated_at >= l.updated_at ? r : l);
      remoteMap.delete(l.id);
    }
  }

  // Add remote-only (partner created while offline)
  for (const [id, r] of remoteMap) {
    merged.set(id, r);
  }

  return Array.from(merged.values());
}

/**
 * Merge checklist items with LWW + handle deletes.
 * Remote is authoritative for deletions (if item is gone remotely, remove locally too).
 */
function mergeChecklistItems(
  local: ChecklistItem[],
  remote: ChecklistItem[],
): ChecklistItem[] {
  const remoteMap = new Map(remote.map((r) => [r.id, r]));
  const localMap = new Map(local.map((l) => [l.id, l]));
  const merged = new Map<string, ChecklistItem>();

  // Process local items
  for (const l of local) {
    const r = remoteMap.get(l.id);
    if (!r) {
      // Check if this was created locally (offline) — keep it
      // vs deleted remotely — remove it
      // Heuristic: if it has a very recent created_at (within our offline window), keep
      const lastSync = getCached<string>(cacheKeys.lastSyncAt);
      if (lastSync && l.created_at > lastSync) {
        // Created offline, keep
        merged.set(l.id, l);
      }
      // Otherwise it was deleted remotely, don't include
    } else {
      // Both exist: LWW
      merged.set(l.id, r.updated_at >= l.updated_at ? r : l);
    }
  }

  // Add remote-only items (partner added while offline)
  for (const [id, r] of remoteMap) {
    if (!localMap.has(id)) {
      merged.set(id, r);
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.position - b.position);
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('connection')
    );
  }
  return false;
}
