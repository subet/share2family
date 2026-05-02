import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { useNotes, useCreateNote, useReorderNotes } from '@/features/notes/hooks/useNotes';
import { useFamilyMembers } from '@/features/families/hooks/useFamily';
import { useFamilyStore } from '@/stores/family';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, radii } from '@/theme';
import { lightHaptic, selectionHaptic, mediumHaptic } from '@/lib/haptics';
import { NOTE_ICONS, DEFAULT_NOTE_ICON } from '@/constants/emojis';
import { useTranslation } from '@/i18n';
import { formatRelativeTime } from '@/lib/formatDate';
import { useOfflineMode } from '@/lib/offlineMode';
import type { NoteWithMeta } from '@/features/notes/api';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const familyId = useFamilyStore((s) => s.familyId);
  const familyName = useFamilyStore((s) => s.familyName);

  const { isOffline } = useOfflineMode();
  const { data: notes, isLoading: notesLoading, refetch } = useNotes();
  useFamilyMembers(familyId);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const reorderNotes = useReorderNotes();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Create note form state
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState<string>(DEFAULT_NOTE_ICON);
  const [isReordering, setIsReordering] = useState(false);
  const createNote = useCreateNote();

  const handleCreateNote = async () => {
    if (!newTitle.trim()) return;
    try {
      await createNote.mutateAsync({ title: newTitle.trim(), emoji: newIcon, categoryId: null });
      setNewTitle('');
      setNewIcon(DEFAULT_NOTE_ICON);
      bottomSheetRef.current?.close();
    } catch (error) {
      console.error('Create note failed:', error);
    }
  };

  const openCreateSheet = () => {
    lightHaptic();
    bottomSheetRef.current?.expand();
  };

  const handleMoveUp = (index: number) => {
    if (!notes || index <= 0) return;
    mediumHaptic();
    const reordered = [...notes];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    reorderNotes.mutate(reordered.map((n, i) => ({ id: n.id, position: i })));
  };

  const handleMoveDown = (index: number) => {
    if (!notes || index >= notes.length - 1) return;
    mediumHaptic();
    const reordered = [...notes];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    reorderNotes.mutate(reordered.map((n, i) => ({ id: n.id, position: i })));
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.lg }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/icon.png')} style={styles.headerLogo} />
          <Text style={[styles.familyName, { color: colors.text }]}>
            {familyName ?? t('app_name')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isOffline && (
            <View style={[styles.headerIconButton, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="cloud-offline-outline" size={20} color={colors.textTertiary} />
            </View>
          )}
          {notes && notes.length > 1 && (
            <Pressable
              onPress={() => { selectionHaptic(); setIsReordering((v) => !v); }}
              style={({ pressed }) => [
                styles.headerIconButton,
                {
                  backgroundColor: isReordering ? colors.accentLight : colors.surfaceSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="swap-vertical-outline" size={20} color={isReordering ? colors.accent : colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            style={({ pressed }) => [
              styles.headerIconButton,
              { backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Notes list */}
      {!notesLoading && (!notes || notes.length === 0) ? (
        <View style={styles.listContainer}>
          <EmptyState
            icon="document-text-outline"
            title={t('home_empty_title')}
            description={t('home_empty_description')}
            actionTitle={t('home_empty_action')}
            onAction={openCreateSheet}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          {(notes ?? []).map((item: NoteWithMeta, index: number) => (
            <Pressable
              key={item.id}
              onPress={() => {
                lightHaptic();
                router.push({
                  pathname: '/(app)/list/[id]',
                  params: { id: item.id, title: item.title, icon: item.emoji ?? DEFAULT_NOTE_ICON },
                });
              }}
              style={({ pressed }) => [
                styles.noteCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <View style={styles.noteCardRow}>
                {/* Reorder buttons (only visible when reordering) */}
                {isReordering && (
                  <View style={styles.reorderButtons}>
                    <Pressable
                      onPress={() => handleMoveUp(index)}
                      hitSlop={4}
                      style={{ opacity: index === 0 ? 0.2 : 1 }}
                      disabled={index === 0}
                    >
                      <Ionicons name="chevron-up" size={16} color={colors.textTertiary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleMoveDown(index)}
                      hitSlop={4}
                      style={{ opacity: index === (notes?.length ?? 0) - 1 ? 0.2 : 1 }}
                      disabled={index === (notes?.length ?? 0) - 1}
                    >
                      <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                )}

                {/* Icon */}
                <Ionicons
                  name={(item.emoji ?? DEFAULT_NOTE_ICON) as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={colors.accent}
                />

                {/* Title */}
                <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>

                {/* Meta: count + last activity */}
                <View style={styles.noteMeta}>
                  <Text style={[styles.noteMetaText, { color: colors.textTertiary }]}>
                    {item.item_count} {item.item_count === 1 ? 'item' : 'items'}
                  </Text>
                  {item.last_item_at && (
                    <Text style={[styles.noteMetaText, { color: colors.textTertiary }]}>
                      {formatRelativeTime(item.last_item_at)}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      {notes && notes.length > 0 && (
        <Pressable
          onPress={openCreateSheet}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.accent, bottom: insets.bottom + spacing.xl, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Create Note Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={[320]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('home_new_checklist')}</Text>
          <Input
            placeholder={t('home_checklist_placeholder')}
            value={newTitle}
            onChangeText={setNewTitle}
            autoCapitalize="sentences"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
            {NOTE_ICONS.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => { selectionHaptic(); setNewIcon(icon); }}
                style={[styles.iconOption, {
                  backgroundColor: icon === newIcon ? colors.accentLight : colors.surfaceSecondary,
                  borderColor: icon === newIcon ? colors.accent : 'transparent',
                }]}
              >
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={icon === newIcon ? colors.accent : colors.textSecondary}
                />
              </Pressable>
            ))}
          </ScrollView>
          <Button title={t('create')} onPress={handleCreateNote} size="lg" loading={createNote.isPending} disabled={!newTitle.trim()} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'], marginBottom: spacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  familyName: { fontSize: 20, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listContainer: { flex: 1, paddingHorizontal: spacing['2xl'], paddingTop: spacing.md },
  noteCard: { padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1 },
  noteCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reorderButtons: { alignItems: 'center', gap: 2 },
  noteTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  noteMeta: { alignItems: 'flex-end', gap: 2 },
  noteMetaText: { fontSize: 12 },
  fab: {
    position: 'absolute', right: spacing['2xl'], width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  sheetContent: { paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  sheetTitle: { fontSize: 20, fontWeight: '600' },
  iconRow: { gap: spacing.sm },
  iconOption: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
