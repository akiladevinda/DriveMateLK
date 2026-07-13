import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, radii, spacing, typography } from '@/theme/tokens';

const { width, height } = Dimensions.get('window');

type Slide = {
  key: string;
  title: string;
  body: string;
  image: number;
};

const SLIDES: Slide[] = [
  {
    key: 'one',
    title: 'All Your Vehicle Needs in One App',
    body: 'Track, manage and protect your vehicle with DriveMate LK',
    image: require('../../assets/onboarding-1.png'),
  },
  {
    key: 'two',
    title: 'Everything You Need, Always at Your Fingertips',
    body: 'From AI diagnostics to service reminders, expense tracking and trusted garages – DriveMate LK keeps you covered.',
    image: require('../../assets/onboarding-2.png'),
  },
  {
    key: 'three',
    title: 'Drive Smarter, Live Worry-Free',
    body: "Monitor your vehicle's health, stay ahead of issues and enjoy every journey with confidence.",
    image: require('../../assets/onboarding-3.png'),
  },
];

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const finishIntro = () => {
    router.push('/(onboarding)/permissions');
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      setIndex(next);
    }
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    finishIntro();
  };

  const goBack = () => {
    if (index > 0) {
      listRef.current?.scrollToIndex({ index: index - 1, animated: true });
    }
  };

  const isLast = index === SLIDES.length - 1;

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
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoDrive}>DriveMate</Text>
          <Text style={styles.logoLk}> LK</Text>
        </View>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={finishIntro}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={onScroll}
        pagingEnabled
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.imageWrap}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        showsHorizontalScrollIndicator={false}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.key}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? brand.green : '#3A4A5C',
                width: i === index ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {index === 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get Started' : 'Next'}
            onPress={goNext}
            style={({ pressed }) => [styles.nextFull, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.nextLabel}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons name="arrow-forward" size={20} color={brand.white} />
          </Pressable>
        ) : (
          <View style={styles.footerRow}>
            <Pressable accessibilityRole="button" onPress={goBack} style={styles.backBtn}>
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Get Started' : 'Next'}
              onPress={goNext}
              style={({ pressed }) => [styles.nextHalf, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.nextLabel}>{isLast ? 'Get Started' : 'Next'}</Text>
              <Ionicons name="arrow-forward" size={20} color={brand.white} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.navy,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoDrive: {
    color: brand.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  logoLk: {
    color: brand.green,
    fontSize: 22,
    fontWeight: '800',
  },
  skip: {
    color: brand.offWhite,
    ...typography.bodyStrong,
    opacity: 0.85,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  imageWrap: {
    width: width - spacing.md * 2,
    height: Math.min(height * 0.54, 480),
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.06 }],
  },
  title: {
    color: brand.white,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  body: {
    color: '#C5D0DC',
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: {
    color: brand.offWhite,
    ...typography.bodyStrong,
  },
  nextFull: {
    minHeight: 54,
    borderRadius: radii.full,
    backgroundColor: brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextHalf: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.full,
    backgroundColor: brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextLabel: {
    color: brand.white,
    ...typography.bodyStrong,
    fontWeight: '700',
  },
});
