import { type ReactNode, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { brand, hitSlop, minTouchTarget, radii, spacing } from '@/theme/tokens';

const fonts = {
  display: 'Outfit_700Bold',
  title: 'Outfit_600SemiBold',
  body: 'DMSans_400Regular',
  bodyStrong: 'DMSans_600SemiBold',
  caption: 'DMSans_500Medium',
} as const;

type AuthScreenShellProps = {
  children: ReactNode;
  /** Short line under the brand (e.g. Welcome back) */
  headline?: string;
  supporting?: string;
  showBack?: boolean;
  /** Tighter brand block when the form is longer */
  compactBrand?: boolean;
};

function GlowOrb({
  style,
  delayMs,
  size,
  color,
}: {
  style: object;
  delayMs: number;
  size: number;
  color: string;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.12]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}

export function AuthScreenShell({
  children,
  headline,
  supporting,
  showBack = false,
  compactBrand = false,
}: AuthScreenShellProps) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#07111C', brand.navy, '#10253A']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <GlowOrb
        color="rgba(46, 201, 70, 0.28)"
        delayMs={0}
        size={220}
        style={styles.orbTopRight}
      />
      <GlowOrb
        color="rgba(46, 201, 70, 0.16)"
        delayMs={900}
        size={180}
        style={styles.orbBottomLeft}
      />
      <GlowOrb
        color="rgba(249, 168, 38, 0.12)"
        delayMs={1400}
        size={140}
        style={styles.orbMid}
      />

      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {showBack ? (
              <Animated.View entering={FadeInUp.duration(400)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={hitSlop}
                  onPress={() => {
                    if (router.canGoBack()) router.back();
                    else router.replace('/(auth)/sign-in');
                  }}
                  style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
                >
                  <Ionicons name="chevron-back" size={22} color={brand.offWhite} />
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.backSpacer} />
            )}

            <Animated.View
              entering={FadeInDown.duration(650).delay(80).easing(Easing.out(Easing.cubic))}
              style={[styles.brandBlock, compactBrand && styles.brandBlockCompact]}
            >
              <Text style={styles.brandMark}>DriveMate LK</Text>
              {headline ? <Text style={styles.headline}>{headline}</Text> : null}
              {supporting ? <Text style={styles.supporting}>{supporting}</Text> : null}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(700).delay(220).easing(Easing.out(Easing.cubic))}
              style={styles.panel}
            >
              {children}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export const authFonts = fonts;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.navy,
  },
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  orb: {
    position: 'absolute',
  },
  orbTopRight: {
    top: -40,
    right: -60,
  },
  orbBottomLeft: {
    bottom: 80,
    left: -70,
  },
  orbMid: {
    top: '42%',
    right: -40,
  },
  backBtn: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.md,
  },
  backSpacer: {
    height: spacing.md,
  },
  brandBlock: {
    marginBottom: spacing.xxl,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  brandBlockCompact: {
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  brandMark: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: brand.white,
  },
  headline: {
    fontFamily: fonts.title,
    fontSize: 22,
    lineHeight: 28,
    color: brand.offWhite,
    marginTop: spacing.xs,
  },
  supporting: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(245,247,250,0.72)',
    maxWidth: 320,
  },
  panel: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: 'rgba(27, 38, 59, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: spacing.lg,
  },
});
