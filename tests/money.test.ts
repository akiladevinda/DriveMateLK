import { describe, expect, it } from 'vitest';

import {
  formatMoney,
  fromMinorUnits,
  parseMoneyInput,
  sumMinor,
  toMinorUnits,
} from '@/utils/money';

describe('toMinorUnits / fromMinorUnits', () => {
  it('round-trips major currency amounts', () => {
    expect(toMinorUnits(1234.56)).toBe(123456);
    expect(fromMinorUnits(123456)).toBe(1234.56);
  });

  it('returns 0 for non-finite input', () => {
    expect(toMinorUnits(Number.NaN)).toBe(0);
  });
});

describe('parseMoneyInput', () => {
  it('parses plain and comma-separated amounts', () => {
    expect(parseMoneyInput('1500')).toBe(150000);
    expect(parseMoneyInput('1,234.50')).toBe(123450);
  });

  it('returns null for invalid input', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('-10')).toBeNull();
  });
});

describe('sumMinor', () => {
  it('sums integer minor units without float drift', () => {
    expect(sumMinor(100, 250, 50)).toBe(400);
  });
});

describe('formatMoney', () => {
  it('formats LKR minor units for display', () => {
    const formatted = formatMoney(123456, 'LKR', 'en-LK');
    expect(formatted).toContain('1,234.56');
  });
});
