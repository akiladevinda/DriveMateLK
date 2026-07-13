import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/localization';
import { useAuthStore } from '@/stores/auth-store';
import { brand, radii, spacing, typography } from '@/theme/tokens';

export default function AccountCreatedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ring, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, ring, scale]);

  const continueOnboarding = () => {
    if (!session) {
      router.replace('/(auth)/sign-in');
      return;
    }
    router.replace('/(onboarding)/welcome');
  };

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.15],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        },
      ]}
    >
      <View style={styles.glow} />

      <View style={styles.content}>
        <Animated.View style={[styles.badgeWrap, { opacity, transform: [{ scale }] }]}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={42} color={brand.white} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity }}>
          <Text style={styles.brand}>
            DriveMate <Text style={styles.brandLk}>LK</Text>
          </Text>
          <Text style={styles.title}>{t('auth.accountCreatedTitle')}</Text>
          <Text style={styles.body}>{t('auth.accountCreatedBody')}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={continueOnboarding}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.ctaLabel}>{t('auth.accountCreatedCta')}</Text>
          <Ionicons name="arrow-forward" size={20} color={brand.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.navy,
  },
  glow: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(46, 201, 70, 0.12)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  badgeWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: brand.green,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: brand.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  brandLk: {
    color: brand.green,
  },
  title: {
    color: brand.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    color: '#C5D0DC',
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  email: {
    color: brand.green,
    ...typography.bodyStrong,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  cta: {
    minHeight: 54,
    borderRadius: radii.full,
    backgroundColor: brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaLabel: {
    color: brand.white,
    ...typography.bodyStrong,
    fontWeight: '700',
  },
});
