import { supabase } from '@/lib/supabase';
import type { Note } from '@/types/database';

export interface NoteWithMeta extends Note {
  item_count: number;
  last_item_at: string | null;
}

export async function getNotes(familyId: string): Promise<NoteWithMeta[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*, checklist_items(id, created_at)')
    .eq('family_id', familyId)
    .is('archived_at', null)
    .order('position');

  if (error) throw error;

  return (data ?? []).map((note) => {
    const items = (note as Record<string, unknown>).checklist_items as { id: string; created_at: string }[] | null;
    const itemCount = items?.length ?? 0;
    const lastItemAt = items && items.length > 0
      ? items.reduce((latest, i) => (i.created_at > latest ? i.created_at : latest), items[0].created_at)
      : null;
    const { checklist_items: _, ...rest } = note as Record<string, unknown>;
    return { ...rest, item_count: itemCount, last_item_at: lastItemAt } as NoteWithMeta;
  });
}

export async function createNote(params: {
  familyId: string;
  title: string;
  emoji: string | null;
  createdBy: string;
}) {
  const { count } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', params.familyId)
    .is('archived_at', null);

  const { data, error } = await supabase
    .from('notes')
    .insert({
      family_id: params.familyId,
      title: params.title,
      emoji: params.emoji,
      type: 'checklist',
      created_by: params.createdBy,
      updated_by: params.createdBy,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNote(
  noteId: string,
  updates: { title?: string; emoji?: string | null; updated_by?: string },
) {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function updateNotePositions(notes: { id: string; position: number }[]) {
  // Update each note's position
  for (const note of notes) {
    await supabase.from('notes').update({ position: note.position }).eq('id', note.id);
  }
}

export async function archiveNote(noteId: string, userId: string) {
  const { error } = await supabase
    .from('notes')
    .update({ archived_at: new Date().toISOString(), updated_by: userId })
    .eq('id', noteId);

  if (error) throw error;
}
