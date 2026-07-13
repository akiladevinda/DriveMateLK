import type { ValuationEstimate, ValuationInput, VehicleValuationProvider } from '@/services/valuation/types';
import { VALUATION_DISCLAIMER } from '@/services/valuation/types';

const BASE_VALUES_LKR: Record<string, number> = {
  car: 4_500_000,
  suv: 6_500_000,
  van: 5_000_000,
  motorcycle: 350_000,
  scooter: 180_000,
  three_wheeler: 900_000,
  truck: 8_000_000,
  ev: 7_500_000,
  hybrid: 5_500_000,
  other: 3_000_000,
};

function conditionMultiplier(condition: ValuationInput['condition']): number {
  switch (condition) {
    case 'excellent':
      return 1.08;
    case 'good':
      return 1;
    case 'fair':
      return 0.88;
    case 'poor':
      return 0.72;
    default:
      return 1;
  }
}

export class RuleBasedValuationProvider implements VehicleValuationProvider {
  async estimate(input: ValuationInput): Promise<ValuationEstimate> {
    const { vehicle } = input;
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - vehicle.manufacture_year);
    const baseMinor = (BASE_VALUES_LKR[vehicle.vehicle_type] ?? 3_000_000) * 100;

    const ageDepreciation = Math.pow(0.92, age);
    const mileagePenalty = Math.max(0.55, 1 - vehicle.current_odometer / 350_000);
    const purchaseAnchor =
      vehicle.purchase_price_minor != null
        ? (vehicle.purchase_price_minor * Math.pow(0.9, age)) / baseMinor
        : 1;

    const docBonus = (input.documentValidRatio ?? 0.8) >= 0.9 ? 1.03 : 1;
    const serviceBonus = (input.serviceRecordCount ?? 0) >= 3 ? 1.04 : 1;

    let midMinor = Math.round(
      baseMinor * ageDepreciation * mileagePenalty * purchaseAnchor * docBonus * serviceBonus * conditionMultiplier(input.condition),
    );
    midMinor = Math.max(midMinor, Math.round(baseMinor * 0.15));

    const spread = 0.12;
    const privateMin = Math.round(midMinor * (1 - spread));
    const privateMax = Math.round(midMinor * (1 + spread));
    const dealerMin = Math.round(privateMin * 0.88);
    const dealerMax = Math.round(privateMax * 0.9);

    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];

    if ((input.serviceRecordCount ?? 0) >= 2) positiveFactors.push('Service history recorded in app');
    if (vehicle.purchase_price_minor) positiveFactors.push('Purchase price on file for depreciation baseline');
    if (age <= 3) positiveFactors.push('Relatively low vehicle age');
    if (vehicle.current_odometer < 80_000) positiveFactors.push('Moderate mileage for Sri Lankan market');

    if (age > 10) negativeFactors.push('Higher age reduces resale demand');
    if (vehicle.current_odometer > 150_000) negativeFactors.push('High odometer reading');
    if ((input.documentValidRatio ?? 1) < 0.8) negativeFactors.push('Some documents may need renewal');

    const confidence =
      vehicle.purchase_price_minor && (input.serviceRecordCount ?? 0) >= 2 ? 'medium' : 'low';

    return {
      privateSaleMinMinor: privateMin,
      privateSaleMaxMinor: privateMax,
      dealerMinMinor: dealerMin,
      dealerMaxMinor: dealerMax,
      currency: vehicle.purchase_currency || 'LKR',
      confidence,
      positiveFactors,
      negativeFactors,
      preparationRecommendations: [
        'Gather revenue licence and insurance copies for buyers',
        'Complete pending maintenance before listing',
        'Take clear photos of exterior, interior and odometer',
      ],
      limitations: [
        'Rule-based estimate using age, mileage and app data only',
        'No live market listing comparison in this mode',
      ],
      disclaimer: VALUATION_DISCLAIMER,
    };
  }
}
