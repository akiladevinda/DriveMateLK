const MASK_CHAR = '•';

/** Masks a sensitive identifier, revealing only the trailing characters. */
export function maskIdentifier(
  value: string | null | undefined,
  visibleTail = 4,
): string {
  if (!value?.trim()) {
    return '—';
  }

  const trimmed = value.trim();
  if (trimmed.length <= visibleTail) {
    return MASK_CHAR.repeat(trimmed.length);
  }

  const hiddenLength = trimmed.length - visibleTail;
  return `${MASK_CHAR.repeat(hiddenLength)}${trimmed.slice(-visibleTail)}`;
}

/**
 * Masks a Sri Lankan vehicle registration number for list previews.
 * Keeps a partial prefix and the numeric suffix for recognition.
 */
export function maskRegistration(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!cleaned) {
    return '—';
  }

  const parts = cleaned.split(/[\s-]+/);
  if (parts.length >= 2) {
    const prefix = parts[0] ?? '';
    const suffix = parts[parts.length - 1] ?? '';
    const visiblePrefix = prefix.slice(0, Math.min(3, prefix.length));
    const visibleSuffix = suffix.slice(-Math.min(4, suffix.length));
    return `${visiblePrefix}${MASK_CHAR.repeat(3)} ${visibleSuffix}`;
  }

  return maskIdentifier(cleaned, 4);
}
