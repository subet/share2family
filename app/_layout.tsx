import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useTheme } from '@/lib/useTheme';
import { useRealtimeSync } from '@/features/sync/useRealtimeSync';
import { useSyncEngine } from '@/features/sync/useSyncEngine';
import {
  registerForPushNotifications,
  saveDeviceToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '@/lib/notifications';
import { getNotificationsEnabled } from '@/lib/storage';
import { initPurchases } from '@/lib/purchases';
import '../global.css';

function AuthListener() {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      // Init RevenueCat with user ID if available
      initPurchases(session?.user?.id);

      // Auto-register push token if notifications enabled
      if (session?.user && getNotificationsEnabled()) {
        registerForPushNotifications().then((token) => {
          if (token) saveDeviceToken(session.user.id, token);
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  return null;
}

function RealtimeSyncProvider() {
  useRealtimeSync();
  return null;
}

function SyncEngineProvider() {
  useSyncEngine();
  return null;
}

function NotificationListener() {
  const notificationsEnabled = useUIStore((s) => s.notificationsEnabled);

  useEffect(() => {
    if (!notificationsEnabled) return;

    const receivedSub = addNotificationReceivedListener(() => {
      // Invalidate relevant queries when a notification arrives
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
    });

    const responseSub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        listId?: string;
      };
      const opensList =
        data?.type === 'new_list' ||
        data?.type === 'list_created' ||
        data?.type === 'item_added' ||
        data?.type === 'list_completed';
      if (opensList && data?.listId) {
        router.push({ pathname: '/(app)/list/[id]', params: { id: data.listId } });
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [notificationsEnabled]);

  return null;
}

export default function RootLayout() {
  const { isDark, colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <AuthListener />
        <RealtimeSyncProvider />
        <SyncEngineProvider />
        <NotificationListener />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
