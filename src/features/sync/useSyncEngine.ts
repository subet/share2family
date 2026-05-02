import { useEffect, useRef } from 'react';
import { useOfflineMode } from '@/lib/offlineMode';
import { useFamilyStore } from '@/stores/family';
import { useAuthStore } from '@/stores/auth';
import { queryClient } from '@/lib/query';
import { getQueueLength } from '@/lib/syncQueue';
import { replayQueue, pullRemoteChanges } from './syncEngine';

/**
 * Watches network state and triggers sync when coming back online.
 * Only active when offline mode is enabled.
 */
export function useSyncEngine() {
  const { isOnline, isOfflineMode } = useOfflineMode();
  const familyId = useFamilyStore((s) => s.familyId);
  const user = useAuthStore((s) => s.user);
  const wasOfflineRef = useRef(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isOfflineMode || !familyId || !user) return;

    // Detect reconnection: was offline, now online
    if (wasOfflineRef.current && isOnline && !syncingRef.current) {
      const pendingCount = getQueueLength();
      if (pendingCount > 0 || wasOfflineRef.current) {
        syncingRef.current = true;
        sync(familyId, user.id)
          .catch((err) => console.warn('[SyncEngine] Sync failed:', err))
          .finally(() => {
            syncingRef.current = false;
          });
      }
    }

    wasOfflineRef.current = !isOnline;
  }, [isOnline, isOfflineMode, familyId, user]);
}

async function sync(familyId: string, userId: string): Promise<void> {
  // Step 1: Push local changes to remote
  await replayQueue();

  // Step 2: Pull remote changes (partner's changes + server timestamps)
  await pullRemoteChanges(familyId, userId);

  // Step 3: Invalidate all TanStack Query caches to refresh UI
  queryClient.invalidateQueries();
}
