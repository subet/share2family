import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing, radii } from '@/theme';
import { AVATAR_EMOJIS, getRandomEmoji } from '@/constants/emojis';
import { useUpdateProfile } from '@/features/families/hooks/useFamily';
import { selectionHaptic } from '@/lib/haptics';

export default function ProfileSetupScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(getRandomEmoji());
  const updateProfile = useUpdateProfile();

  const handleContinue = async () => {
    const name = displayName.trim() || 'User';
    try {
      await updateProfile.mutateAsync({ display_name: name, avatar_emoji: selectedEmoji });
      router.replace('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('error_generic');
      Alert.alert(t('error'), message);
    }
  };

  const handleSkip = async () => {
    try {
      await updateProfile.mutateAsync({ display_name: 'User', avatar_emoji: getRandomEmoji() });
      router.replace('/');
    } catch { router.replace('/'); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('profile_setup_title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('profile_setup_subtitle')}</Text>
        </View>
        <View style={[styles.selectedEmoji, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={styles.selectedEmojiText}>{selectedEmoji}</Text>
        </View>
        <View style={styles.emojiGrid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <Pressable key={emoji} onPress={() => { selectionHaptic(); setSelectedEmoji(emoji); }}
              style={[styles.emojiItem, {
                backgroundColor: emoji === selectedEmoji ? colors.accentLight : colors.surfaceSecondary,
                borderColor: emoji === selectedEmoji ? colors.accent : 'transparent',
              }]}>
              <Text style={styles.emojiItemText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.inputContainer}>
          <Input placeholder={t('profile_setup_placeholder')} value={displayName} onChangeText={setDisplayName}
            autoCapitalize="words" autoFocus returnKeyType="done" onSubmitEditing={handleContinue} />
        </View>
        <View style={styles.footer}>
          <Button title={t('profile_setup_continue')} onPress={handleContinue} size="lg" loading={updateProfile.isPending} />
          <Button title={t('profile_setup_skip')} onPress={handleSkip} variant="ghost" size="md" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing['2xl'] },
  header: { gap: spacing.sm, marginBottom: spacing['2xl'] },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24 },
  selectedEmoji: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.xl },
  selectedEmojiText: { fontSize: 40 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing['2xl'] },
  emojiItem: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  emojiItemText: { fontSize: 24 },
  inputContainer: { marginBottom: spacing['2xl'] },
  footer: { gap: spacing.md },
});
