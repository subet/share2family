import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEY_IOS = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';
const API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';

let isConfigured = false;

export async function initPurchases(userId?: string): Promise<void> {
  if (isConfigured) return;

  const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
  if (!apiKey) {
    console.warn('[Purchases] No API key configured for', Platform.OS);
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  isConfigured = true;
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages;
  } catch (e) {
    console.warn('[Purchases] getOfferings failed:', e);
    return [];
  }
}

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e.userCancelled) return { success: false };
    throw e;
  }
}

export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch {
    return { success: false };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function checkPremiumAccess(info: CustomerInfo): boolean {
  return info.entitlements.active['pro'] !== undefined;
}
