import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useUserFamily, useProfile } from '@/features/families/hooks/useFamily';
import { useTheme } from '@/lib/useTheme';
import { storage } from '@/lib/storage';

export default function Index() {
  const { colors } = useTheme();
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const hasCompletedOnboarding = useUIStore((s) => s.hasCompletedOnboarding);
  const onboardingDone = hasCompletedOnboarding || storage.getBoolean('onboarding.completed');

  const { data: familyData, isLoading: familyLoading } = useUserFamily();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (isLoading || (user && (familyLoading || profileLoading))) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/(auth)/welcome" />;
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (profile && profile.display_name === 'User') return <Redirect href="/(auth)/profile-setup" />;
  if (!familyData?.families) return <Redirect href="/(family)/create" />;

  // Family store is populated by useUserFamily() hook's useEffect
  // and by useUserFamily() in (app)/_layout.tsx
  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
