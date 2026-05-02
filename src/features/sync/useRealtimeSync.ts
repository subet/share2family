import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useFamilyStore } from '@/stores/family';
import { useAuthStore } from '@/stores/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const familyId = useFamilyStore((s) => s.familyId);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!familyId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`family:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notes', familyId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items',
        },
        (payload) => {
          const noteId =
            (payload.new as { note_id?: string })?.note_id ??
            (payload.old as { note_id?: string })?.note_id;
          if (noteId) {
            queryClient.invalidateQueries({
              queryKey: ['checklistItems', noteId],
            });
          }
          queryClient.invalidateQueries({ queryKey: ['notes', familyId] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['familyMembers', familyId] });
          queryClient.invalidateQueries({ queryKey: ['family'] });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, queryClient]);
}

export function usePresence(familyId: string | null) {
  const user = useAuthStore((s) => s.user);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

  useEffect(() => {
    if (!familyId || !user) return;

    const channel = supabase.channel(`presence:${familyId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineMembers(Object.keys(state));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, user]);

  return onlineMembers;
}
