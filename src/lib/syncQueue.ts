import { MMKV } from 'react-native-mmkv';
import * as Crypto from 'expo-crypto';

const store = new MMKV({ id: 'share2family-offline' });
const QUEUE_KEY = 'syncQueue';

export interface PendingMutation {
  id: string;
  createdAt: string;
  type: 'create' | 'update' | 'delete';
  table: 'notes' | 'checklist_items' | 'profiles' | 'families';
  entityId: string;
  params: Record<string, unknown>;
}

export function getQueue(): PendingMutation[] {
  const raw = store.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingMutation[];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingMutation[]): void {
  store.set(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(
  mutation: Omit<PendingMutation, 'id' | 'createdAt'>,
): void {
  const queue = getQueue();
  queue.push({
    ...mutation,
    id: Crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  saveQueue(queue);
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter((m) => m.id !== id);
  saveQueue(queue);
}

export function clearQueue(): void {
  store.delete(QUEUE_KEY);
}

export function getQueueLength(): number {
  return getQueue().length;
}
