import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { brand, radii, spacing, typography } from '@/theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ExpandableSectionProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

function badgeColors(badge?: string): { bg: string; fg: string } {
  const key = (badge ?? '').toLowerCase();
  if (key.includes('critical') || key.includes('urgent')) {
    return { bg: 'rgba(229,57,53,0.16)', fg: '#FF6B6B' };
  }
  if (key.includes('attention') || key.includes('warning')) {
    return { bg: 'rgba(249,168,38,0.16)', fg: brand.orange };
  }
  if (key.includes('info')) {
    return { bg: 'rgba(47,128,237,0.16)', fg: '#5BA3FF' };
  }
  return { bg: 'rgba(46,201,70,0.14)', fg: brand.green };
}

export function ExpandableSection({
  title,
  subtitle,
  badge,
  defaultExpanded = false,
  children,
}: ExpandableSectionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tone = badgeColors(badge);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: expanded ? `${brand.green}55` : colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                <Text style={[styles.badgeText, { color: tone.fg }]}>{badge}</Text>
              </View>
            ) : null}
          </View>
          {subtitle && !expanded ? (
            <Text numberOfLines={2} style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.chevronWrap, { backgroundColor: colors.background }]}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
    flexShrink: 1,
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: {
    ...typography.micro,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  subtitle: {
    ...typography.caption,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,140,160,0.25)',
    paddingTop: spacing.md,
  },
});
