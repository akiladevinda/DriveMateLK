import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export type FuelEconomyEntry = {
  id: string;
  entryDate: string;
  odometer: number;
  litres: number;
  totalAmountMinor: number;
  isFullTank: boolean;
};

export type TankToTankEconomy = {
  fromEntryId: string;
  toEntryId: string;
  distanceKm: number;
  litresUsed: number;
  kmPerLitre: number;
  costPerKmMinor: number;
  fromDate: string;
  toDate: string;
};

export type FuelCalculationResult = {
  tankToTankEconomies: TankToTankEconomy[];
  averageKmPerLitre: number | null;
  bestKmPerLitre: TankToTankEconomy | null;
  worstKmPerLitre: TankToTankEconomy | null;
  averageCostPerKmMinor: number | null;
  monthlyTotals: Array<{
    monthKey: string;
    label: string;
    totalAmountMinor: number;
    totalLitres: number;
    entryCount: number;
  }>;
  canCalculateTankToTank: boolean;
  notes: string[];
};

function sortByDateAsc(entries: FuelEconomyEntry[]): FuelEconomyEntry[] {
  return [...entries].sort((a, b) => {
    const dateCompare = a.entryDate.localeCompare(b.entryDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return a.odometer - b.odometer;
  });
}

export function calculateTankToTankEconomy(entries: FuelEconomyEntry[]): TankToTankEconomy[] {
  const sorted = sortByDateAsc(entries);
  const economies: TankToTankEconomy[] = [];

  let previousFullTank: FuelEconomyEntry | null = null;

  for (const entry of sorted) {
    if (!entry.isFullTank) {
      continue;
    }

    if (previousFullTank) {
      const distanceKm = entry.odometer - previousFullTank.odometer;
      if (distanceKm > 0 && entry.litres > 0) {
        const kmPerLitre = distanceKm / entry.litres;
        const costPerKmMinor = Math.round(entry.totalAmountMinor / distanceKm);

        economies.push({
          fromEntryId: previousFullTank.id,
          toEntryId: entry.id,
          distanceKm,
          litresUsed: entry.litres,
          kmPerLitre,
          costPerKmMinor,
          fromDate: previousFullTank.entryDate,
          toDate: entry.entryDate,
        });
      }
    }

    previousFullTank = entry;
  }

  return economies;
}

export function calculateAverageCostPerKmMinor(economies: TankToTankEconomy[]): number | null {
  if (economies.length === 0) {
    return null;
  }
  const total = economies.reduce((sum, item) => sum + item.costPerKmMinor, 0);
  return Math.round(total / economies.length);
}

export function calculateMonthlyFuelTotals(entries: FuelEconomyEntry[]): FuelCalculationResult['monthlyTotals'] {
  const buckets = new Map<
    string,
    { totalAmountMinor: number; totalLitres: number; entryCount: number; monthDate: Date }
  >();

  for (const entry of entries) {
    const monthDate = startOfMonth(parseISO(entry.entryDate));
    const monthKey = format(monthDate, 'yyyy-MM');
    const existing = buckets.get(monthKey) ?? {
      totalAmountMinor: 0,
      totalLitres: 0,
      entryCount: 0,
      monthDate,
    };

    existing.totalAmountMinor += entry.totalAmountMinor;
    existing.totalLitres += entry.litres;
    existing.entryCount += 1;
    buckets.set(monthKey, existing);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, value]) => ({
      monthKey,
      label: format(value.monthDate, 'MMM yyyy'),
      totalAmountMinor: value.totalAmountMinor,
      totalLitres: Number(value.totalLitres.toFixed(2)),
      entryCount: value.entryCount,
    }));
}

export function calculateMonthlyFuelTotalForMonth(
  entries: FuelEconomyEntry[],
  monthDate: Date,
): { totalAmountMinor: number; totalLitres: number; entryCount: number } {
  const interval = { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
  const monthEntries = entries.filter((entry) =>
    isWithinInterval(parseISO(entry.entryDate), interval),
  );

  return {
    totalAmountMinor: monthEntries.reduce((sum, entry) => sum + entry.totalAmountMinor, 0),
    totalLitres: Number(
      monthEntries.reduce((sum, entry) => sum + entry.litres, 0).toFixed(2),
    ),
    entryCount: monthEntries.length,
  };
}

export function calculateFuelMetrics(entries: FuelEconomyEntry[]): FuelCalculationResult {
  const fullTankCount = entries.filter((entry) => entry.isFullTank).length;
  const tankToTankEconomies = calculateTankToTankEconomy(entries);
  const canCalculateTankToTank = fullTankCount >= 2 && tankToTankEconomies.length > 0;

  const notes: string[] = [];
  if (fullTankCount < 2) {
    notes.push('Tank-to-tank economy requires at least two full-tank entries.');
  } else if (tankToTankEconomies.length === 0) {
    notes.push('No valid full-tank pairs found. Check odometer readings increase between fills.');
  }

  let averageKmPerLitre: number | null = null;
  let bestKmPerLitre: TankToTankEconomy | null = null;
  let worstKmPerLitre: TankToTankEconomy | null = null;

  if (canCalculateTankToTank) {
    const totalDistance = tankToTankEconomies.reduce((sum, item) => sum + item.distanceKm, 0);
    const totalLitres = tankToTankEconomies.reduce((sum, item) => sum + item.litresUsed, 0);
    averageKmPerLitre = totalLitres > 0 ? Number((totalDistance / totalLitres).toFixed(2)) : null;

    bestKmPerLitre = tankToTankEconomies.reduce((best, current) =>
      current.kmPerLitre > best.kmPerLitre ? current : best,
    );
    worstKmPerLitre = tankToTankEconomies.reduce((worst, current) =>
      current.kmPerLitre < worst.kmPerLitre ? current : worst,
    );
  }

  return {
    tankToTankEconomies,
    averageKmPerLitre,
    bestKmPerLitre,
    worstKmPerLitre,
    averageCostPerKmMinor: calculateAverageCostPerKmMinor(tankToTankEconomies),
    monthlyTotals: calculateMonthlyFuelTotals(entries),
    canCalculateTankToTank,
    notes,
  };
}
