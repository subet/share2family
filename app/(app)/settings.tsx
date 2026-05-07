import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal, Switch, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useFamilyStore } from '@/stores/family';
import { useProfile, useFamilyMembers } from '@/features/families/hooks/useFamily';
import { Button } from '@/components/ui/Button';
import { spacing, radii } from '@/theme';
import { selectionHaptic } from '@/lib/haptics';
import { signOut } from '@/lib/auth';
import { registerForPushNotifications, saveDeviceToken, removeDeviceToken, setNotificationsEnabled as setProfileNotifEnabled } from '@/lib/notifications';
import { checkIsConnected } from '@/lib/network';
import { warmCache } from '@/features/sync/cacheWarmer';
import { clearAllCache } from '@/lib/offlineCache';
import { LANGUAGES } from '@/constants/languages';
import { useIsPremium } from '@/stores/premium';
import type { ThemePreference } from '@/lib/storage';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const familyId = useFamilyStore((s) => s.familyId);
  const familyName = useFamilyStore((s) => s.familyName);
  const members = useFamilyStore((s) => s.members);
  useFamilyMembers(familyId);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const authProvider = useAuthStore((s) => s.user?.app_metadata?.provider);
  const accountBadge = isAnonymous
    ? t('settings_guest_account')
    : authProvider === 'apple'
      ? t('settings_signed_in_with_apple')
      : authProvider === 'google'
        ? t('settings_signed_in_with_google')
        : null;
  const themePreference = useUIStore((s) => s.themePreference);
  const setThemePreference = useUIStore((s) => s.setThemePreference);
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const notificationsEnabled = useUIStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useUIStore((s) => s.setNotificationsEnabled);
  const offlineModeEnabled = useUIStore((s) => s.offlineModeEnabled);
  const setOfflineModeEnabled = useUIStore((s) => s.setOfflineModeEnabled);

  const isPremium = useIsPremium();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const themeOptions: { label: string; value: ThemePreference }[] = [
    { label: t('settings_theme_system'), value: 'system' },
    { label: t('settings_theme_light'), value: 'light' },
    { label: t('settings_theme_dark'), value: 'dark' },
  ];

  const handleSignOut = () => {
    Alert.alert(t('settings_signout_title'), t('settings_signout_message'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('settings_signout'),
        style: 'destructive',
        onPress: async () => { await signOut(); router.replace('/'); },
      },
    ]);
  };

  const user = useAuthStore((s) => s.user);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const token = await registerForPushNotifications();
      if (token && user) {
        await saveDeviceToken(user.id, token);
        await setProfileNotifEnabled(user.id, true);
        setNotificationsEnabled(true);
      }
    } else {
      if (user) {
        await removeDeviceToken(user.id);
        await setProfileNotifEnabled(user.id, false);
      }
      setNotificationsEnabled(false);
    }
  };

  const handleToggleOfflineMode = async (enabled: boolean) => {
    if (enabled) {
      const connected = await checkIsConnected();
      if (!connected) {
        Alert.alert(t('settings_offline_mode'), t('settings_offline_need_internet'));
        return;
      }
      setOfflineLoading(true);
      try {
        await warmCache(familyId!, user!.id);
        setOfflineModeEnabled(true);
      } catch {
        Alert.alert(t('error'), t('error_generic'));
      } finally {
        setOfflineLoading(false);
      }
    } else {
      setOfflineModeEnabled(false);
      clearAllCache();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings_title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <Text style={styles.profileEmoji}>{profile?.avatar_emoji ?? '😊'}</Text>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {profile?.display_name ?? 'User'}
                </Text>
                {accountBadge && (
                  <Text style={[styles.profileBadge, { color: colors.textTertiary }]}>
                    {accountBadge}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => router.push('/(app)/edit-profile')} hitSlop={8}>
                <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Family */}
        {familyId && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings_family')}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.familyHeader}>
                <Text style={[styles.familyTitle, { color: colors.text }]}>
                  {familyName ?? 'Family'}
                </Text>
                <Pressable onPress={() => router.push('/(app)/edit-family')} hitSlop={8}>
                  <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              {members.map((m) => (
                <View key={m.userId} style={[styles.memberRow, { borderTopColor: colors.border }]}>
                  <Text style={styles.memberEmoji}>{m.avatarEmoji}</Text>
                  <Text style={[styles.memberName, { color: colors.text }]}>{m.displayName}</Text>
                  <Text style={[styles.memberRole, { color: colors.textTertiary }]}>{m.role}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings_preferences')}</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Theme */}
            <View>
              <Text style={[styles.prefLabel, { color: colors.text }]}>{t('settings_theme')}</Text>
              <View style={styles.themeOptions}>
                {themeOptions.map((opt) => (
                  <Pressable key={opt.value} onPress={() => { selectionHaptic(); setThemePreference(opt.value); }}
                    style={[styles.themeOption, {
                      backgroundColor: themePreference === opt.value ? colors.accent : colors.surfaceSecondary,
                      borderColor: themePreference === opt.value ? colors.accent : colors.border,
                    }]}>
                    <Text style={[styles.themeOptionText, { color: themePreference === opt.value ? '#FFFFFF' : colors.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Language */}
            <Pressable
              onPress={() => setShowLangPicker(true)}
              style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <View style={styles.settingRowLeft}>
                <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingRowLabel, { color: colors.text }]}>{t('settings_language')}</Text>
              </View>
              <View style={styles.settingRowRight}>
                <Text style={[styles.settingRowValue, { color: colors.textSecondary }]}>
                  {currentLang.flag} {currentLang.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
            </Pressable>

            {/* Notifications (Premium) */}
            <Pressable
              onPress={!isPremium ? () => router.push('/(app)/paywall') : undefined}
              style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <View style={styles.settingRowLeft}>
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingRowLabel, { color: colors.text }]}>{t('settings_notifications_label')}</Text>
                {!isPremium && <Ionicons name="star" size={14} color={colors.accent} />}
              </View>
              {isPremium ? (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              ) : (
                <Ionicons name="lock-closed" size={16} color={colors.textTertiary} />
              )}
            </Pressable>

            {/* Offline Mode (Premium) */}
            <Pressable
              onPress={!isPremium ? () => router.push('/(app)/paywall') : undefined}
              style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <View style={styles.settingRowLeft}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingRowLabel, { color: colors.text }]}>{t('settings_offline_mode')}</Text>
                {!isPremium && <Ionicons name="star" size={14} color={colors.accent} />}
              </View>
              {isPremium ? (
                offlineLoading ? (
                  <Text style={[styles.settingRowValue, { color: colors.textTertiary }]}>{t('settings_offline_downloading')}</Text>
                ) : (
                  <Switch
                    value={offlineModeEnabled}
                    onValueChange={handleToggleOfflineMode}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor="#FFFFFF"
                  />
                )
              ) : (
                <Ionicons name="lock-closed" size={16} color={colors.textTertiary} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Premium (test) */}
        <View style={styles.section}>
          <Pressable
            onPress={() => router.push('/(app)/paywall')}
            style={[styles.card, styles.settingRow, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
          >
            <View style={styles.settingRowLeft}>
              <Ionicons name="star" size={20} color={colors.accent} />
              <Text style={[styles.settingRowLabel, { color: colors.accent }]}>
                {t('paywall_upgrade')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </Pressable>
        </View>

        {/* Account */}
        <View style={styles.section}>
          {isAnonymous ? (
            <Button title={t('settings_signin_prompt')} onPress={() => router.push('/(app)/link-account')} variant="outline" size="md" />
          ) : (
            <Button title={t('settings_signout')} onPress={handleSignOut} variant="ghost" size="md" />
          )}
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>
          {t('settings_version', { version: '1.0.0' })}
        </Text>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal visible={showLangPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('settings_language')}</Text>
            <Pressable onPress={() => setShowLangPicker(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  selectionHaptic();
                  setLanguage(item.code);
                  setShowLangPicker(false);
                }}
                style={[styles.langRow, { borderBottomColor: colors.border }]}
              >
                <Text style={styles.langFlag}>{item.flag}</Text>
                <Text style={[styles.langName, { color: colors.text }]}>{item.name}</Text>
                {language === item.code && (
                  <Ionicons name="checkmark" size={22} color={colors.accent} />
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  content: { paddingHorizontal: spacing['2xl'], paddingBottom: spacing['4xl'] },
  section: { marginBottom: spacing['2xl'] },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  profileEmoji: { fontSize: 36 },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 18, fontWeight: '600' },
  profileBadge: { fontSize: 13 },
  familyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  familyTitle: { fontSize: 17, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 1, gap: spacing.md },
  memberEmoji: { fontSize: 24 },
  memberName: { flex: 1, fontSize: 16 },
  memberRole: { fontSize: 13, textTransform: 'capitalize' },
  prefLabel: { fontSize: 16, fontWeight: '500', padding: spacing.lg, paddingBottom: spacing.sm },
  themeOptions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  themeOption: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, alignItems: 'center' },
  themeOptionText: { fontSize: 14, fontWeight: '500' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  settingRowLabel: { fontSize: 16, fontWeight: '500' },
  settingRowValue: { fontSize: 15 },
  version: { fontSize: 13, textAlign: 'center', marginTop: spacing.lg },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing['2xl'], paddingBottom: spacing.lg },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md },
  langFlag: { fontSize: 24 },
  langName: { flex: 1, fontSize: 17 },
});
