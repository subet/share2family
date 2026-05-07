import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { type PurchasesPackage, PACKAGE_TYPE } from 'react-native-purchases';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { spacing, radii } from '@/theme';
import { lightHaptic, selectionHaptic } from '@/lib/haptics';
import { getOfferings, purchasePackage, restorePurchases, checkPremiumAccess } from '@/lib/purchases';
import { usePremiumStore } from '@/stores/premium';

interface PaywallScreenProps {
  variant: 'onboarding' | 'modal';
  onClose: () => void;
  onSuccess?: () => void;
}

const FEATURES = [
  { icon: 'people-outline' as const, key: 'paywall_feature_1' },
  { icon: 'sync-outline' as const, key: 'paywall_feature_2' },
  { icon: 'cloud-done-outline' as const, key: 'paywall_feature_3' },
  { icon: 'alarm-outline' as const, key: 'paywall_feature_4' },
  { icon: 'download-outline' as const, key: 'paywall_feature_5' },
];

const PRIVACY_URL = 'https://mudimedia.com/en/privacy-policy';
const TERMS_URL = 'https://mudimedia.com/en/terms';

export function PaywallScreen({ variant, onClose, onSuccess }: PaywallScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const setIsPremium = usePremiumStore((s) => s.setIsPremium);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      const pkgs = await getOfferings();
      setPackages(pkgs);
      // Default select annual if available
      const annualIdx = pkgs.findIndex(
        (p) => p.packageType === PACKAGE_TYPE.ANNUAL,
      );
      if (annualIdx >= 0) setSelectedIndex(annualIdx);
      setLoading(false);
    })();
  }, []);

  const handlePurchase = useCallback(async () => {
    const pkg = packages[selectedIndex];
    if (!pkg) return;

    lightHaptic();
    setPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success && result.customerInfo) {
        const isPremium = checkPremiumAccess(result.customerInfo);
        setIsPremium(isPremium);
        if (isPremium) {
          onSuccess?.();
          onClose();
        }
      }
    } catch {
      Alert.alert(t('error'), t('paywall_purchase_error'));
    } finally {
      setPurchasing(false);
    }
  }, [packages, selectedIndex, setIsPremium, onClose, onSuccess, t]);

  const handleRestore = useCallback(async () => {
    lightHaptic();
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.customerInfo) {
        const isPremium = checkPremiumAccess(result.customerInfo);
        setIsPremium(isPremium);
        if (isPremium) {
          Alert.alert(t('paywall_restored_title'), t('paywall_restored_message'));
          onSuccess?.();
          onClose();
          return;
        }
      }
      Alert.alert(t('paywall_no_purchases_title'), t('paywall_no_purchases_message'));
    } catch {
      Alert.alert(t('error'), t('paywall_restore_error'));
    } finally {
      setRestoring(false);
    }
  }, [setIsPremium, onClose, onSuccess, t]);

  const getPackageLabel = (pkg: PurchasesPackage): string => {
    switch (pkg.packageType) {
      case PACKAGE_TYPE.WEEKLY:
        return t('paywall_weekly');
      case PACKAGE_TYPE.MONTHLY:
        return t('paywall_monthly');
      case PACKAGE_TYPE.ANNUAL:
        return t('paywall_yearly');
      case PACKAGE_TYPE.LIFETIME:
        return t('paywall_lifetime');
      default:
        return pkg.product.title;
    }
  };

  const getBadge = (pkg: PurchasesPackage): string | null => {
    if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return t('paywall_popular');
    return null;
  };

  const selectedPkg = packages[selectedIndex];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Skip button (onboarding only) */}
      {variant === 'onboarding' && (
        <Pressable
          onPress={() => {
            lightHaptic();
            onClose();
          }}
          style={styles.skipButton}
          hitSlop={12}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {t('paywall_skip')}
          </Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top illustration */}
        <View style={styles.imageArea}>
          <Image
            source={require('../../assets/paywall-top.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Bottom-aligned content */}
        <View style={styles.bottomContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('paywall_title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('paywall_subtitle')}
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.features}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons name={feature.icon} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                {t(feature.key)}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Packages */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.packages}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
          ) : packages.length === 0 ? (
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {t('paywall_unavailable')}
            </Text>
          ) : (
            <View style={[styles.tabRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              {packages.map((pkg, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => {
                      selectionHaptic();
                      setSelectedIndex(index);
                    }}
                    style={[
                      styles.tab,
                      isSelected && {
                        backgroundColor: colors.surface,
                        borderColor: colors.accent,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    {getBadge(pkg) && (
                      <View style={[styles.tabBadge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.tabBadgeText}>{getBadge(pkg)}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: isSelected ? colors.text : colors.textSecondary },
                        isSelected && { fontWeight: '600' },
                      ]}
                    >
                      {getPackageLabel(pkg)}
                    </Text>
                    {pkg.packageType === PACKAGE_TYPE.LIFETIME && (
                      <Text style={[styles.tabSublabel, { color: colors.textTertiary }]}>
                        {t('paywall_one_time')}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.tabPrice,
                        { color: isSelected ? colors.accent : colors.textTertiary },
                      ]}
                    >
                      {pkg.product.priceString}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* CTA */}
        {packages.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.ctaSection}>
            <Pressable
              onPress={handlePurchase}
              disabled={purchasing || !selectedPkg}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                (purchasing || !selectedPkg) && { opacity: 0.5 },
              ]}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.ctaText}>
                  {t('paywall_continue')}
                </Text>
              )}
            </Pressable>

            {/* Subscription details (iOS compliance) */}
            {selectedPkg && (
              <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
                {selectedPkg.packageType === PACKAGE_TYPE.LIFETIME
                  ? t('paywall_lifetime_terms', { price: selectedPkg.product.priceString })
                  : t('paywall_subscription_terms', {
                      price: selectedPkg.product.priceString,
                      period: getPackageLabel(selectedPkg).toLowerCase(),
                    })}
              </Text>
            )}
          </Animated.View>
        )}

        {/* Restore + Legal */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.legalSection}>
          <Pressable onPress={handleRestore} disabled={restoring}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              {restoring ? t('paywall_restoring') : t('paywall_restore')}
            </Text>
          </Pressable>
          <View style={styles.legalRow}>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={[styles.legalText, { color: colors.textTertiary }]}>
                {t('paywall_terms')}
              </Text>
            </Pressable>
            <Text style={[styles.legalSeparator, { color: colors.textTertiary }]}>
              {' · '}
            </Text>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={[styles.legalText, { color: colors.textTertiary }]}>
                {t('paywall_privacy')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 54,
    right: spacing.xl,
    zIndex: 10,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  imageArea: {
    width: '100%',
    aspectRatio: 1,
    marginTop: -20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomContent: {
    paddingHorizontal: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  packages: {
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing['3xl'],
  },
  errorText: {
    textAlign: 'center',
    fontSize: 15,
    marginVertical: spacing.xl,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  tabSublabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  tabPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  ctaSection: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ctaButton: {
    height: 54,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
  },
  legalSeparator: {
    fontSize: 12,
  },
});
