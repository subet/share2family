import { View, Text, StyleSheet, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { spacing, radii } from '@/theme';
import { formatInviteCode } from '@/constants/invite';
import { successHaptic } from '@/lib/haptics';

export default function InviteScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { code, name } = useLocalSearchParams<{ code: string; name: string }>();
  const formattedCode = formatInviteCode(code ?? '');

  const handleShare = async () => {
    try { await Share.share({ message: t('invite_share_message', { name: name ?? '', code: formattedCode }) }); } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t('invite_title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('invite_subtitle')}</Text>
        <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>{t('invite_code_label')}</Text>
          <Text style={[styles.code, { color: colors.text }]}>{formattedCode}</Text>
        </View>
        <Button title={t('invite_share')} onPress={handleShare} variant="outline" size="md" />
      </View>
      <Button title={t('go_to_home')} onPress={() => { successHaptic(); router.replace('/(app)'); }} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emoji: { fontSize: 56, marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  codeCard: { width: '100%', alignItems: 'center', padding: spacing['2xl'], borderRadius: radii.lg, borderWidth: 1, marginVertical: spacing.xl, gap: spacing.sm },
  codeLabel: { fontSize: 14, fontWeight: '500' },
  code: { fontSize: 36, fontWeight: '700', letterSpacing: 4 },
});
