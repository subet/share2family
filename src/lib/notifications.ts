import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: projectId ?? undefined,
  });

  return tokenData.data;
}

export async function saveDeviceToken(userId: string, pushToken: string): Promise<void> {
  const deviceName = Device.deviceName ?? `${Device.brand ?? ''} ${Device.modelName ?? ''}`.trim();
  const platform = Platform.OS as 'ios' | 'android';

  await supabase.from('devices').upsert(
    {
      user_id: userId,
      device_name: deviceName || 'Unknown',
      platform,
      push_token: pushToken,
      last_active: new Date().toISOString(),
    },
    { onConflict: 'user_id,push_token' },
  );
}

export async function setNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
  // Cast: column added in migration 009; types regen pending.
  await supabase
    .from('profiles')
    .update({ notifications_enabled: enabled } as unknown as { display_name: string })
    .eq('id', userId);
}

export async function removeDeviceToken(userId: string): Promise<void> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });
    await supabase
      .from('devices')
      .delete()
      .eq('user_id', userId)
      .eq('push_token', tokenData.data);
  } catch {
    // Token might not exist
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
