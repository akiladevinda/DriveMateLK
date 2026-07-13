import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  DOCUMENT_TYPE_LABELS,
  type DocumentExpiryStatus,
  type DocumentTypeValue,
} from '@/constants/documents';
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { useTheme } from '@/theme';
import { radii, shadows, spacing, typography } from '@/theme/tokens';
import { formatDisplayDate } from '@/utils/dates';

type DocumentCardProps = {
  title: string;
  documentType: DocumentTypeValue;
  provider?: string | null;
  expiryDateIso?: string | null;
  expiryStatus?: DocumentExpiryStatus;
  onPress?: () => void;
};

const EXPIRY_STATUS_LABELS: Record<DocumentExpiryStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  no_expiry: 'No Expiry',
  pending_confirmation: 'Pending',
};

const EXPIRY_STATUS_VARIANTS: Record<DocumentExpiryStatus, StatusBadgeVariant> = {
  valid: 'success',
  expiring_soon: 'warning',
  expired: 'danger',
  no_expiry: 'neutral',
  pending_confirmation: 'info',
};

export function DocumentCard({
  title,
  documentType,
  provider,
  expiryDateIso,
  expiryStatus = 'no_expiry',
  onPress,
}: DocumentCardProps) {
  const { colors } = useTheme();
  const typeLabel = DOCUMENT_TYPE_LABELS[documentType];

  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.informationMuted }]}>
          <Ionicons name="document-text-outline" size={20} color={colors.information} />
        </View>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.type, { color: colors.textSecondary }]}>{typeLabel}</Text>
        </View>
        <StatusBadge
          label={EXPIRY_STATUS_LABELS[expiryStatus]}
          variant={EXPIRY_STATUS_VARIANTS[expiryStatus]}
        />
      </View>

      <View style={styles.metaRow}>
        {provider ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{provider}</Text>
        ) : null}
        {expiryDateIso ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Expires {formatDisplayDate(expiryDateIso)}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${typeLabel}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          shadows.sm,
          pressed && { opacity: 0.92 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        shadows.sm,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
  },
  type: {
    ...typography.caption,
  },
  metaRow: {
    gap: spacing.xxs,
    paddingLeft: 36 + spacing.sm,
  },
  meta: {
    ...typography.caption,
  },
});
