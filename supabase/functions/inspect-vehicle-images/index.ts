import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { isAuthContext, verifyAuth } from '../_shared/auth.ts';
import {
  geminiVisionJson,
  logAiUsage,
  withSafetyNotice,
} from '../_shared/gemini.ts';
import {
  DEFAULT_AI_RATE_LIMIT,
  enforceRateLimit,
  rateLimitResponse,
} from '../_shared/rate-limit.ts';

const FUNCTION_NAME = 'inspect-vehicle-images';

type VehicleInspectionInput = {
  vehicleId?: string;
  make?: string;
  model?: string;
  year?: number;
  images: Array<{ base64: string; mimeType: string; category?: string; caption?: string }>;
  inspectionPurpose: 'pre_purchase' | 'owner_check' | 'resale_prep';
  locale?: 'en' | 'si' | 'ta';
};

type VehicleInspectionResult = {
  completionPercentage: number;
  overallAssessment: string;
  findings: Array<{
    category: string;
    item: string;
    severity: string;
    observation: string;
    recommendedAction: string | null;
    confidence: number;
  }>;
  checklistHighlights: string[];
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
};

function mockInspection(input: VehicleInspectionInput): VehicleInspectionResult {
  return withSafetyNotice({
    completionPercentage: Math.min(input.images.length * 15, 90),
    overallAssessment: 'Preliminary visual review completed. Professional inspection still recommended.',
    findings: [{
      category: 'Exterior',
      item: 'General condition',
      severity: 'attention',
      observation: 'Limited angles provided; unable to assess underbody rust.',
      recommendedAction: 'Capture tyre tread, engine bay, and dashboard warning lights.',
      confidence: 0.5,
    }],
    checklistHighlights: ['Request service history', 'Verify chassis number on registration'],
    limitations: ['Photo-based inspection cannot detect hidden mechanical faults.'],
    safetyNotice: 'Inspection results are AI-assisted observations only.',
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

  let input: VehicleInspectionInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.images?.length || !input.inspectionPurpose) {
    return errorResponse('images and inspectionPurpose are required');
  }

  const primary = input.images[0];
  const systemPrompt =
    'Perform visual vehicle inspection from photos for Sri Lankan market. Return VehicleInspectionResult JSON. severity: good|attention|critical|unknown.';

  const userPrompt = JSON.stringify({
    make: input.make,
    model: input.model,
    year: input.year,
    inspectionPurpose: input.inspectionPurpose,
    imageCount: input.images.length,
    categories: input.images.map((i) => i.category ?? 'general'),
  });

  try {
    const result = await geminiVisionJson<VehicleInspectionResult>(
      {
        systemPrompt,
        userPrompt,
        imageBase64: primary.base64,
        mimeType: primary.mimeType,
      },
      mockInspection(input),
    );

    const inspection = withSafetyNotice({ ...result.data, modelId: result.modelId });

    const { data: report } = await auth.supabase.from('inspection_reports').insert({
      user_id: auth.user.id,
      vehicle_id: input.vehicleId ?? null,
      inspection_purpose: input.inspectionPurpose,
      completion_percentage: inspection.completionPercentage,
      overall_assessment: inspection.overallAssessment,
      analysis_result: inspection,
      ai_model: result.modelId,
    }).select('id').single();

    if (report?.id && inspection.findings.length) {
      await auth.supabase.from('inspection_findings').insert(
        inspection.findings.map((f) => ({
          report_id: report.id,
          category: f.category,
          item: f.item,
          severity: f.severity,
          observation: f.observation,
          recommended_action: f.recommendedAction,
          confidence: f.confidence,
        })),
      );
    }

    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      modelId: result.modelId,
      success: true,
      latencyMs: Date.now() - started,
    });

    return jsonResponse(inspection);
  } catch (err) {
    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      success: false,
      errorCode: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
      latencyMs: Date.now() - started,
    });
    return errorResponse('Vehicle inspection failed', 500);
  }
});
