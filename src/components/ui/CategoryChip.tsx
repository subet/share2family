import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { radii, spacing } from '@/theme';
import { selectionHaptic } from '@/lib/haptics';
import { CATEGORY_ICON_MAP } from '@/constants/categories';

interface CategoryChipProps {
  name: string;
  emoji?: string | null;
  color?: string | null;
  isSelected: boolean;
  onPress: () => void;
}

export function CategoryChip({ name, emoji, color, isSelected, onPress }: CategoryChipProps) {
  const { colors } = useTheme();
  const chipColor = color ?? colors.accent;
  const iconName = emoji ? CATEGORY_ICON_MAP[emoji] : undefined;

  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? chipColor : colors.surfaceSecondary,
          borderColor: isSelected ? chipColor : colors.border,
        },
      ]}
    >
      {iconName && (
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={14}
          color={isSelected ? '#FFFFFF' : colors.textSecondary}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
        ]}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
