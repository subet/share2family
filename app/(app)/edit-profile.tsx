import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing, radii } from '@/theme';
import { AVATAR_EMOJIS } from '@/constants/emojis';
import { useProfile, useUpdateProfile } from '@/features/families/hooks/useFamily';
import { Ionicons } from '@expo/vector-icons';
import { selectionHaptic } from '@/lib/haptics';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [selectedEmoji, setSelectedEmoji] = useState(profile?.avatar_emoji ?? '😊');
  const updateProfile = useUpdateProfile();

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert(t('edit_profile_name_required'), t('edit_profile_name_required_message'));
      return;
    }
    try {
      await updateProfile.mutateAsync({
        display_name: name,
        avatar_emoji: selectedEmoji,
      });
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('error_generic');
      Alert.alert(t('error'), message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('edit_profile_title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected emoji */}
        <View style={[styles.selectedEmoji, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={styles.selectedEmojiText}>{selectedEmoji}</Text>
        </View>

        {/* Emoji grid */}
        <View style={styles.emojiGrid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                selectionHaptic();
                setSelectedEmoji(emoji);
              }}
              style={[
                styles.emojiItem,
                {
                  backgroundColor:
                    emoji === selectedEmoji ? colors.accentLight : colors.surfaceSecondary,
                  borderColor: emoji === selectedEmoji ? colors.accent : 'transparent',
                },
              ]}
            >
              <Text style={styles.emojiItemText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {/* Name input */}
        <View style={styles.inputContainer}>
          <Input
            label={t('edit_profile_label')}
            placeholder={t('edit_profile_placeholder')}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title={t('save')}
            onPress={handleSave}
            size="lg"
            loading={updateProfile.isPending}
          />
          <Button title={t('cancel')} onPress={() => router.back()} variant="ghost" size="md" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing['2xl'],
  },
  selectedEmoji: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  selectedEmojiText: {
    fontSize: 40,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  emojiItem: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emojiItemText: {
    fontSize: 24,
  },
  inputContainer: {
    marginBottom: spacing['2xl'],
  },
  footer: {
    gap: spacing.md,
  },
});
