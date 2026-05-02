import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { useUIStore } from '@/stores/ui';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { signInAnonymously, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<'apple' | 'google' | 'anon' | null>(null);
  const setNotificationsEnabled = useUIStore((s) => s.setNotificationsEnabled);
  const permissionsAsked = useRef(false);

  useEffect(() => {
    if (permissionsAsked.current) return;
    permissionsAsked.current = true;

    (async () => {
      // Ask ATT first (iOS only, must come before other tracking-related calls)
      if (Platform.OS === 'ios') {
        await requestTrackingPermissionsAsync();
      }

      // Ask push notification permission
      const token = await registerForPushNotifications();
      if (token) {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(false);
      }
    })();
  }, [setNotificationsEnabled]);

  const handleSignIn = async (method: 'apple' | 'google' | 'anon') => {
    setLoading(method);
    try {
      switch (method) {
        case 'apple': await signInWithApple(); break;
        case 'google': await signInWithGoogle(); break;
        case 'anon': await signInAnonymously(); break;
      }
      router.replace('/(auth)/profile-setup');
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
        paddingTop: insets.top + spacing['4xl'],
        paddingBottom: insets.bottom + spacing.lg,
      }]}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="home" size={56} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('app_name')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('signin_subtitle')}</Text>
      </View>

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
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{t('or')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>
        <Button
          title={t('signin_anonymous')}
          onPress={() => handleSignIn('anon')}
          variant="ghost" size="lg"
          loading={loading === 'anon'} disabled={loading !== null}
        />
      </View>
      <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>{t('signin_disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  header: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: { marginBottom: spacing.md },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 17, textAlign: 'center', lineHeight: 24 },
  buttons: { gap: spacing.md, marginBottom: spacing['2xl'] },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 14 },
  disclaimer: { fontSize: 13, textAlign: 'center' },
});
