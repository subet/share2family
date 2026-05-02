import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useUIStore } from '@/stores/ui';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { storage } from '@/lib/storage';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const setHasCompletedOnboarding = useUIStore((s) => s.setHasCompletedOnboarding);

  const pages = useMemo(() => [
    { emoji: '🏠', title: t('onboarding_title_1'), subtitle: t('onboarding_subtitle_1') },
    { emoji: '📋', title: t('onboarding_title_2'), subtitle: t('onboarding_subtitle_2') },
    { emoji: '❤️', title: t('onboarding_title_3'), subtitle: t('onboarding_subtitle_3') },
  ], [t]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const isLastPage = currentPage === pages.length - 1;

  const handleButtonPress = () => {
    if (isLastPage) {
      storage.set('onboarding.completed', true);
      setHasCompletedOnboarding(true);
      router.replace('/(auth)/sign-in');
    } else {
      scrollRef.current?.scrollTo({ x: (currentPage + 1) * width, animated: true });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {pages.map((page, index) => (
          <View key={index} style={[styles.page, { width }]}>
            <View style={styles.illustrationContainer}>
              <Text style={styles.illustration}>{page.emoji}</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{page.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {page.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentPage ? colors.accent : colors.border,
                  width: index === currentPage ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.buttonContainer}>
          <Button title={isLastPage ? t('onboarding_get_started') : t('next')} onPress={handleButtonPress} size="lg" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  page: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  illustrationContainer: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing['3xl'],
  },
  illustration: { fontSize: 80 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', lineHeight: 36, marginBottom: spacing.md },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: spacing['2xl'], gap: spacing['2xl'] },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  dot: { height: 8, borderRadius: 4 },
  buttonContainer: { width: '100%' },
});
