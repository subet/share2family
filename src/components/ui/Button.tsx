import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { radii, spacing } from '@/theme';
import { lightHaptic } from '@/lib/haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
}: ButtonProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    lightHaptic();
    onPress();
  };

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.xl,
    opacity: disabled ? 0.5 : 1,
    ...(fullWidth && { width: '100%' }),
    ...(size === 'sm' && { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }),
    ...(size === 'md' && { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl }),
    ...(size === 'lg' && { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'] }),
    ...(variant === 'primary' && { backgroundColor: colors.accent }),
    ...(variant === 'secondary' && { backgroundColor: colors.surfaceSecondary }),
    ...(variant === 'outline' && {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
    }),
    ...(variant === 'ghost' && { backgroundColor: 'transparent' }),
    ...(variant === 'destructive' && { backgroundColor: colors.destructiveLight }),
  };

  const textStyle: TextStyle = {
    fontSize: size === 'sm' ? 14 : size === 'lg' ? 17 : 16,
    fontWeight: '600',
    ...(variant === 'primary' && { color: '#FFFFFF' }),
    ...(variant === 'secondary' && { color: colors.text }),
    ...(variant === 'outline' && { color: colors.text }),
    ...(variant === 'ghost' && { color: colors.accent }),
    ...(variant === 'destructive' && { color: colors.destructive }),
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.accent} size="small" />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
});
