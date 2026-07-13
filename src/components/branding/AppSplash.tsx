import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, spacing } from '@/theme/tokens';
import { SriLankaFlag } from '@/components/branding/SriLankaFlag';

type AppSplashProps = {
  /** Fired once the splash is painted / animation started (replaces image onLoad). */
  onImageReady?: () => void;
};

/**
 * Minimal branded splash with a soft loading motion.
 * Replaces the previous full-bleed marketing image splash.
 */
export function AppSplash({ onImageReady }: AppSplashProps) {
  const insets = useSafeAreaInsets();
  const readySent = useRef(false);
  const pulse = useSharedValue(0);
  const progress = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!readySent.current) {
      readySent.current = true;
      requestAnimationFrame(() => onImageReady?.());
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    glow.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );

    progress.value = withDelay(
      200,
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
        -1,
        false,
      ),
    );
  }, [glow, onImageReady, progress, pulse]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.85]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.12]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.18, 0.4]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.15]) }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [18, 100])}%`,
    opacity: interpolate(progress.value, [0, 0.15, 1], [0.5, 1, 0.85]),
  }));

  return (
    <View
      accessibilityLabel="DriveMate LK splash screen"
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <LinearGradient
        colors={['#07111C', brand.navy, '#0A1A2C']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />

      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.markWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.mark, markStyle]}>
            <Ionicons name="speedometer-outline" size={28} color={brand.green} />
            <Ionicons
              name="car-sport"
              size={26}
              color={brand.green}
              style={styles.carIcon}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(520)} style={styles.brandBlock}>
          <Text style={styles.brandDrive}>DriveMate</Text>
          <Text style={styles.brandLk}>LK</Text>
          <View style={styles.rule} />
          <Text style={styles.tagline}>Your intelligent vehicle companion</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(280).duration(400)} style={styles.loader}>
          <View style={styles.track}>
            <Animated.View style={[styles.bar, barStyle]} />
          </View>
          <Text style={styles.loadingLabel}>Loading</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(400).duration(450)} style={styles.footer}>
        <SriLankaFlag height={16} width={26} />
        <Text style={styles.footerText}>
          Built for <Text style={styles.footerAccent}>Sri Lankan</Text> vehicle owners
        </Text>
      </Animated.View>
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
    alignSelf: 'center',
    top: '28%',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(46, 201, 70, 0.22)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  markWrap: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  ring: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(46, 201, 70, 0.45)',
  },
  mark: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(46, 201, 70, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 201, 70, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carIcon: {
    marginTop: -4,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 2,
  },
  brandDrive: {
    color: brand.white,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: -0.6,
  },
  brandLk: {
    color: brand.green,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  rule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: brand.green,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tagline: {
    color: 'rgba(245,247,250,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.xxxl,
    width: 160,
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: brand.green,
  },
  loadingLabel: {
    color: 'rgba(245,247,250,0.45)',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    color: 'rgba(245,247,250,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
  footerAccent: {
    color: brand.green,
    fontWeight: '700',
  },
});
