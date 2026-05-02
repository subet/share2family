import { useState, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/lib/useTheme';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  useChecklistItems,
  useAddChecklistItem,
  useToggleChecklistItem,
  useDeleteChecklistItem,
  useItemSuggestions,
} from '@/features/checklists/hooks/useChecklist';
import { useUpdateNote, useArchiveNote } from '@/features/notes/hooks/useNotes';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing, radii } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { NOTE_ICONS, DEFAULT_NOTE_ICON } from '@/constants/emojis';
import { lightHaptic, selectionHaptic, mediumHaptic, successHaptic } from '@/lib/haptics';
import { useTranslation } from '@/i18n';
import type { ChecklistItem } from '@/types/database';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

const SwipeableItem = memo(function SwipeableItem({
  item,
  onToggle,
  onDelete,
}: {
  item: ChecklistItem;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);

  const doToggle = useCallback(() => {
    successHaptic();
    onToggle(item.id, !item.is_completed);
  }, [item.id, item.is_completed, onToggle]);

  const doDelete = useCallback(() => {
    mediumHaptic();
    onDelete(item.id);
  }, [item.id, onDelete]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((e) => {
      // Clamp: allow right swipe (positive) and left swipe (negative)
      translateX.value = Math.max(-SCREEN_WIDTH, Math.min(SCREEN_WIDTH, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // Swipe right → toggle complete
        translateX.value = withTiming(0, { duration: 200 });
        runOnJS(doToggle)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Swipe left → delete
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(doDelete)();
        });
      } else {
        translateX.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Green background revealed on right swipe
  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? 1 : 0,
  }));

  // Red background revealed on left swipe
  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  return (
    <View style={[styles.swipeContainer, { borderBottomColor: colors.border }]}>
      {/* Left action - complete/uncomplete */}
      <Animated.View style={[styles.actionBackground, styles.leftAction, leftActionStyle]}>
        <Ionicons
          name={item.is_completed ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
          size={24}
          color="#FFFFFF"
        />
      </Animated.View>

      {/* Right action - delete */}
      <Animated.View style={[styles.actionBackground, styles.rightAction, rightActionStyle]}>
        <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
      </Animated.View>

      {/* Foreground row */}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.itemRow,
            { backgroundColor: colors.background },
            animatedRowStyle,
          ]}
        >
          <Text
            style={[
              styles.itemText,
              {
                color: item.is_completed ? colors.textTertiary : colors.text,
                textDecorationLine: item.is_completed ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={2}
          >
            {item.content}
          </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export default function ChecklistDetailScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id, title, icon } = useLocalSearchParams<{
    id: string;
    title: string;
    icon: string;
  }>();

  const { data: items } = useChecklistItems(id);
  const addItem = useAddChecklistItem(id);
  const toggleItem = useToggleChecklistItem(id);
  const deleteItem = useDeleteChecklistItem(id);
  const updateNote = useUpdateNote();
  const archiveNote = useArchiveNote();

  const [newItemText, setNewItemText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Edit sheet state
  const editSheetRef = useRef<BottomSheet>(null);
  const [editTitle, setEditTitle] = useState(title ?? '');
  const [editIcon, setEditIcon] = useState(icon ?? DEFAULT_NOTE_ICON);

  const handleOpenEdit = () => {
    lightHaptic();
    setEditTitle(title ?? '');
    setEditIcon(icon ?? DEFAULT_NOTE_ICON);
    editSheetRef.current?.expand();
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateNote.mutateAsync({
        noteId: id,
        title: editTitle.trim(),
        emoji: editIcon,
      });
      editSheetRef.current?.close();
      // Update the header params
      router.setParams({ title: editTitle.trim(), icon: editIcon });
    } catch (error) {
      console.error('Update note failed:', error);
    }
  };

  const handleDeleteList = () => {
    Alert.alert(
      t('checklist_delete_title'),
      t('checklist_delete_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            mediumHaptic();
            await archiveNote.mutateAsync(id);
            editSheetRef.current?.close();
            router.back();
          },
        },
      ],
    );
  };

  // Smart suggestions
  const { data: suggestions } = useItemSuggestions(newItemText);

  const handleAddItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    lightHaptic();
    addItem.mutate(text);
    setNewItemText('');
  };

  const handleSuggestionPress = (suggestion: string) => {
    selectionHaptic();
    addItem.mutate(suggestion);
    setNewItemText('');
    inputRef.current?.focus();
  };

  const handleToggle = useCallback(
    (itemId: string, isCompleted: boolean) => {
      toggleItem.mutate({ itemId, isCompleted });
    },
    [toggleItem],
  );

  const handleDelete = useCallback(
    (itemId: string) => {
      deleteItem.mutate(itemId);
    },
    [deleteItem],
  );

  const uncompleted = items?.filter((i) => !i.is_completed) ?? [];
  const completed = items?.filter((i) => i.is_completed) ?? [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Ionicons
          name={(icon ?? 'clipboard-outline') as keyof typeof Ionicons.glyphMap}
          size={22}
          color={colors.accent}
        />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={handleOpenEdit} style={styles.editButton} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Items list */}
      {(!items || items.length === 0) ? (
        <View style={styles.listContainer}>
          <EmptyState
            icon="sparkles-outline"
            title={t('checklist_empty_title')}
            description={t('checklist_empty_description')}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {uncompleted.map((item) => (
            <SwipeableItem
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}

          {completed.length > 0 && (
            <>
              <View style={styles.completedHeader}>
                <Text style={[styles.completedLabel, { color: colors.textTertiary }]}>
                  {t('checklist_completed', { count: completed.length })}
                </Text>
              </View>
              {completed.map((item) => (
                <SwipeableItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && newItemText.length >= 2 && (
        <View style={[styles.suggestions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s.item_name}
              onPress={() => handleSuggestionPress(s.item_name)}
              style={[styles.suggestionChip, { backgroundColor: colors.surfaceSecondary }]}
            >
              <Text style={[styles.suggestionText, { color: colors.text }]}>
                {s.item_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Add item input */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder={t('checklist_add_placeholder')}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.textInput,
            { color: colors.text, backgroundColor: colors.surfaceSecondary },
          ]}
          returnKeyType="done"
          onSubmitEditing={handleAddItem}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={handleAddItem}
          disabled={!newItemText.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor: newItemText.trim() ? colors.accent : colors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={newItemText.trim() ? '#FFFFFF' : colors.textTertiary}
          />
        </Pressable>
      </View>
      {/* Edit List Bottom Sheet */}
      <BottomSheet
        ref={editSheetRef}
        index={-1}
        snapPoints={[420]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('checklist_edit_title')}</Text>

          <Input
            placeholder={t('checklist_edit_placeholder')}
            value={editTitle}
            onChangeText={setEditTitle}
            autoCapitalize="sentences"
          />

          {/* Icon picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconRow}
          >
            {NOTE_ICONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => {
                  selectionHaptic();
                  setEditIcon(ic);
                }}
                style={[
                  styles.iconOption,
                  {
                    backgroundColor:
                      ic === editIcon ? colors.accentLight : colors.surfaceSecondary,
                    borderColor: ic === editIcon ? colors.accent : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={ic as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={ic === editIcon ? colors.accent : colors.textSecondary}
                />
              </Pressable>
            ))}
          </ScrollView>

          <Button
            title={t('save')}
            onPress={handleSaveEdit}
            size="lg"
            loading={updateNote.isPending}
            disabled={!editTitle.trim()}
          />

          <Button
            title={t('checklist_delete_button')}
            onPress={handleDeleteList}
            variant="destructive"
            size="md"
          />
        </BottomSheetView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  swipeContainer: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  leftAction: {
    backgroundColor: '#28A745',
    justifyContent: 'flex-start',
  },
  rightAction: {
    backgroundColor: '#DC3545',
    justifyContent: 'flex-end',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  completedHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  completedLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  suggestionChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  iconRow: {
    gap: spacing.sm,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
