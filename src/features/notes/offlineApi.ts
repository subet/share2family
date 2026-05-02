import * as Crypto from 'expo-crypto';
import { getCached, setCache, cacheKeys } from '@/lib/offlineCache';
import { addToQueue } from '@/lib/syncQueue';
import type { NoteWithMeta } from './api';

export function getNotesOffline(familyId: string): NoteWithMeta[] {
  return getCached<NoteWithMeta[]>(cacheKeys.notes(familyId)) ?? [];
}

export function createNoteOffline(params: {
  familyId: string;
  title: string;
  emoji: string | null;
  createdBy: string;
}): NoteWithMeta {
  const now = new Date().toISOString();
  const notes = getNotesOffline(params.familyId);

  const note: NoteWithMeta = {
    id: Crypto.randomUUID(),
    family_id: params.familyId,
    category_id: null,
    type: 'checklist',
    title: params.title,
    emoji: params.emoji,
    position: notes.length,
    created_by: params.createdBy,
    updated_by: params.createdBy,
    created_at: now,
    updated_at: now,
    archived_at: null,
    item_count: 0,
    last_item_at: null,
  };

  setCache(cacheKeys.notes(params.familyId), [...notes, note]);
  setCache(cacheKeys.checklistItems(note.id), []);

  addToQueue({
    type: 'create',
    table: 'notes',
    entityId: note.id,
    params: {
      family_id: params.familyId,
      title: params.title,
      emoji: params.emoji,
      type: 'checklist',
      created_by: params.createdBy,
      updated_by: params.createdBy,
      position: note.position,
    },
  });

  return note;
}

export function updateNoteOffline(
  noteId: string,
  familyId: string,
  updates: { title?: string; emoji?: string | null; updated_by?: string },
): NoteWithMeta {
  const notes = getNotesOffline(familyId);
  const now = new Date().toISOString();
  let updated: NoteWithMeta | null = null;

  const newNotes = notes.map((n) => {
    if (n.id === noteId) {
      updated = { ...n, ...updates, updated_at: now };
      return updated;
    }
    return n;
  });

  setCache(cacheKeys.notes(familyId), newNotes);

  addToQueue({
    type: 'update',
    table: 'notes',
    entityId: noteId,
    params: { ...updates, updated_at: now },
  });

  return updated ?? newNotes[0];
}

export function archiveNoteOffline(
  noteId: string,
  familyId: string,
  userId: string,
): void {
  const notes = getNotesOffline(familyId);
  const now = new Date().toISOString();

  const newNotes = notes.filter((n) => n.id !== noteId);
  setCache(cacheKeys.notes(familyId), newNotes);

  addToQueue({
    type: 'update',
    table: 'notes',
    entityId: noteId,
    params: { archived_at: now, updated_by: userId, updated_at: now },
  });
}

export function reorderNotesOffline(
  familyId: string,
  notePositions: { id: string; position: number }[],
): void {
  const notes = getNotesOffline(familyId);
  const posMap = new Map(notePositions.map((n) => [n.id, n.position]));

  const reordered = notes
    .map((n) => ({
      ...n,
      position: posMap.get(n.id) ?? n.position,
    }))
    .sort((a, b) => a.position - b.position);

  setCache(cacheKeys.notes(familyId), reordered);

  for (const np of notePositions) {
    addToQueue({
      type: 'update',
      table: 'notes',
      entityId: np.id,
      params: { position: np.position },
    });
  }
}
