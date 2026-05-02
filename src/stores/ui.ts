import { create } from 'zustand';
import {
  getThemePreference,
  setThemePreference as persistTheme,
  getLanguagePreference,
  setLanguagePreference as persistLanguage,
  getNotificationsEnabled,
  setNotificationsEnabled as persistNotifications,
  getOfflineModeEnabled,
  setOfflineModeEnabled as persistOfflineMode,
  type ThemePreference,
} from '@/lib/storage';
import { setLocale, SUPPORTED_LOCALES } from '@/i18n';
import { getLocales } from 'expo-localization';

function detectLanguage(): string {
  const saved = getLanguagePreference();
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
    return saved;
  }
  // First launch: detect device language
  const deviceLocales = getLocales();
  const deviceLang = deviceLocales[0]?.languageCode ?? 'en';
  const supported = (SUPPORTED_LOCALES as readonly string[]).includes(deviceLang)
    ? deviceLang
    : 'en';
  persistLanguage(supported);
  return supported;
}

const initialLanguage = detectLanguage();
setLocale(initialLanguage);

interface UIState {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  language: string;
  setLanguage: (lang: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  offlineModeEnabled: boolean;
  setOfflineModeEnabled: (enabled: boolean) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  themePreference: getThemePreference(),
  setThemePreference: (pref) => {
    persistTheme(pref);
    set({ themePreference: pref });
  },
  language: initialLanguage,
  setLanguage: (lang) => {
    persistLanguage(lang);
    setLocale(lang);
    set({ language: lang });
  },
  notificationsEnabled: getNotificationsEnabled(),
  setNotificationsEnabled: (enabled) => {
    persistNotifications(enabled);
    set({ notificationsEnabled: enabled });
  },
  offlineModeEnabled: getOfflineModeEnabled(),
  setOfflineModeEnabled: (enabled) => {
    persistOfflineMode(enabled);
    set({ offlineModeEnabled: enabled });
  },
  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
}));
