import { describe, expect, it } from 'vitest';

import {
  calculateAverageCostPerKmMinor,
  calculateFuelMetrics,
  calculateMonthlyFuelTotalForMonth,
  calculateTankToTankEconomy,
  type FuelEconomyEntry,
} from '@/services/fuel-calculations';

const entries: FuelEconomyEntry[] = [
  {
    id: 'a',
    entryDate: '2026-01-01',
    odometer: 10_000,
    litres: 40,
    totalAmountMinor: 20_000_00,
    isFullTank: true,
  },
  {
    id: 'b',
    entryDate: '2026-01-15',
    odometer: 10_500,
    litres: 38,
    totalAmountMinor: 19_000_00,
    isFullTank: true,
  },
  {
    id: 'c',
    entryDate: '2026-01-20',
    odometer: 10_700,
    litres: 10,
    totalAmountMinor: 5_000_00,
    isFullTank: false,
  },
];

describe('calculateTankToTankEconomy', () => {
  it('computes economy between consecutive full tanks', () => {
    const economies = calculateTankToTankEconomy(entries);
    expect(economies).toHaveLength(1);
    expect(economies[0]?.distanceKm).toBe(500);
    expect(economies[0]?.litresUsed).toBe(38);
    expect(economies[0]?.kmPerLitre).toBeCloseTo(500 / 38, 2);
  });
});

describe('calculateAverageCostPerKmMinor', () => {
  it('averages cost per km across tank pairs', () => {
    const economies = calculateTankToTankEconomy(entries);
    const avg = calculateAverageCostPerKmMinor(economies);
    expect(avg).toBe(Math.round(19_000_00 / 500));
  });
});

describe('calculateMonthlyFuelTotalForMonth', () => {
  it('sums entries within the target month', () => {
    const jan = calculateMonthlyFuelTotalForMonth(entries, new Date('2026-01-10'));
    expect(jan.entryCount).toBe(3);
    expect(jan.totalLitres).toBe(88);
    expect(jan.totalAmountMinor).toBe(44_000_00);
  });
});

describe('calculateFuelMetrics', () => {
  it('returns aggregate fuel metrics with notes when insufficient data', () => {
    const metrics = calculateFuelMetrics(entries);
    expect(metrics.canCalculateTankToTank).toBe(true);
    expect(metrics.averageKmPerLitre).not.toBeNull();
    expect(metrics.monthlyTotals.length).toBeGreaterThan(0);
  });

  it('notes when fewer than two full tanks exist', () => {
    const partial = entries.filter((e) => e.id !== 'b');
    const metrics = calculateFuelMetrics(partial);
    expect(metrics.canCalculateTankToTank).toBe(false);
    expect(metrics.notes[0]).toMatch(/at least two full-tank/i);
  });
});
