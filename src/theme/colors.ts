export const colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: '#FAFAF7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F2F2ED',
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textTertiary: '#9B9B9B',
    accent: '#D97757',
    accentLight: '#D9775720',
    border: '#E5E5E0',
    destructive: '#DC3545',
    destructiveLight: '#DC354520',
    success: '#28A745',
    overlay: '#00000040',
  },
  dark: {
    background: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceSecondary: '#252525',
    text: '#F5F5F0',
    textSecondary: '#A0A0A0',
    textTertiary: '#6B6B6B',
    accent: '#D97757',
    accentLight: '#D9775730',
    border: '#2A2A2A',
    destructive: '#E85D6F',
    destructiveLight: '#E85D6F25',
    success: '#34C759',
    overlay: '#00000060',
  },
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentLight: string;
  border: string;
  destructive: string;
  destructiveLight: string;
  success: string;
  overlay: string;
}
