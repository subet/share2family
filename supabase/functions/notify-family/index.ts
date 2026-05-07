// notify-family
//
// Receives queue events from `process_notification_queue()` (Postgres cron),
// looks up the family's recipients, and POSTs Expo push messages.
//
// Auth: shared bearer token in `NOTIFY_FUNCTION_SECRET` env. The trigger reads
// the same value from Supabase Vault.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface QueuePayload {
  family_id: string;
  actor_id: string | null;
  event_type: 'list_created' | 'item_added' | 'list_completed';
  list_id: string | null;
  list_title: string | null;
  added_count: number;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound?: 'default';
  channelId?: string;
  priority?: 'high';
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTION_SECRET = Deno.env.get('NOTIFY_FUNCTION_SECRET') ?? '';
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function buildMessage(
  event: QueuePayload['event_type'],
  actorName: string,
  listTitle: string | null,
  addedCount: number,
): { title: string; body: string } {
  const title = listTitle ?? 'a list';
  switch (event) {
    case 'list_created':
      return { title: `${actorName} added a list`, body: `"${title}"` };
    case 'item_added': {
      const count = addedCount > 1 ? ` (${addedCount})` : '';
      return { title: `${actorName} added items${count}`, body: `to "${title}"` };
    }
    case 'list_completed':
      return { title: 'All done!', body: `"${title}" is complete` };
  }
}

async function sendBatch(messages: ExpoMessage[]): Promise<unknown[]> {
  if (messages.length === 0) return [];
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${EXPO_ACCESS_TOKEN}`;

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Expo push API error', res.status, text);
    return [];
  }
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}

async function pruneStaleTokens(messages: ExpoMessage[], tickets: unknown[]) {
  const stale: string[] = [];
  tickets.forEach((ticket, i) => {
    const t = ticket as { status?: string; details?: { error?: string } };
    if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') {
      stale.push(messages[i].to);
    }
  });
  if (stale.length === 0) return;
  await supabase.from('devices').delete().in('push_token', stale);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!FUNCTION_SECRET) {
    console.error('NOTIFY_FUNCTION_SECRET is not configured');
    return new Response('Server misconfigured', { status: 500 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${FUNCTION_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: QueuePayload;
  try {
    payload = (await req.json()) as QueuePayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload?.family_id || !payload?.event_type) {
    return new Response('Missing fields', { status: 400 });
  }

  const { data: actor } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', payload.actor_id ?? '')
    .maybeSingle();
  const actorName = actor?.display_name?.trim() || 'Someone';

  const { data: members, error: memberErr } = await supabase
    .from('family_members')
    .select('user_id, profiles(notifications_enabled, devices(push_token))')
    .eq('family_id', payload.family_id);

  if (memberErr) {
    console.error('member lookup failed', memberErr);
    return new Response(`Lookup failed: ${memberErr.message}`, { status: 500 });
  }

  const tokens: string[] = [];
  for (const m of members ?? []) {
    const row = m as {
      user_id: string;
      profiles:
        | {
            notifications_enabled: boolean;
            devices: { push_token: string | null }[] | null;
          }
        | null;
    };
    if (row.user_id === payload.actor_id) continue;
    if (row.profiles?.notifications_enabled === false) continue;
    for (const d of row.profiles?.devices ?? []) {
      if (d.push_token) tokens.push(d.push_token);
    }
  }

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { title, body } = buildMessage(
    payload.event_type,
    actorName,
    payload.list_title,
    payload.added_count ?? 1,
  );

  const messages: ExpoMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default',
    channelId: 'default',
    priority: 'high',
    data: {
      type: payload.event_type,
      listId: payload.list_id,
      familyId: payload.family_id,
    },
  }));

  // Expo accepts up to 100 messages per request
  const tickets: unknown[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const batchTickets = await sendBatch(batch);
    tickets.push(...batchTickets);
  }

  await pruneStaleTokens(messages, tickets);

  return new Response(JSON.stringify({ sent: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
