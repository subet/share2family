import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { useFamilyMembers } from '@/features/families/hooks/useFamily';
import { useFamilyStore } from '@/stores/family';

export default function SuccessScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { name } = useLocalSearchParams<{ name: string }>();
  const familyId = useFamilyStore((s) => s.familyId);
  const members = useFamilyStore((s) => s.members);
  useFamilyMembers(familyId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t('success_title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('success_subtitle', { name: name ?? '' })}</Text>
        {members.length > 0 && (
          <View style={styles.members}>
            {members.map((m) => (
              <View key={m.userId} style={styles.member}>
                <Text style={styles.memberEmoji}>{m.avatarEmoji}</Text>
                <Text style={[styles.memberName, { color: colors.text }]}>{m.displayName}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Button title={t('go_to_home')} onPress={() => router.replace('/(app)')} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emoji: { fontSize: 56, marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  members: { flexDirection: 'row', gap: spacing['3xl'], marginTop: spacing['2xl'] },
  member: { alignItems: 'center', gap: spacing.sm },
  memberEmoji: { fontSize: 40 },
  memberName: { fontSize: 16, fontWeight: '500' },
});
