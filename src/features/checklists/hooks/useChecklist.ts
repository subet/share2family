import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { useFamilyStore } from '@/stores/family';
import { useOfflineMode } from '@/lib/offlineMode';
import { getCached, setCache, cacheKeys } from '@/lib/offlineCache';
import * as api from '../api';
import * as offlineApi from '../offlineApi';
import type { ChecklistItem } from '@/types/database';

export function useChecklistItems(noteId: string) {
  const { isOffline, isOfflineMode } = useOfflineMode();

  return useQuery({
    queryKey: ['checklistItems', noteId],
    queryFn: async () => {
      if (isOffline) {
        return offlineApi.getChecklistItemsOffline(noteId);
      }
      const data = await api.getChecklistItems(noteId);
      if (isOfflineMode) {
        setCache(cacheKeys.checklistItems(noteId), data);
      }
      return data;
    },
    enabled: !!noteId,
    initialData: isOfflineMode
      ? () => getCached<ChecklistItem[]>(cacheKeys.checklistItems(noteId)) ?? undefined
      : undefined,
  });
}

export function useAddChecklistItem(noteId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const familyId = useFamilyStore((s) => s.familyId);
  const { isOffline } = useOfflineMode();

  return useMutation({
    mutationFn: (content: string) => {
      if (isOffline) {
        return Promise.resolve(
          offlineApi.addChecklistItemOffline({
            noteId,
            content,
            createdBy: user!.id,
          }),
        );
      }
      return api.addChecklistItem({ noteId, content, createdBy: user!.id });
    },
    onSuccess: (_, content) => {
      queryClient.invalidateQueries({ queryKey: ['checklistItems', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (familyId && user && !isOffline) {
        api.upsertItemHistory(familyId, user.id, content);
      }
    },
  });
}

export function useToggleChecklistItem(noteId: string) {
  const queryClient = useQueryClient();
  const { isOffline } = useOfflineMode();

  return useMutation({
    mutationFn: (params: { itemId: string; isCompleted: boolean }) => {
      if (isOffline) {
        return Promise.resolve(
          offlineApi.toggleChecklistItemOffline(
            params.itemId,
            noteId,
            params.isCompleted,
          ),
        );
      }
      return api.toggleChecklistItem(params.itemId, params.isCompleted);
    },
    // Optimistic update
    onMutate: async ({ itemId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ['checklistItems', noteId] });
      const previous = queryClient.getQueryData(['checklistItems', noteId]);
      queryClient.setQueryData(
        ['checklistItems', noteId],
        (old: ChecklistItem[] | undefined) =>
          old?.map((item) =>
            item.id === itemId ? { ...item, is_completed: isCompleted } : item,
          ),
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['checklistItems', noteId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistItems', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteChecklistItem(noteId: string) {
  const queryClient = useQueryClient();
  const { isOffline } = useOfflineMode();

  return useMutation({
    mutationFn: (itemId: string) => {
      if (isOffline) {
        offlineApi.deleteChecklistItemOffline(itemId, noteId);
        return Promise.resolve();
      }
      return api.deleteChecklistItem(itemId);
    },
    // Optimistic update
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['checklistItems', noteId] });
      const previous = queryClient.getQueryData(['checklistItems', noteId]);
      queryClient.setQueryData(
        ['checklistItems', noteId],
        (old: ChecklistItem[] | undefined) =>
          old?.filter((item) => item.id !== itemId),
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['checklistItems', noteId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistItems', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useItemSuggestions(prefix: string) {
  const familyId = useFamilyStore((s) => s.familyId);
  const { isOffline } = useOfflineMode();

  return useQuery({
    queryKey: ['itemSuggestions', familyId, prefix],
    queryFn: () => {
      if (isOffline) {
        return Promise.resolve(
          offlineApi.getItemSuggestionsOffline(familyId!, prefix),
        );
      }
      return api.getItemSuggestions(familyId!, prefix);
    },
    enabled: !!familyId && prefix.length >= 2,
    staleTime: 10_000,
  });
}
