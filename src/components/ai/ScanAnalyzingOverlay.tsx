import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { brand, radii, spacing } from '@/theme/tokens';

type ScanAnalyzingOverlayProps = {
  visible: boolean;
  stageLabel?: string;
};

export function ScanAnalyzingOverlay({
  visible,
  stageLabel = 'Reading warning lamps…',
}: ScanAnalyzingOverlayProps) {
  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      sweep.value = 0;
      pulse.value = 0;
      spin.value = 0;
      return;
    }

    sweep.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    spin.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [visible, sweep, pulse, spin]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [-72, 72]) }],
    opacity: interpolate(sweep.value, [0, 0.5, 1], [0.25, 0.95, 0.25]),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [0.92, 1.06]) },
      { rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg` },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.55, 1]),
  }));

  return (
    <Modal animationType="fade" transparent visible={visible} statusBarTranslucent>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(7,17,28,0.92)', 'rgba(13,27,42,0.96)']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View entering={FadeIn.duration(280)} style={styles.card}>
          <View style={styles.viewport}>
            <Animated.View style={[styles.ring, ringStyle]} />
            <View style={styles.frame}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              <Animated.View style={[styles.sweep, sweepStyle]} />
            </View>
          </View>

          <Text style={styles.title}>Scanning fault</Text>
          <Text style={styles.stage}>{stageLabel}</Text>
          <View style={styles.dotsRow}>
            <PulseDot delay={0} />
            <PulseDot delay={180} />
            <PulseDot delay={360} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      v.value = withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, v]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1], [0.25, 1]),
    transform: [{ scale: interpolate(v.value, [0, 1], [0.75, 1.15]) }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radii.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(27, 38, 59, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: spacing.md,
  },
  viewport: {
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  ring: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: 'rgba(46, 201, 70, 0.35)',
    borderTopColor: brand.green,
    borderRightColor: 'rgba(46, 201, 70, 0.15)',
  },
  frame: {
    width: 118,
    height: 118,
    borderRadius: radii.md,
    backgroundColor: 'rgba(7,17,28,0.65)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweep: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: brand.green,
    shadowColor: brand.green,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: brand.green,
  },
  tl: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: brand.white,
    letterSpacing: -0.3,
  },
  stage: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(245,247,250,0.7)',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.green,
  },
});
