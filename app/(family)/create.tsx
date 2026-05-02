import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { spacing, radii } from '@/theme';
import { lightHaptic } from '@/lib/haptics';

export default function FamilyChoiceScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('family_choice_title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('family_choice_subtitle')}</Text>
      </View>
      <View style={styles.cards}>
        <Pressable onPress={() => { lightHaptic(); router.push('/(family)/create-family'); }}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="home-outline" size={36} color={colors.accent} style={{ marginBottom: spacing.xs }} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('family_create_card_title')}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('family_create_card_subtitle')}</Text>
        </Pressable>
        <Pressable onPress={() => { lightHaptic(); router.push('/(family)/join'); }}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="people-outline" size={36} color={colors.accent} style={{ marginBottom: spacing.xs }} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('family_join_card_title')}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('family_join_card_subtitle')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  header: { gap: spacing.sm, marginBottom: spacing['3xl'] },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24 },
  cards: { gap: spacing.lg },
  card: { padding: spacing['2xl'], borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardSubtitle: { fontSize: 15, lineHeight: 21 },
});
