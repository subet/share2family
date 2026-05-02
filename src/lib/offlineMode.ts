import { useUIStore } from '@/stores/ui';
import { useNetworkStatus } from './network';

export function useOfflineMode() {
  const enabled = useUIStore((s) => s.offlineModeEnabled);
  const { isConnected } = useNetworkStatus();

  return {
    /** Whether the user has enabled offline mode in settings */
    isOfflineMode: enabled,
    /** Whether we should use local data (offline mode ON + no connection) */
    isOffline: enabled && !isConnected,
    /** Whether we have internet connectivity */
    isOnline: isConnected,
    /** Whether to show the "no internet" banner (offline mode OFF + no connection) */
    shouldShowBanner: !enabled && !isConnected,
  };
}
