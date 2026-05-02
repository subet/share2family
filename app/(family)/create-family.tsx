import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/theme';
import { useCreateFamily } from '@/features/families/hooks/useFamily';

export default function CreateFamilyScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [familyName, setFamilyName] = useState('');
  const createFamily = useCreateFamily();

  const handleCreate = async () => {
    const name = familyName.trim();
    if (!name) { Alert.alert(t('create_family_name_required'), t('create_family_name_required_message')); return; }
    try {
      const result = await createFamily.mutateAsync(name);
      router.replace({ pathname: '/(family)/invite', params: { code: result.invite_code, name: result.name } });
    } catch (error: unknown) {
      Alert.alert(t('error'), error instanceof Error ? error.message : t('error_generic'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('create_family_title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('create_family_subtitle')}</Text>
        </View>
        <Input placeholder={t('create_family_placeholder')} value={familyName} onChangeText={setFamilyName}
          autoCapitalize="words" autoFocus returnKeyType="done" onSubmitEditing={handleCreate} />
        <View style={styles.footer}>
          <Button title={t('create')} onPress={handleCreate} size="lg" loading={createFamily.isPending} disabled={!familyName.trim()} />
          <Button title={t('back')} onPress={() => router.back()} variant="ghost" size="md" />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['2xl'] },
  header: { gap: spacing.sm, marginBottom: spacing['3xl'] },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24 },
  footer: { marginTop: 'auto', gap: spacing.md },
});
