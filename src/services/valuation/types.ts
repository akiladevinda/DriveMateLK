import type { Vehicle } from '@/types/database';

export const VALUATION_DISCLAIMER =
  'This estimate is indicative only and is not a formal valuation certificate. Obtain independent appraisal before selling or settling finance.';

export type ValuationConfidence = 'low' | 'medium' | 'high';

export type ValuationEstimate = {
  privateSaleMinMinor: number;
  privateSaleMaxMinor: number;
  dealerMinMinor: number;
  dealerMaxMinor: number;
  currency: string;
  confidence: ValuationConfidence;
  positiveFactors: string[];
  negativeFactors: string[];
  preparationRecommendations: string[];
  limitations: string[];
  disclaimer: string;
};

export type ValuationInput = {
  vehicle: Vehicle;
  serviceRecordCount?: number;
  documentValidRatio?: number;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
};

export interface VehicleValuationProvider {
  estimate(input: ValuationInput): Promise<ValuationEstimate>;
}
