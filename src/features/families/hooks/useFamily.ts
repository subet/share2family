import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { useFamilyStore } from '@/stores/family';
import { usePremiumStore } from '@/stores/premium';
import * as api from '../api';
import { useEffect } from 'react';

export function useUserFamily() {
  const user = useAuthStore((s) => s.user);
  const setFamily = useFamilyStore((s) => s.setFamily);
  const clearFamily = useFamilyStore((s) => s.clearFamily);

  const query = useQuery({
    queryKey: ['family', user?.id],
    queryFn: () => api.getUserFamily(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!query.isSuccess || query.isFetching) return;
    const families = query.data?.families;
    if (families) {
      setFamily({
        id: families.id,
        name: families.name,
        inviteCode: families.invite_code,
        isPremium: families.is_premium,
      });
    } else {
      clearFamily();
    }
  }, [query.isSuccess, query.isFetching, query.data, setFamily, clearFamily]);

  return query;
}

export function useFamilyMembers(familyId: string | null) {
  const setMembers = useFamilyStore((s) => s.setMembers);

  const query = useQuery({
    queryKey: ['familyMembers', familyId],
    queryFn: () => api.getFamilyMembers(familyId!),
    enabled: !!familyId,
  });

  useEffect(() => {
    if (query.data) {
      setMembers(
        query.data.map((m) => ({
          userId: m.user_id,
          displayName: m.profiles?.display_name ?? 'User',
          avatarEmoji: m.profiles?.avatar_emoji ?? '😊',
          role: m.role as 'admin' | 'member',
        })),
      );
    }
  }, [query.data, setMembers]);

  return query;
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (name: string) => {
      const result = await api.createFamily(name, user!.id);
      // If the creator already has an active RevenueCat subscription, carry
      // it over to the new family so they keep premium features.
      if (usePremiumStore.getState().isPremium) {
        try {
          await api.upgradeFamilyToPremium(result.id);
        } catch (e) {
          console.warn('[CreateFamily] Failed to apply premium to new family:', e);
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });
}

export function useJoinFamily() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (code: string) => api.joinFamily(code, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] });
    },
  });
}

export function useLeaveFamily() {
  const queryClient = useQueryClient();
  const clearFamily = useFamilyStore((s) => s.clearFamily);

  return useMutation({
    mutationFn: (familyId: string) => api.leaveFamily(familyId),
    onSuccess: () => {
      clearFamily();
      queryClient.invalidateQueries({ queryKey: ['family'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
    },
  });
}

export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();
  const familyId = useFamilyStore((s) => s.familyId);

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      api.removeFamilyMember(familyId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers', familyId] });
      queryClient.invalidateQueries({ queryKey: ['family'] });
      queryClient.invalidateQueries({ queryKey: ['notes', familyId] });
    },
  });
}

export function useProfile() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => api.getProfile(user!.id),
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (profile: { display_name: string; avatar_emoji: string }) =>
      api.upsertProfile(user!.id, profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
    },
  });
}
