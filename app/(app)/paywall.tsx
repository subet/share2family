import { router } from 'expo-router';
import { PaywallScreen } from '@/components/PaywallScreen';

export default function InAppPaywall() {
  return (
    <PaywallScreen
      variant="modal"
      onClose={() => router.back()}
    />
  );
}
