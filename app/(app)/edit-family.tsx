import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { useFamilyStore } from '@/stores/family';
import { useLeaveFamily } from '@/features/families/hooks/useFamily';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing, radii } from '@/theme';
import { formatInviteCode } from '@/constants/invite';
import { lightHaptic } from '@/lib/haptics';
import { useQueryClient } from '@tanstack/react-query';

export default function EditFamilyScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const familyId = useFamilyStore((s) => s.familyId);
  const familyName = useFamilyStore((s) => s.familyName);
  const inviteCode = useFamilyStore((s) => s.inviteCode);
  const members = useFamilyStore((s) => s.members);
  const leaveFamily = useLeaveFamily();

  const [name, setName] = useState(familyName ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !familyId) return;
    setSaving(true);
    try {
      await supabase
        .from('families')
        .update({ name: name.trim() })
        .eq('id', familyId);
      // Update Zustand store immediately so Settings reflects the change
      useFamilyStore.getState().setFamily({
        id: familyId,
        name: name.trim(),
        inviteCode: inviteCode,
      });
      queryClient.invalidateQueries({ queryKey: ['family'] });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error_generic');
      Alert.alert(t('error'), message);
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveFamily = () => {
    Alert.alert(
      t('edit_family_leave_title'),
      t('edit_family_leave_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('edit_family_leave_confirm'),
          style: 'destructive',
          onPress: () => {
            if (familyId) {
              leaveFamily.mutate(familyId, {
                onSuccess: () => router.replace('/'),
              });
            }
          },
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + spacing.md },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('edit_family_title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Family name */}
        <Input
          label={t('edit_family_name_label')}
          placeholder={t('edit_family_name_placeholder')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Members */}
        <View style={styles.membersSection}>
          <Text style={[styles.membersLabel, { color: colors.textSecondary }]}>{t('edit_family_members')}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {members.map((m) => (
              <View
                key={m.userId}
                style={[styles.memberRow, { borderBottomColor: colors.border }]}
              >
                <Text style={styles.memberEmoji}>{m.avatarEmoji}</Text>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {m.displayName}
                </Text>
                <Text style={[styles.memberRole, { color: colors.textTertiary }]}>
                  {m.role}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Invite code */}
        {inviteCode && members.length < 2 && (
          <View style={styles.inviteSection}>
            <Text style={[styles.membersLabel, { color: colors.textSecondary }]}>
              {t('edit_family_invite_code')}
            </Text>
            <View style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.inviteCode, { color: colors.text }]}>
                {formatInviteCode(inviteCode)}
              </Text>
              <Pressable
                onPress={() => {
                  lightHaptic();
                  Share.share({
                    message: t('invite_share_message', { name: familyName ?? '', code: formatInviteCode(inviteCode) }),
                  });
                }}
                hitSlop={8}
              >
                <Ionicons name="share-outline" size={22} color={colors.accent} />
              </Pressable>
            </View>
            <Text style={[styles.inviteHint, { color: colors.textTertiary }]}>
              {t('edit_family_invite_hint')}
            </Text>
          </View>
        )}

        {/* Save */}
        <Button
          title={t('save')}
          onPress={handleSave}
          size="lg"
          loading={saving}
          disabled={!name.trim()}
        />

        {/* Leave family */}
        <View style={styles.dangerZone}>
          <Button
            title={t('edit_family_leave')}
            onPress={handleLeaveFamily}
            variant="destructive"
            size="md"
            loading={leaveFamily.isPending}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing['2xl'],
  },
  membersSection: {
    gap: spacing.sm,
  },
  membersLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  memberEmoji: {
    fontSize: 24,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
  },
  memberRole: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  inviteSection: {
    gap: spacing.sm,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
  },
  inviteHint: {
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  dangerZone: {
    marginTop: -spacing.sm,
  },
});
