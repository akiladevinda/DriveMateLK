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

const FUNCTION_NAME = 'analyze-dashboard-image';

type DashboardImageInput = {
  vehicleId: string;
  imageBase64: string;
  mimeType: string;
  dashboardMessage?: string;
  odometer?: number;
  locale?: 'en' | 'si' | 'ta';
};

type DashboardAnalysis = {
  detectedSymbols: Array<{
    name: string;
    description: string;
    confidence: number;
    severity: string;
    likelyMeaning: string;
    possibleCauses: string[];
    recommendedActions: string[];
    canContinueDriving: string;
  }>;
  imageQuality: string;
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
};

function inferFromText(message?: string): DashboardAnalysis['detectedSymbols'][number] {
  const msg = (message ?? '').toLowerCase();

  if (
    msg.includes('check engine') ||
    msg.includes('malfunction') ||
    msg.includes('engine light') ||
    msg.includes('engine warning') ||
    msg.includes('mil')
  ) {
    return {
      name: 'Check Engine Light (MIL)',
      description: 'Amber engine outline / malfunction indicator lamp.',
      confidence: 0.86,
      severity: 'urgent',
      likelyMeaning:
        'The engine management system has logged a fault. Have the vehicle scanned with OBD-II.',
      possibleCauses: [
        'Oxygen / MAF sensor fault',
        'Loose fuel cap',
        'Misfire / spark plugs',
        'Emissions / catalyst issue',
      ],
      recommendedActions: [
        'Avoid high-load driving',
        'Note if the lamp is steady or flashing',
        'Get an OBD-II scan at a garage',
      ],
      canContinueDriving: 'professional_inspection_recommended',
    };
  }

  if (msg.includes('oil') || msg.includes('pressure')) {
    return {
      name: 'Engine Oil Pressure Warning',
      description: 'Red oil-can symbol common on Sri Lankan vehicles.',
      confidence: 0.82,
      severity: 'critical',
      likelyMeaning: 'Possible low engine oil pressure.',
      possibleCauses: ['Low oil level', 'Oil leak', 'Faulty sensor'],
      recommendedActions: ['Stop safely and check oil if possible', 'Contact a qualified mechanic'],
      canContinueDriving: 'stop_when_safe',
    };
  }

  return {
    name: 'Unidentified Dashboard Indicator',
    description: 'Could not confidently match a specific symbol from text alone.',
    confidence: 0.35,
    severity: 'attention',
    likelyMeaning: 'Retake photo with dashboard lit and symbol centred, or set GEMINI_API_KEY for vision.',
    possibleCauses: ['Unclear image', 'Multiple indicators', 'No Gemini API key configured'],
    recommendedActions: ['Retake photo', 'Describe the light in text', 'Consult a mechanic'],
    canContinueDriving: 'unknown',
  };
}

function mockDashboardAnalysis(input: DashboardImageInput): DashboardAnalysis {
  return withSafetyNotice({
    detectedSymbols: [inferFromText(input.dashboardMessage)],
    imageQuality: input.imageBase64.length > 10_000 ? 'acceptable' : 'poor',
    limitations: [
      'GEMINI_API_KEY is not set — this is a text-heuristic mock, not true image vision.',
      'Always confirm with a qualified mechanic before major repairs.',
    ],
    safetyNotice: 'Dashboard guidance is indicative only.',
    modelId: 'mock-drivemate-lk-v1',
  });
}

const RESULT_SCHEMA_HINT = `{
  "detectedSymbols": [{
    "name": string,
    "description": string,
    "confidence": number (0-1),
    "severity": "info"|"attention"|"urgent"|"critical",
    "likelyMeaning": string,
    "possibleCauses": string[],
    "recommendedActions": string[],
    "canContinueDriving": "yes"|"unknown"|"professional_inspection_recommended"|"stop_when_safe"
  }],
  "imageQuality": "good"|"acceptable"|"poor",
  "limitations": string[],
  "safetyNotice": string
}`;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const started = Date.now();
  const auth = await verifyAuth(req);
  if (!isAuthContext(auth)) return auth;

  const rateConfig = { ...DEFAULT_AI_RATE_LIMIT, functionName: FUNCTION_NAME };
  const rate = await enforceRateLimit(auth.supabase, auth.user.id, rateConfig);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs);

  let input: DashboardImageInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.vehicleId || !input.imageBase64 || !input.mimeType) {
    return errorResponse('vehicleId, imageBase64, and mimeType are required');
  }

  // Strip data-URL prefix if the client sent one
  const rawBase64 = input.imageBase64.includes(',')
    ? input.imageBase64.split(',').pop()!
    : input.imageBase64;

  const { data: vehicle } = await auth.supabase
    .from('vehicles')
    .select('id, make, model')
    .eq('id', input.vehicleId)
    .maybeSingle();

  if (!vehicle) {
    return errorResponse('Vehicle not found or access denied', 403);
  }

  const systemPrompt = `You are DriveMate LK, an automotive assistant for Sri Lanka.
Analyze the dashboard / instrument cluster photo for warning lights and telltale symbols.
Return ONE JSON object only — no markdown fences, no commentary before or after.
Shape: ${RESULT_SCHEMA_HINT}
Rules:
- Identify common lamps such as Check Engine (MIL), oil pressure, battery/charging, ABS, coolant temperature, tyre pressure, airbag, glow plug, etc.
- If an amber engine outline / check-engine lamp is visible, name it "Check Engine Light (MIL)" with severity urgent and confidence >= 0.75 when clear.
- Never claim a confirmed mechanical diagnosis.
- Always include safetyNotice.
- Be practical for Sri Lankan roads and workshops.
- Output must be a single valid JSON object and nothing else.`;

  const userPrompt = JSON.stringify({
    locale: input.locale ?? 'en',
    vehicle: { make: vehicle.make, model: vehicle.model },
    dashboardMessage: input.dashboardMessage ?? null,
    odometer: input.odometer ?? null,
    task: 'Identify every visible dashboard warning symbol in the attached image.',
  });

  try {
    const result = await geminiVisionJson<DashboardAnalysis>(
      {
        systemPrompt,
        userPrompt,
        imageBase64: rawBase64,
        mimeType: input.mimeType || 'image/jpeg',
      },
      mockDashboardAnalysis({ ...input, imageBase64: rawBase64 }),
    );

    const analysis = withSafetyNotice({ ...result.data, modelId: result.modelId });

    await auth.supabase.from('dashboard_scans').insert({
      user_id: auth.user.id,
      vehicle_id: input.vehicleId,
      image_storage_path: `dashboard-scans/${auth.user.id}/${Date.now()}.jpg`,
      dashboard_message: input.dashboardMessage ?? null,
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
    const message = err instanceof Error ? err.message : 'unknown';
    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      success: false,
      errorCode: message.slice(0, 120),
      latencyMs: Date.now() - started,
    });

    // Surface quota / Gemini errors clearly to the app instead of a generic 500.
    if (message.includes('429') || message.toLowerCase().includes('quota')) {
      return errorResponse(
        'Gemini API quota exceeded. Check billing/rate limits at https://ai.google.dev/gemini-api/docs/rate-limits, then try again.',
        429,
      );
    }

    return errorResponse(`Dashboard analysis failed: ${message.slice(0, 240)}`, 500);
  }
});
