import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { isAuthContext, verifyAuth } from '../_shared/auth.ts';
import {
  geminiTextJson,
  logAiUsage,
  withSafetyNotice,
} from '../_shared/gemini.ts';
import {
  DEFAULT_AI_RATE_LIMIT,
  enforceRateLimit,
  rateLimitResponse,
} from '../_shared/rate-limit.ts';

const FUNCTION_NAME = 'generate-resale-advice';

type ResaleAdviceInput = {
  vehicleId: string;
  make: string;
  model: string;
  variant?: string;
  manufactureYear: number;
  registrationYear?: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  vehicleType: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  serviceHistoryCompleteness: 'complete' | 'partial' | 'minimal' | 'unknown';
  accidentDisclosed: boolean;
  previousOwnersCount?: number;
  modifications?: string[];
  tireCondition?: 'good' | 'fair' | 'replace_soon';
  documentStatusSummary?: string;
  comparableListings?: Array<{ priceMinor: number; mileage: number; year: number; source?: string }>;
  locale?: 'en' | 'si' | 'ta';
};

type ResaleAdvice = {
  privateSaleRangeMinor: { min: number; max: number };
  dealerRangeMinor: { min: number; max: number };
  currency: string;
  confidence: string;
  factorsIncreasingValue: string[];
  factorsReducingValue: string[];
  preparationRecommendations: string[];
  dataLimitations: string[];
  safetyNotice: string;
  modelId?: string;
};

function estimateBasePrice(year: number): number {
  const age = new Date().getFullYear() - year;
  return Math.max(2_500_000_00, 8_000_000_00 - age * 400_000_00);
}

function mockResaleAdvice(input: ResaleAdviceInput): ResaleAdvice {
  const base = estimateBasePrice(input.manufactureYear);
  const conditionFactor = { excellent: 1.1, good: 1.0, fair: 0.85, poor: 0.7 }[input.condition];

  const privateMin = Math.round(base * conditionFactor * 0.95);
  const privateMax = Math.round(base * conditionFactor * 1.08);
  const dealerMin = Math.round(privateMin * 0.88);
  const dealerMax = Math.round(privateMax * 0.92);

  return withSafetyNotice({
    privateSaleRangeMinor: { min: privateMin, max: privateMax },
    dealerRangeMinor: { min: dealerMin, max: dealerMax },
    currency: 'LKR',
    confidence: input.comparableListings?.length ? 'medium' : 'low',
    factorsIncreasingValue: input.serviceHistoryCompleteness === 'complete'
      ? ['Documented service history']
      : [],
    factorsReducingValue: [
      ...(input.accidentDisclosed ? ['Accident disclosed'] : []),
      ...(input.mileage > 150_000 ? ['Higher mileage for age'] : []),
    ],
    preparationRecommendations: [
      'Gather revenue licence and insurance records',
      'Address cosmetic items before listing photos',
      'Obtain independent valuation for finance settlements',
    ],
    dataLimitations: [
      'Sri Lankan re-import and duty structure can shift market prices quickly.',
      'This is indicative guidance, not a formal valuation certificate.',
    ],
    safetyNotice: 'Resale ranges are estimates only.',
  });
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const started = Date.now();
  const auth = await verifyAuth(req);
  if (!isAuthContext(auth)) return auth;

  const rate = await enforceRateLimit(auth.supabase, auth.user.id, {
    ...DEFAULT_AI_RATE_LIMIT,
    functionName: FUNCTION_NAME,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs);

  let input: ResaleAdviceInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.vehicleId || !input.make || !input.model || !input.manufactureYear) {
    return errorResponse('vehicleId, make, model, and manufactureYear are required');
  }

  const systemPrompt =
    'Estimate Sri Lankan used vehicle resale ranges in LKR minor units (1 LKR = 100 minor). Return ResaleAdvice JSON. confidence: low|medium|high.';

  const userPrompt = JSON.stringify(input);

  try {
    const result = await geminiTextJson<ResaleAdvice>(
      { systemPrompt, userPrompt },
      mockResaleAdvice(input),
    );

    const advice = withSafetyNotice({ ...result.data, modelId: result.modelId });

    await auth.supabase.from('vehicle_valuations').insert({
      user_id: auth.user.id,
      vehicle_id: input.vehicleId,
      private_sale_min_minor: advice.privateSaleRangeMinor.min,
      private_sale_max_minor: advice.privateSaleRangeMinor.max,
      dealer_min_minor: advice.dealerRangeMinor.min,
      dealer_max_minor: advice.dealerRangeMinor.max,
      currency: advice.currency,
      confidence: advice.confidence,
      positive_factors: advice.factorsIncreasingValue,
      negative_factors: advice.factorsReducingValue,
      preparation_recommendations: advice.preparationRecommendations,
      limitations: advice.dataLimitations,
      input_snapshot: input,
    });

    if (input.comparableListings?.length) {
      const { data: valuation } = await auth.supabase
        .from('vehicle_valuations')
        .select('id')
        .eq('vehicle_id', input.vehicleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (valuation?.id) {
        await auth.supabase.from('market_comparables').insert(
          input.comparableListings.map((c) => ({
            valuation_id: valuation.id,
            listing_price_minor: c.priceMinor,
            mileage: c.mileage,
            manufacture_year: c.year,
            source: c.source ?? null,
            currency: advice.currency,
          })),
        );
      }
    }

    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      modelId: result.modelId,
      success: true,
      latencyMs: Date.now() - started,
    });

    return jsonResponse(advice);
  } catch (err) {
    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      success: false,
      errorCode: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
      latencyMs: Date.now() - started,
    });
    return errorResponse('Resale advice generation failed', 500);
  }
});
