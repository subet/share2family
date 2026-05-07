import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFamilyStore } from '@/stores/family';
import { queryClient } from './query';
import { removeDeviceToken } from './notifications';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;

  // Create profile for anonymous user
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      display_name: 'User',
      avatar_emoji: '😊',
    });
  }

  return data;
}

async function captureAnonUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.is_anonymous ? data.user.id : null;
}

export type MigrationResult = 'migrated' | 'kept_existing' | 'no_op' | 'failed' | 'skipped';

async function migrateFromAnon(oldUserId: string | null): Promise<MigrationResult> {
  if (!oldUserId) return 'skipped';
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: string | null; error: { message: string } | null }>)(
    'migrate_anonymous_user_data',
    { p_old_user_id: oldUserId },
  );
  if (error) {
    // Non-fatal: user is signed in, but their old data couldn't be linked.
    console.warn('Failed to migrate anonymous user data:', error.message);
    return 'failed';
  }
  return (data as MigrationResult) ?? 'no_op';
}

async function ensureProfile(userId: string, fallbackName?: string | null) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (existing) {
    if (fallbackName && (existing.display_name === 'User' || !existing.display_name)) {
      await supabase.from('profiles').update({ display_name: fallbackName }).eq('id', userId);
    }
    return;
  }

  await supabase.from('profiles').insert({
    id: userId,
    display_name: fallbackName || 'User',
    avatar_emoji: '😊',
  });
}

export async function signInWithApple() {
  const oldAnonId = await captureAnonUserId();

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token from Apple');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign-in returned no user');

  const migration = await migrateFromAnon(oldAnonId);
  if (migration === 'kept_existing') {
    console.log('Anonymous data discarded; existing Apple account family loaded.');
  }

  const appleName = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
    : null;
  await ensureProfile(data.user.id, appleName);

  return { ...data, migration };
}

export async function signInWithGoogle() {
  const oldAnonId = await captureAnonUserId();

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token from Google');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign-in returned no user');

  const migration = await migrateFromAnon(oldAnonId);
  if (migration === 'kept_existing') {
    console.log('Anonymous data discarded; existing Google account family loaded.');
  }
  await ensureProfile(data.user.id, response.data?.user?.name ?? null);

  return { ...data, migration };
}

export async function linkWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token from Apple');
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'apple',
    options: { skipBrowserRedirect: true },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  try {
    if (userId) {
      try { await removeDeviceToken(userId); } catch { /* best effort */ }
    }
    await supabase.auth.signOut({ scope: 'local' });
  } finally {
    useFamilyStore.getState().clearFamily();
    queryClient.clear();
  }
}
