import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { isAuthContext, verifyAuth } from '../_shared/auth.ts';
import {
  geminiVisionJson,
  geminiTextJson,
  logAiUsage,
  withSafetyNotice,
} from '../_shared/gemini.ts';
import {
  DEFAULT_AI_RATE_LIMIT,
  enforceRateLimit,
  rateLimitResponse,
} from '../_shared/rate-limit.ts';

const FUNCTION_NAME = 'analyze-vehicle-symptoms';

type SymptomAnalysisInput = {
  vehicleId: string;
  symptoms: string;
  odometer?: number;
  obdCodes?: string[];
  warningLightVisible?: boolean;
  recentServiceSummary?: string;
  imageBase64?: string;
  imageMimeType?: string;
  followUpAnswers?: Record<string, string>;
  locale?: 'en' | 'si' | 'ta';
};

type SymptomAnalysis = {
  symptomSummary: string;
  possibleCauses: Array<{ cause: string; confidence: number; explanation: string }>;
  confidenceRange: { min: number; max: number };
  riskLevel: string;
  recommendedChecks: string[];
  recommendedGarageCategory: string;
  roadsideAssistanceRecommended: boolean;
  canContinueDriving: string;
  limitations: string[];
  safetyNotice: string;
  followUpQuestions?: string[];
  modelId?: string;
};

function mockSymptomAnalysis(input: SymptomAnalysisInput): SymptomAnalysis {
  const text = input.symptoms.toLowerCase();
  const vibration = text.includes('vibrat') || text.includes('shake');

  return withSafetyNotice({
    symptomSummary: input.symptoms.slice(0, 200),
    possibleCauses: vibration
      ? [{
          cause: 'Wheel balance or alignment issue',
          confidence: 0.65,
          explanation: 'Speed-related vibration often relates to wheels or tyres.',
        }]
      : [{
          cause: 'Further inspection required',
          confidence: 0.4,
          explanation: 'Symptoms are non-specific without physical inspection.',
        }],
    confidenceRange: { min: 0.3, max: 0.7 },
    riskLevel: input.warningLightVisible ? 'high' : 'medium',
    recommendedChecks: ['Visual underbody check', 'Note when symptoms occur (speed/load/temperature)'],
    recommendedGarageCategory: vibration ? 'wheel_alignment' : 'diagnostics',
    roadsideAssistanceRecommended: false,
    canContinueDriving: 'professional_inspection_recommended',
    limitations: ['Remote symptom analysis cannot replace workshop diagnosis.'],
    safetyNotice: 'Symptom guidance is not a confirmed diagnosis.',
    followUpQuestions: ['Does the issue occur at a specific speed?', 'Any recent pothole impact?'],
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

  let input: SymptomAnalysisInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.vehicleId || !input.symptoms?.trim()) {
    return errorResponse('vehicleId and symptoms are required');
  }

  const systemPrompt =
    'You are DriveMate LK symptom assistant for Sri Lankan drivers. Return JSON matching SymptomAnalysis schema. Never confirm mechanical diagnosis.';

  const userPrompt = JSON.stringify(input);

  try {
    const result = input.imageBase64 && input.imageMimeType
      ? await geminiVisionJson<SymptomAnalysis>(
          {
            systemPrompt,
            userPrompt,
            imageBase64: input.imageBase64,
            mimeType: input.imageMimeType,
          },
          mockSymptomAnalysis(input),
        )
      : await geminiTextJson<SymptomAnalysis>(
          { systemPrompt, userPrompt },
          mockSymptomAnalysis(input),
        );

    const analysis = withSafetyNotice({ ...result.data, modelId: result.modelId });

    await auth.supabase.from('symptom_reports').insert({
      user_id: auth.user.id,
      vehicle_id: input.vehicleId,
      symptoms: input.symptoms,
      odometer: input.odometer ?? null,
      obd_codes: input.obdCodes ?? null,
      warning_light_visible: input.warningLightVisible ?? false,
      analysis_result: analysis,
      ai_model: result.modelId,
    });

    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      modelId: result.modelId,
      success: true,
      latencyMs: Date.now() - started,
    });

    return jsonResponse(analysis);
  } catch (err) {
    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      success: false,
      errorCode: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
      latencyMs: Date.now() - started,
    });
    return errorResponse('Symptom analysis failed', 500);
  }
});
