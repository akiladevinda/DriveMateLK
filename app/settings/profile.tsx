import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppHeader, AppScreen, FormInput, PrimaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import { profileUpdateSchema, type ProfileUpdateInput } from '@/schemas/auth';
import * as profileService from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function ProfileSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      home_district: profile?.home_district ?? '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        home_district: profile.home_district ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const result = await profileService.updateProfile(user.id, data);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('more.profile')} />
      <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
      <View style={styles.form}>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.full_name?.message}
              label={t('auth.fullName')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.phone?.message}
              keyboardType="phone-pad"
              label="Phone"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
            />
          )}
        />
        <Controller
          control={control}
          name="home_district"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.home_district?.message}
              label="Home district"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
            />
          )}
        />
        {error ? <Text style={[styles.feedback, { color: colors.danger }]}>{error}</Text> : null}
        {saved ? (
          <Text style={[styles.feedback, { color: colors.success }]}>Profile saved.</Text>
        ) : null}
        <PrimaryButton label={t('common.save')} loading={loading} onPress={onSubmit} />
        <PrimaryButton
          label={t('more.deleteAccount')}
          onPress={() => router.push('/settings/delete-account')}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  email: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  feedback: {
    ...typography.caption,
  },
});
