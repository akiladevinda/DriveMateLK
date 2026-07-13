import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VEHICLE_TYPE_LABELS } from '@/constants/vehicles';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';
import * as profileService from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';
import { brand, radii, spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { getVehicleTypeFallbackImage } from '@/utils/vehicle-image';
import type { VehicleType } from '@/types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VEHICLE_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 380);

type EntryMotion = {
  fromX: number;
  duration: number;
  aspect: number;
  settle: number;
  label: string;
};

function getEntryMotion(type: string): EntryMotion {
  switch (type) {
    case 'van':
      return {
        fromX: SCREEN_WIDTH * 1.2,
        duration: 1600,
        aspect: 0.5,
        settle: -4,
        label: 'Your van',
      };
    case 'three_wheeler':
      return {
        fromX: -SCREEN_WIDTH * 1.2,
        duration: 1350,
        aspect: 0.62,
        settle: -8,
        label: 'Your 3 Wheel',
      };
    case 'motorcycle':
    case 'scooter':
      return {
        fromX: SCREEN_WIDTH * 1.25,
        duration: 1100,
        aspect: 0.58,
        settle: -10,
        label: 'Your motor bike',
      };
    default:
      return {
        fromX: SCREEN_WIDTH * 1.15,
        duration: 1400,
        aspect: 0.42,
        settle: -6,
        label: 'Your car',
      };
  }
}

function normalizeType(value: unknown): VehicleType {
  const raw = Array.isArray(value) ? value[0] : value;
  const type = String(raw ?? 'car');
  if (
    type === 'van' ||
    type === 'three_wheeler' ||
    type === 'motorcycle' ||
    type === 'scooter' ||
    type === 'car' ||
    type === 'suv'
  ) {
    return type as VehicleType;
  }
  return 'car';
}

export default function OnboardingCompleteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ vehicleType?: string }>();
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const { activeVehicle } = useActiveVehicle();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicleType = useMemo(() => {
    if (params.vehicleType) return normalizeType(params.vehicleType);
    if (activeVehicle?.vehicle_type) return normalizeType(activeVehicle.vehicle_type);
    return 'car' as VehicleType;
  }, [params.vehicleType, activeVehicle?.vehicle_type]);

  const motion = useMemo(() => getEntryMotion(vehicleType), [vehicleType]);
  const vehicleImage = useMemo(() => getVehicleTypeFallbackImage(vehicleType), [vehicleType]);
  const typeLabel =
    VEHICLE_TYPE_LABELS[vehicleType as keyof typeof VEHICLE_TYPE_LABELS] ?? 'Vehicle';

  const vehicleX = useRef(new Animated.Value(motion.fromX)).current;
  const vehicleY = useRef(new Animated.Value(18)).current;
  const vehicleOpacity = useRef(new Animated.Value(0)).current;
  const vehicleScale = useRef(new Animated.Value(0.92)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;
  const shadowScale = useRef(new Animated.Value(0.55)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(18)).current;
  const badgeScale = useRef(new Animated.Value(0.5)).current;
  const glowPulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    vehicleX.setValue(motion.fromX);
    vehicleY.setValue(18);
    vehicleOpacity.setValue(0);
    vehicleScale.setValue(0.92);
    shadowOpacity.setValue(0);
    shadowScale.setValue(0.55);
    contentOpacity.setValue(0);
    contentY.setValue(18);
    badgeScale.setValue(0.5);

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(vehicleOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(vehicleX, {
          toValue: 0,
          duration: motion.duration,
          easing: Easing.bezier(0.22, 0.85, 0.28, 1),
          useNativeDriver: true,
        }),
        Animated.timing(vehicleScale, {
          toValue: 1,
          duration: motion.duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(vehicleY, {
            toValue: motion.settle,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(vehicleY, {
            toValue: 0,
            duration: 280,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shadowOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(shadowScale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.55,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      animation.stop();
      pulse.stop();
    };
  }, [
    badgeScale,
    contentOpacity,
    contentY,
    glowPulse,
    motion.duration,
    motion.fromX,
    motion.settle,
    shadowOpacity,
    shadowScale,
    vehicleOpacity,
    vehicleScale,
    vehicleType,
    vehicleX,
    vehicleY,
  ]);

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await profileService.completeOnboarding(user.id);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      await refreshProfile();
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
      <Animated.View style={[styles.glow, { opacity: glowPulse }]} />

      <View style={[styles.stage, { height: Math.min(SCREEN_WIDTH * (0.42 + motion.aspect * 0.2), 260) }]}>
        <Animated.View
          style={[
            styles.shadow,
            {
              width: VEHICLE_WIDTH * (vehicleType === 'motorcycle' ? 0.45 : 0.72),
              opacity: shadowOpacity,
              transform: [{ scaleX: shadowScale }, { scaleY: shadowScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.vehicleWrap,
            {
              height: VEHICLE_WIDTH * motion.aspect,
              opacity: vehicleOpacity,
              transform: [
                { translateX: vehicleX },
                { translateY: vehicleY },
                { scale: vehicleScale },
              ],
            },
          ]}
        >
          <Image
            source={vehicleImage}
            style={styles.vehicleImage}
            resizeMode="contain"
            accessibilityLabel={motion.label}
          />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentY }],
          },
        ]}
      >
        <Animated.View style={[styles.badgeWrap, { transform: [{ scale: badgeScale }] }]}>
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={34} color={brand.white} />
          </View>
        </Animated.View>
        <Text style={styles.title}>{t('onboarding.completeTitle')}</Text>
        <Text style={styles.body}>{t('onboarding.completeBody')}</Text>
        <Text style={styles.typeHint}>{typeLabel} ready to go</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Animated.View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={finish}
          style={({ pressed }) => [styles.cta, { opacity: pressed || loading ? 0.85 : 1 }]}
        >
          <Text style={styles.ctaLabel}>{loading ? t('common.loading') : t('common.done')}</Text>
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(46, 201, 70, 0.16)',
  },
  stage: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  shadow: {
    position: 'absolute',
    bottom: 10,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  vehicleWrap: {
    width: VEHICLE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.md,
  },
  badgeWrap: {
    marginBottom: spacing.lg,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  typeHint: {
    color: brand.green,
    ...typography.bodyStrong,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  error: {
    color: '#FF6B6B',
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  cta: {
    minHeight: 54,
    borderRadius: radii.full,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    color: brand.white,
    ...typography.bodyStrong,
    fontWeight: '700',
  },
});
