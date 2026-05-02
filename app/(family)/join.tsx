import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { spacing, radii } from '@/theme';
import { useJoinFamily } from '@/features/families/hooks/useFamily';
import { parseInviteCode, INVITE_CODE_LENGTH } from '@/constants/invite';
import { successHaptic } from '@/lib/haptics';

export default function JoinFamilyScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const joinFamily = useJoinFamily();
  const cleanCode = parseInviteCode(code);
  const isValid = cleanCode.length === INVITE_CODE_LENGTH;

  const handleCodeChange = (text: string) => {
    const clean = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, INVITE_CODE_LENGTH);
    setCode(clean.length <= 3 ? clean : `${clean.slice(0, 3)}-${clean.slice(3)}`);
  };

  const handleJoin = async () => {
    if (!isValid) return;
    try {
      const result = await joinFamily.mutateAsync(cleanCode);
      successHaptic();
      router.replace({ pathname: '/(family)/success', params: { name: result.family_name ?? 'Family' } });
    } catch (error: unknown) {
      Alert.alert(t('join_family_error_title'), error instanceof Error ? error.message : t('join_family_error_message'));
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
          <Button title={t('join_family_button')} onPress={handleJoin} size="lg" loading={joinFamily.isPending} disabled={!isValid} />
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
  codeInput: { fontSize: 32, fontWeight: '700', letterSpacing: 6, paddingVertical: spacing.xl, paddingHorizontal: spacing['3xl'], borderRadius: radii.lg, borderWidth: 2, width: '100%' },
  footer: { marginTop: 'auto', gap: spacing.md },
});
