import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { useUserFamily } from '@/features/families/hooks/useFamily';
import { useOfflineMode } from '@/lib/offlineMode';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  const { shouldShowBanner } = useOfflineMode();
  const { t } = useTranslation();

  // Ensure family store is populated when entering the app group
  useUserFamily();

  if (shouldShowBanner) {
    return (
      <View style={[styles.offlineContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.offlineTitle, { color: colors.text }]}>
          {t('offline_banner_message')}
        </Text>
        <Text style={[styles.offlineDescription, { color: colors.textSecondary }]}>
          {t('offline_banner_description')}
        </Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="list/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="edit-family" />
      <Stack.Screen name="link-account" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  offlineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    gap: spacing.sm,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  offlineDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
