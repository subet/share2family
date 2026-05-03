import { router } from 'expo-router';
import { PaywallScreen } from '@/components/PaywallScreen';
import { storage } from '@/lib/storage';
import { useUIStore } from '@/stores/ui';

export default function OnboardingPaywall() {
  const setHasCompletedOnboarding = useUIStore((s) => s.setHasCompletedOnboarding);

  const handleClose = () => {
    storage.set('onboarding.completed', true);
    setHasCompletedOnboarding(true);
    router.replace('/(auth)/sign-in');
  };

  return (
    <PaywallScreen
      variant="onboarding"
      onClose={handleClose}
      onSuccess={handleClose}
    />
  );
}
