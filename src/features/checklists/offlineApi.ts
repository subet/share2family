import * as Crypto from 'expo-crypto';
import { getCached, setCache, cacheKeys } from '@/lib/offlineCache';
import { addToQueue } from '@/lib/syncQueue';
import type { ChecklistItem } from '@/types/database';

export function getChecklistItemsOffline(noteId: string): ChecklistItem[] {
  return getCached<ChecklistItem[]>(cacheKeys.checklistItems(noteId)) ?? [];
}

export function addChecklistItemOffline(params: {
  noteId: string;
  content: string;
  createdBy: string;
}): ChecklistItem {
  const now = new Date().toISOString();
  const items = getChecklistItemsOffline(params.noteId);

  const item: ChecklistItem = {
    id: Crypto.randomUUID(),
    note_id: params.noteId,
    content: params.content,
    is_completed: false,
    position: items.length,
    created_by: params.createdBy,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };

  setCache(cacheKeys.checklistItems(params.noteId), [...items, item]);

  addToQueue({
    type: 'create',
    table: 'checklist_items',
    entityId: item.id,
    params: {
      note_id: params.noteId,
      content: params.content,
      created_by: params.createdBy,
      position: item.position,
    },
  });

  return item;
}

export function toggleChecklistItemOffline(
  itemId: string,
  noteId: string,
  isCompleted: boolean,
): ChecklistItem {
  const items = getChecklistItemsOffline(noteId);
  const now = new Date().toISOString();
  let toggled: ChecklistItem | null = null;

  const newItems = items.map((item) => {
    if (item.id === itemId) {
      toggled = {
        ...item,
        is_completed: isCompleted,
        completed_at: isCompleted ? now : null,
        updated_at: now,
      };
      return toggled;
    }
    return item;
  });

  setCache(cacheKeys.checklistItems(noteId), newItems);

  addToQueue({
    type: 'update',
    table: 'checklist_items',
    entityId: itemId,
    params: { is_completed: isCompleted, updated_at: now },
  });

  return toggled ?? newItems[0];
}

export function deleteChecklistItemOffline(
  itemId: string,
  noteId: string,
): void {
  const items = getChecklistItemsOffline(noteId);
  const newItems = items.filter((item) => item.id !== itemId);
  setCache(cacheKeys.checklistItems(noteId), newItems);

  addToQueue({
    type: 'delete',
    table: 'checklist_items',
    entityId: itemId,
    params: {},
  });
}

export function updateChecklistItemContentOffline(
  itemId: string,
  noteId: string,
  content: string,
): ChecklistItem {
  const items = getChecklistItemsOffline(noteId);
  const now = new Date().toISOString();
  let updated: ChecklistItem | null = null;

  const newItems = items.map((item) => {
    if (item.id === itemId) {
      updated = { ...item, content, updated_at: now };
      return updated;
    }
    return item;
  });

  setCache(cacheKeys.checklistItems(noteId), newItems);

  addToQueue({
    type: 'update',
    table: 'checklist_items',
    entityId: itemId,
    params: { content, updated_at: now },
  });

  return updated ?? newItems[0];
}

interface ItemHistoryEntry {
  item_name: string;
  use_count: number;
}

export function getItemSuggestionsOffline(
  familyId: string,
  prefix: string,
): ItemHistoryEntry[] {
  const history =
    getCached<ItemHistoryEntry[]>(cacheKeys.itemHistory(familyId)) ?? [];
  return history
    .filter((h) => h.item_name.toLowerCase().startsWith(prefix.toLowerCase()))
    .sort((a, b) => b.use_count - a.use_count)
    .slice(0, 3);
}
