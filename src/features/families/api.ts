import { supabase } from '@/lib/supabase';

export async function createFamily(name: string, userId: string) {
  const { data, error } = await supabase.rpc('create_family_with_code', {
    p_name: name,
    p_creator_id: userId,
  });

  if (error) throw error;
  return data as { id: string; name: string; invite_code: string };
}

export async function joinFamily(code: string, userId: string) {
  const { data, error } = await supabase.rpc('join_family_with_code', {
    p_code: code,
    p_user_id: userId,
  });

  if (error) throw error;
  return data as { family_id: string; family_name: string };
}

export interface FamilyJoinCheck {
  family_id: string;
  family_name: string;
  member_count: number;
  max_members: number;
  is_premium: boolean;
}

export async function checkFamilyCanJoin(code: string): Promise<FamilyJoinCheck> {
  const { data, error } = await supabase.rpc('check_family_can_join', {
    p_code: code,
  });

  if (error) throw error;
  return data as unknown as FamilyJoinCheck;
}

export async function upgradeFamilyToPremium(familyId: string) {
  const { error } = await supabase.rpc('upgrade_family_to_premium', {
    p_family_id: familyId,
  });

  if (error) throw error;
}

export async function lookupInviteCode(code: string) {
  const { data, error } = await supabase.rpc('lookup_invite_code', {
    code: code.replace(/-/g, '').toUpperCase(),
  });

  if (error) throw error;
  return data;
}

export interface UserFamilyData {
  family_id: string;
  role: string;
  families: {
    id: string;
    name: string | null;
    invite_code: string | null;
    invite_code_expires_at: string | null;
    max_members: number;
    is_premium: boolean;
  } | null;
}

export async function getUserFamily(userId: string): Promise<UserFamilyData | null> {
  const { data, error } = await supabase
    .from('family_members')
    .select('family_id, role, families(id, name, invite_code, invite_code_expires_at, max_members, is_premium)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as UserFamilyData | null;
}

export interface FamilyMemberWithProfile {
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_emoji: string;
  } | null;
}

export async function getFamilyMembers(familyId: string): Promise<FamilyMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('user_id, role, joined_at, profiles(id, display_name, avatar_emoji)')
    .eq('family_id', familyId);

  if (error) throw error;
  return (data ?? []) as FamilyMemberWithProfile[];
}

export async function leaveFamily(familyId: string) {
  const { error } = await supabase.rpc('leave_family', {
    p_family_id: familyId,
  });

  if (error) throw error;
}

export async function removeFamilyMember(familyId: string, userId: string) {
  const { error } = await supabase.rpc('remove_family_member', {
    p_family_id: familyId,
    p_user_id: userId,
  });

  if (error) throw error;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function upsertProfile(
  userId: string,
  profile: { display_name: string; avatar_emoji: string },
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile })
    .select()
    .single();

  if (error) throw error;
  return data;
}
