import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFamilyStore } from '@/stores/family';
import { useAuthStore } from '@/stores/auth';
import { useOfflineMode } from '@/lib/offlineMode';
import { getCached, setCache, cacheKeys } from '@/lib/offlineCache';
import * as api from '../api';
import * as offlineApi from '../offlineApi';
import type { NoteWithMeta } from '../api';

export function useNotes() {
  const familyId = useFamilyStore((s) => s.familyId);
  const { isOffline, isOfflineMode } = useOfflineMode();

  return useQuery({
    queryKey: ['notes', familyId],
    queryFn: async () => {
      if (isOffline) {
        return offlineApi.getNotesOffline(familyId!);
      }
      const data = await api.getNotes(familyId!);
      // Keep cache warm when online + offline mode enabled
      if (isOfflineMode) {
        setCache(cacheKeys.notes(familyId!), data);
      }
      return data;
    },
    enabled: !!familyId,
    initialData: isOfflineMode && familyId
      ? () => getCached<NoteWithMeta[]>(cacheKeys.notes(familyId)) ?? undefined
      : undefined,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const familyId = useFamilyStore((s) => s.familyId);
  const user = useAuthStore((s) => s.user);
  const { isOffline } = useOfflineMode();

  return useMutation({
    mutationFn: (params: { title: string; emoji: string | null; categoryId: string | null }) => {
      if (isOffline) {
        return Promise.resolve(
          offlineApi.createNoteOffline({
            familyId: familyId!,
            title: params.title,
            emoji: params.emoji,
            createdBy: user!.id,
          }),
        );
      }
      return api.createNote({
        familyId: familyId!,
        title: params.title,
        emoji: params.emoji,
        createdBy: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', familyId] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const familyId = useFamilyStore((s) => s.familyId);
  const user = useAuthStore((s) => s.user);
  const { isOffline } = useOfflineMode();

  return useMutation({
    mutationFn: (params: { noteId: string; title?: string; emoji?: string | null }) => {
      if (isOffline) {
        return Promise.resolve(
          offlineApi.updateNoteOffline(params.noteId, familyId!, {
            title: params.title,
            emoji: params.emoji,
            updated_by: user!.id,
          }),
        );
      }
      return api.updateNote(params.noteId, {
        title: params.title,
        emoji: params.emoji,
        updated_by: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', familyId] });
    },
  });
}

export function useReorderNotes() {
  const queryClient = useQueryClient();
  const familyId = useFamilyStore((s) => s.familyId);
  const { isOffline } = useOfflineMode();

  return useMutation({
    mutationFn: (notes: { id: string; position: number }[]) => {
      if (isOffline) {
        offlineApi.reorderNotesOffline(familyId!, notes);
        return Promise.resolve();
      }
      return api.updateNotePositions(notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', familyId] });
    },
  });
}

export function useArchiveNote() {
  const queryClient = useQueryClient();
  const familyId = useFamilyStore((s) => s.familyId);
  const user = useAuthStore((s) => s.user);
  const { isOffline } = useOfflineMode();

  return useMutation({
    mutationFn: (noteId: string) => {
      if (isOffline) {
        offlineApi.archiveNoteOffline(noteId, familyId!, user!.id);
        return Promise.resolve();
      }
      return api.archiveNote(noteId, user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', familyId] });
    },
  });
}
