import { useColorScheme } from 'react-native';
import { colors, type ThemeColors } from '@/theme';
import { useUIStore } from '@/stores/ui';

export function useTheme(): {
  colors: ThemeColors;
  isDark: boolean;
  colorScheme: 'light' | 'dark';
} {
  const systemScheme = useColorScheme();
  const themePreference = useUIStore((s) => s.themePreference);

  const colorScheme =
    themePreference === 'system' ? (systemScheme ?? 'light') : themePreference;

  return {
    colors: colors[colorScheme],
    isDark: colorScheme === 'dark',
    colorScheme,
  };
}
