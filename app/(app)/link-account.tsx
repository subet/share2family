import { useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { signInWithApple, signInWithGoogle } from '@/lib/auth';

export default function LinkAccountScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);

  const handleSignIn = async (method: 'apple' | 'google') => {
    setLoading(method);
    try {
      switch (method) {
        case 'apple': await signInWithApple(); break;
        case 'google': await signInWithGoogle(); break;
      }
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('error_generic');
      Alert.alert(t('signin_failed'), message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View
      style={[styles.container, {
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.lg,
      }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings_signin_prompt')}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('link_account_subtitle')}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <Button
            title={t('signin_apple')}
            onPress={() => handleSignIn('apple')}
            variant="secondary" size="lg"
            loading={loading === 'apple'} disabled={loading !== null}
            icon={<Ionicons name="logo-apple" size={20} color={colors.text} />}
          />
        )}
        <Button
          title={t('signin_google')}
          onPress={() => handleSignIn('google')}
          variant="outline" size="lg"
          loading={loading === 'google'} disabled={loading !== null}
          icon={<Ionicons name="logo-google" size={20} color={colors.text} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  subtitle: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  buttons: { gap: spacing.md, marginBottom: spacing['2xl'] },
});
