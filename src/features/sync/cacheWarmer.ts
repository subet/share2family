import { setCache, cacheKeys } from '@/lib/offlineCache';
import * as notesApi from '@/features/notes/api';
import * as checklistApi from '@/features/checklists/api';
import * as familyApi from '@/features/families/api';

/**
 * Downloads all family data and populates the offline MMKV cache.
 * Called when user enables offline mode (must be online).
 */
export async function warmCache(
  familyId: string,
  userId: string,
): Promise<void> {
  // Fetch notes
  const notes = await notesApi.getNotes(familyId);
  setCache(cacheKeys.notes(familyId), notes);

  // Fetch checklist items for each note
  for (const note of notes) {
    const items = await checklistApi.getChecklistItems(note.id);
    setCache(cacheKeys.checklistItems(note.id), items);
  }

  // Fetch family members
  const members = await familyApi.getFamilyMembers(familyId);
  setCache(cacheKeys.familyMembers(familyId), members);

  // Fetch profile
  const profile = await familyApi.getProfile(userId);
  if (profile) {
    setCache(cacheKeys.profile(userId), profile);
  }

  // Fetch family data
  const familyData = await familyApi.getUserFamily(userId);
  if (familyData) {
    setCache(cacheKeys.family(userId), familyData);
  }

  // Fetch item history for suggestions
  const history = await checklistApi.getAllItemHistory(familyId);
  setCache(cacheKeys.itemHistory(familyId), history);

  // Record sync timestamp
  setCache(cacheKeys.lastSyncAt, new Date().toISOString());
}
