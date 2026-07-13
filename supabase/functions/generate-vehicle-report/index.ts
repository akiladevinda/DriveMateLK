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

const FUNCTION_NAME = 'generate-vehicle-report';

type GenerateReportInput = {
  vehicleId: string;
  sections?: string[];
  locale?: 'en' | 'si' | 'ta';
};

type VehicleReport = {
  vehicleId: string;
  generatedAt: string;
  summary: string;
  sections: Record<string, unknown>;
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
};

function mockReport(vehicle: Record<string, unknown>, sections: string[]): VehicleReport {
  const sectionData: Record<string, unknown> = {};
  for (const section of sections) {
    sectionData[section] = { status: 'included', note: `Demo ${section} section` };
  }

  return withSafetyNotice({
    vehicleId: String(vehicle.id),
    generatedAt: new Date().toISOString(),
    summary: `Vehicle report for ${vehicle.make} ${vehicle.model} (${vehicle.registration_number}).`,
    sections: sectionData,
    limitations: ['Report compiled from owner-entered data; not a certified inspection.'],
    safetyNotice: 'Shared reports are informational and not mechanical certifications.',
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
    maxRequests: 10,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs);

  let input: GenerateReportInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.vehicleId) {
    return errorResponse('vehicleId is required');
  }

  const sections = input.sections ?? [
    'profile',
    'documents',
    'maintenance',
    'expenses',
    'health',
    'issues',
  ];

  const { data: vehicle, error: vehicleError } = await auth.supabase
    .from('vehicles')
    .select('*')
    .eq('id', input.vehicleId)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return errorResponse('Vehicle not found or access denied', 403);
  }

  const [
    { data: documents },
    { data: services },
    { data: expenses },
    { data: health },
    { data: issues },
  ] = await Promise.all([
    auth.supabase.from('vehicle_documents').select('id,title,document_type,expiry_date,status').eq('vehicle_id', input.vehicleId).limit(20),
    auth.supabase.from('service_records').select('id,service_date,service_type,total_cost_minor').eq('vehicle_id', input.vehicleId).limit(20),
    auth.supabase.from('expenses').select('id,title,category,amount_minor,expense_date').eq('vehicle_id', input.vehicleId).limit(50),
    auth.supabase.from('vehicle_health_scores').select('*').eq('vehicle_id', input.vehicleId).order('calculated_at', { ascending: false }).limit(1),
    auth.supabase.from('vehicle_issues').select('id,title,severity,status').eq('vehicle_id', input.vehicleId).limit(20),
  ]);

  const context = { vehicle, documents, services, expenses, health, issues, sections };

  const systemPrompt =
    'Generate a concise owner vehicle report JSON for Sri Lanka. Include summary and sections object. Never claim certified inspection.';

  try {
    const result = await geminiTextJson<VehicleReport>(
      { systemPrompt, userPrompt: JSON.stringify(context) },
      mockReport(vehicle, sections),
    );

    const report = withSafetyNotice({ ...result.data, modelId: result.modelId });

    await auth.supabase.from('resale_reports').insert({
      user_id: auth.user.id,
      vehicle_id: input.vehicleId,
      report_data: report,
      storage_path: `generated-reports/${auth.user.id}/${input.vehicleId}/${Date.now()}.json`,
    });

    await auth.supabase.from('vehicle_timeline_events').insert({
      user_id: auth.user.id,
      vehicle_id: input.vehicleId,
      event_type: 'report_shared',
      title: 'Vehicle report generated',
      description: report.summary,
      metadata: { sections },
    });

    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      modelId: result.modelId,
      success: true,
      latencyMs: Date.now() - started,
    });

    return jsonResponse(report);
  } catch (err) {
    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      success: false,
      errorCode: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
      latencyMs: Date.now() - started,
    });
    return errorResponse('Report generation failed', 500);
  }
});
