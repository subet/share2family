import { create } from 'zustand';
import { storage } from '@/lib/storage';

const PREMIUM_KEY = 'app.isPremium';

interface PremiumState {
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;
}

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: storage.getBoolean(PREMIUM_KEY) ?? false,
  setIsPremium: (value) => {
    storage.set(PREMIUM_KEY, value);
    set({ isPremium: value });
  },
}));

/**
 * Helper: returns true if the user has premium access.
 * Premium is family-wide: if the family is premium, all members get it.
 * Falls back to the local premium store (RevenueCat purchase state).
 */
export function useIsPremium(): boolean {
  // Lazy require to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useFamilyStore } = require('./family');
  const familyIsPremium = useFamilyStore((s: { isPremium: boolean }) => s.isPremium);
  const localIsPremium = usePremiumStore((s) => s.isPremium);
  return familyIsPremium || localIsPremium;
}
