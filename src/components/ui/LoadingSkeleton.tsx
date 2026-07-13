import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { radii, spacing } from '@/theme/tokens';

type SkeletonBoxProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = radii.xs,
  style,
}: SkeletonBoxProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

type LoadingSkeletonProps = {
  lines?: number;
  style?: StyleProp<ViewStyle>;
};

export function LoadingSkeleton({ lines = 3, style }: LoadingSkeletonProps) {
  return (
    <View accessibilityRole="progressbar" style={[styles.container, style]}>
      <SkeletonBox height={24} width="60%" />
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBox
          key={`skeleton-line-${index}`}
          height={14}
          width={index === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </View>
  );
}

export { SkeletonBox };

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
});
