import { MMKV } from 'react-native-mmkv';

/** Separate MMKV instance for offline data cache */
const cache = new MMKV({ id: 'share2family-offline' });

export function getCached<T>(key: string): T | null {
  const raw = cache.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, JSON.stringify(data));
}

export function removeCache(key: string): void {
  cache.delete(key);
}

export function clearAllCache(): void {
  cache.clearAll();
}

// Key helpers
export const cacheKeys = {
  notes: (familyId: string) => `cache:notes:${familyId}`,
  checklistItems: (noteId: string) => `cache:checklistItems:${noteId}`,
  family: (userId: string) => `cache:family:${userId}`,
  familyMembers: (familyId: string) => `cache:familyMembers:${familyId}`,
  profile: (userId: string) => `cache:profile:${userId}`,
  itemHistory: (familyId: string) => `cache:itemHistory:${familyId}`,
  lastSyncAt: 'cache:lastSyncAt',
};
