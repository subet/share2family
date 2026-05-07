import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { spacing, radii } from '@/theme';
import { useJoinFamily } from '@/features/families/hooks/useFamily';
import { checkFamilyCanJoin, upgradeFamilyToPremium } from '@/features/families/api';
import { parseInviteCode, INVITE_CODE_LENGTH } from '@/constants/invite';
import { successHaptic } from '@/lib/haptics';
import { purchasePackage, getOfferings, checkPremiumAccess } from '@/lib/purchases';
import { usePremiumStore } from '@/stores/premium';
import { PACKAGE_TYPE } from 'react-native-purchases';

export default function JoinFamilyScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const joinFamily = useJoinFamily();
  const setIsPremium = usePremiumStore((s) => s.setIsPremium);
  const cleanCode = parseInviteCode(code);
  const isValid = cleanCode.length === INVITE_CODE_LENGTH;

  const handleCodeChange = (text: string) => {
    const clean = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, INVITE_CODE_LENGTH);
    setCode(clean.length <= 3 ? clean : `${clean.slice(0, 3)}-${clean.slice(3)}`);
  };

  const doJoin = async (inviteCode: string) => {
    const result = await joinFamily.mutateAsync(inviteCode);
    successHaptic();
    router.replace({ pathname: '/(family)/success', params: { name: result.family_name ?? 'Family' } });
  };

  const handleJoin = async () => {
    if (!isValid) return;
    setLoading(true);

    try {
      // Pre-check: can this family accept new members?
      const check = await checkFamilyCanJoin(cleanCode);

      if (check.member_count < check.max_members) {
        // Family has room → join directly
        await doJoin(cleanCode);
      } else {
        // Family is full → offer premium upgrade
        Alert.alert(
          t('join_family_full_title'),
          t('join_family_full_message'),
          [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('join_family_upgrade'),
              onPress: () => handleUpgradeAndJoin(check.family_id, cleanCode),
            },
          ],
        );
      }
    } catch (error: unknown) {
      Alert.alert(
        t('join_family_error_title'),
        error instanceof Error ? error.message : t('join_family_error_message'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeAndJoin = async (familyId: string, inviteCode: string) => {
    try {
      // Get packages and find annual (or first available)
      const pkgs = await getOfferings();
      if (pkgs.length === 0) {
        Alert.alert(t('error'), t('paywall_unavailable'));
        return;
      }

      // Navigate to paywall with pending join info
      router.push({
        pathname: '/(family)/paywall',
        params: { familyId, inviteCode },
      });
    } catch {
      Alert.alert(t('error'), t('error_generic'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('join_family_title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('join_family_subtitle')}</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput value={code} onChangeText={handleCodeChange}
            style={[styles.codeInput, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: isValid ? colors.accent : colors.border }]}
            placeholder={t('join_family_placeholder')} placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters" autoFocus maxLength={7} textAlign="center" returnKeyType="join" onSubmitEditing={handleJoin} />
        </View>
        <View style={styles.footer}>
          <Button title={t('join_family_button')} onPress={handleJoin} size="lg" loading={loading || joinFamily.isPending} disabled={!isValid} />
          <Button title={t('back')} onPress={() => router.back()} variant="ghost" size="md" />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  header: { gap: spacing.sm, marginBottom: spacing['3xl'] },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24 },
  inputContainer: { alignItems: 'center', marginBottom: spacing['3xl'] },
  codeInput: { fontSize: 32, fontWeight: '700', letterSpacing: 6, textAlign: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing['3xl'], borderRadius: radii.lg, borderWidth: 2, width: '100%' },
  footer: { marginTop: 'auto', gap: spacing.md },
});
