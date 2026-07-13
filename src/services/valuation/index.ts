import { RuleBasedValuationProvider } from '@/services/valuation/rule-based-provider';
import type { ValuationEstimate, ValuationInput, VehicleValuationProvider } from '@/services/valuation/types';
import { VALUATION_DISCLAIMER } from '@/services/valuation/types';

export class MockMarketValuationProvider implements VehicleValuationProvider {
  private readonly base: RuleBasedValuationProvider;

  constructor(base = new RuleBasedValuationProvider()) {
    this.base = base;
  }

  async estimate(input: ValuationInput): Promise<ValuationEstimate> {
    const baseEstimate = await this.base.estimate(input);
    const marketShift = 0.97 + (input.vehicle.id.charCodeAt(0) % 7) * 0.01;

    return {
      ...baseEstimate,
      privateSaleMinMinor: Math.round(baseEstimate.privateSaleMinMinor * marketShift),
      privateSaleMaxMinor: Math.round(baseEstimate.privateSaleMaxMinor * marketShift),
      dealerMinMinor: Math.round(baseEstimate.dealerMinMinor * marketShift),
      dealerMaxMinor: Math.round(baseEstimate.dealerMaxMinor * marketShift),
      confidence: 'medium',
      positiveFactors: [...baseEstimate.positiveFactors, 'Mock market comparables applied (demo)'],
      limitations: [
        ...baseEstimate.limitations,
        'Market comparables are simulated for demo purposes',
      ],
      disclaimer: VALUATION_DISCLAIMER,
    };
  }
}

export { RuleBasedValuationProvider } from '@/services/valuation/rule-based-provider';
export type { ValuationEstimate, ValuationInput, VehicleValuationProvider } from '@/services/valuation/types';
export { VALUATION_DISCLAIMER } from '@/services/valuation/types';

let provider: VehicleValuationProvider | null = null;

export function getValuationProvider(): VehicleValuationProvider {
  if (!provider) {
    provider = new MockMarketValuationProvider();
  }
  return provider;
}
