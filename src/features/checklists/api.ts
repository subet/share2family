import { supabase } from '@/lib/supabase';
import type { ChecklistItem } from '@/types/database';

export async function getChecklistItems(noteId: string) {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('note_id', noteId)
    .order('position');

  if (error) throw error;
  return data as ChecklistItem[];
}

export async function addChecklistItem(params: {
  noteId: string;
  content: string;
  createdBy: string;
}) {
  // Get the next position
  const { count } = await supabase
    .from('checklist_items')
    .select('*', { count: 'exact', head: true })
    .eq('note_id', params.noteId);

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({
      note_id: params.noteId,
      content: params.content,
      created_by: params.createdBy,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChecklistItem;
}

export async function toggleChecklistItem(itemId: string, isCompleted: boolean) {
  const { data, error } = await supabase
    .from('checklist_items')
    .update({ is_completed: isCompleted })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data as ChecklistItem;
}

export async function deleteChecklistItem(itemId: string) {
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function updateChecklistItemContent(itemId: string, content: string) {
  const { data, error } = await supabase
    .from('checklist_items')
    .update({ content })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data as ChecklistItem;
}

// Smart suggestions
export async function getItemSuggestions(familyId: string, prefix: string) {
  const { data, error } = await supabase
    .from('item_history')
    .select('item_name, use_count')
    .eq('family_id', familyId)
    .ilike('item_name', `${prefix}%`)
    .order('use_count', { ascending: false })
    .limit(3);

  if (error) throw error;
  return data ?? [];
}

export async function getAllItemHistory(familyId: string) {
  const { data, error } = await supabase
    .from('item_history')
    .select('item_name, use_count')
    .eq('family_id', familyId)
    .order('use_count', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function upsertItemHistory(
  familyId: string,
  userId: string,
  itemName: string,
) {
  await supabase.rpc('upsert_item_history', {
    p_family_id: familyId,
    p_user_id: userId,
    p_item_name: itemName,
  });
}
