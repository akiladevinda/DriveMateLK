import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AuthScreenShell, authFonts } from '@/components/auth/AuthScreenShell';
import { FormInput, PasswordInput, PrimaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import { signUpSchema, type SignUpInput } from '@/schemas/auth';
import { useAuthStore } from '@/stores/auth-store';
import { brand, spacing } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    clearError();
    setLocalError(null);
    try {
      const ok = await signUp(data.email, data.password, data.fullName);
      if (!ok) {
        const latestError = useAuthStore.getState().error;
        setLocalError(latestError ?? storeError ?? t('common.error'));
        return;
      }
      router.replace('/(auth)/account-created');
    } catch (error) {
      setLocalError(getErrorMessage(error));
    }
  });

  return (
    <AuthScreenShell
      showBack
      compactBrand
      headline="Create your account"
      supporting="Join DriveMate LK and keep your vehicle history in one place."
    >
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            error={errors.fullName?.message}
            label={t('auth.fullName')}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Your name"
            tone="dark"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email?.message}
            keyboardType="email-address"
            label={t('auth.email')}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="you@email.com"
            tone="dark"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput
            error={errors.password?.message}
            label={t('auth.password')}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Create a password"
            tone="dark"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput
            error={errors.confirmPassword?.message}
            label="Confirm password"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Repeat password"
            tone="dark"
            value={value}
          />
        )}
      />

      {localError || storeError ? (
        <Animated.Text entering={FadeIn} style={styles.error}>
          {localError ?? storeError}
        </Animated.Text>
      ) : null}

      <PrimaryButton label={t('auth.signUp')} loading={isLoading} onPress={onSubmit} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.haveAccount')} </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.linkAccent}>{t('auth.signIn')}</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: authFonts.caption,
    fontSize: 13,
    color: '#FF8A80',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  footerText: {
    fontFamily: authFonts.body,
    fontSize: 14,
    color: 'rgba(245,247,250,0.65)',
  },
  linkAccent: {
    fontFamily: authFonts.bodyStrong,
    fontSize: 15,
    color: brand.green,
  },
});
