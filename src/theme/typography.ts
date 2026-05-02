import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'SF Pro Text',
  android: 'Inter',
  default: 'System',
});

const fontFamilyMedium = Platform.select({
  ios: 'SF Pro Text',
  android: 'Inter',
  default: 'System',
});

const fontFamilyBold = Platform.select({
  ios: 'SF Pro Text',
  android: 'Inter',
  default: 'System',
});

export const typography = {
  largeTitle: {
    fontFamily: fontFamilyBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  title: {
    fontFamily: fontFamilyBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  title2: {
    fontFamily: fontFamilyBold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  headline: {
    fontFamily: fontFamilyMedium,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  callout: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  subhead: {
    fontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400' as const,
  },
  footnote: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
} as const;
