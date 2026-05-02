import { I18n } from 'i18n-js';
import { en } from './en';
import { de } from './de';
import { fr } from './fr';
import { es } from './es';
import { pt } from './pt';
import { zh } from './zh';
import { tr } from './tr';
import { ru } from './ru';
import { it } from './it';
import { nl } from './nl';
import { id } from './id';
import { bn } from './bn';
import { ur } from './ur';
import { ja } from './ja';
import { vi } from './vi';
import { ko } from './ko';

export const i18n = new I18n({ en, de, fr, es, pt, zh, tr, ru, it, nl, id, bn, ur, ja, vi, ko });

i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

export const SUPPORTED_LOCALES = [
  'en', 'de', 'fr', 'es', 'pt', 'zh', 'tr', 'ru', 'it', 'nl', 'id', 'bn', 'ur', 'ja', 'vi', 'ko',
] as const;

export function setLocale(locale: string): void {
  i18n.locale = locale;
}

export function t(key: string, options?: Record<string, string | number>): string {
  return i18n.t(key, options);
}

export function useTranslation() {
  // Lazy require to avoid circular dependency (i18n -> store -> i18n)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useUIStore } = require('../stores/ui');
  useUIStore((s: { language: string }) => s.language);
  return { t };
}
