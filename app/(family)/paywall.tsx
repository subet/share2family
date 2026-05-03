import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PaywallScreen } from '@/components/PaywallScreen';
import { upgradeFamilyToPremium, joinFamily } from '@/features/families/api';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/i18n';
import { successHaptic } from '@/lib/haptics';
import { useQueryClient } from '@tanstack/react-query';

export default function FamilyPaywall() {
  const { familyId, inviteCode } = useLocalSearchParams<{
    familyId: string;
    inviteCode: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleSuccess = async () => {
    if (!familyId || !inviteCode || !user) return;

    try {
      // 1. Upgrade family to premium (raises max_members)
      await upgradeFamilyToPremium(familyId);

      // 2. Join with the stored invite code
      const result = await joinFamily(inviteCode, user.id);

      // 3. Invalidate family queries
      queryClient.invalidateQueries({ queryKey: ['family'] });

      successHaptic();

      // 4. Navigate to success
      router.replace({
        pathname: '/(family)/success',
        params: { name: result.family_name ?? 'Family' },
      });
    } catch (error: unknown) {
      Alert.alert(
        t('join_family_error_title'),
        error instanceof Error ? error.message : t('join_family_error_message'),
      );
      router.back();
    }
  };

  return (
    <PaywallScreen
      variant="modal"
      onClose={() => router.back()}
      onSuccess={handleSuccess}
    />
  );
}
