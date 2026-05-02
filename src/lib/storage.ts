import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'share2family',
});

const THEME_KEY = 'app.theme';

export type ThemePreference = 'system' | 'light' | 'dark';

export function getThemePreference(): ThemePreference {
  const value = storage.getString(THEME_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

export function setThemePreference(theme: ThemePreference) {
  storage.set(THEME_KEY, theme);
}

// Language preference
const LANGUAGE_KEY = 'app.language';

export function getLanguagePreference(): string | null {
  return storage.getString(LANGUAGE_KEY) ?? null;
}

export function setLanguagePreference(lang: string) {
  storage.set(LANGUAGE_KEY, lang);
}

// Notification preference
const NOTIFICATIONS_KEY = 'app.notifications';

export function getNotificationsEnabled(): boolean {
  return storage.getBoolean(NOTIFICATIONS_KEY) ?? false;
}

export function setNotificationsEnabled(enabled: boolean) {
  storage.set(NOTIFICATIONS_KEY, enabled);
}

// Offline mode preference
const OFFLINE_MODE_KEY = 'app.offlineMode';

export function getOfflineModeEnabled(): boolean {
  return storage.getBoolean(OFFLINE_MODE_KEY) ?? false;
}

export function setOfflineModeEnabled(enabled: boolean) {
  storage.set(OFFLINE_MODE_KEY, enabled);
}
