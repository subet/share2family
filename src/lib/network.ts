import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

const CHECK_INTERVAL = 5000; // 5 seconds

/**
 * Polls network state using expo-network.
 * Defaults to connected. Also re-checks when app comes to foreground.
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  const check = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isConnected ?? true);
    } catch {
      // If check fails, assume connected
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    check();

    const interval = setInterval(check, CHECK_INTERVAL);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') check();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [check]);

  return { isConnected };
}

/** One-shot check (non-hook) for use outside React components */
export async function checkIsConnected(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected ?? true;
  } catch {
    return true;
  }
}
