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

const FUNCTION_NAME = 'extract-document';

type DocumentExtractionInput = {
  vehicleId?: string;
  documentTypeHint?: string;
  imageBase64: string;
  mimeType: string;
  locale?: 'en' | 'si' | 'ta';
};

type DocumentExtraction = {
  documentType: string | null;
  vehicleRegistration: string | null;
  provider: string | null;
  referenceNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  amountMinor: number | null;
  currency: string | null;
  ownerName: string | null;
  confidence: number;
  rawFields: Record<string, string>;
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
};

function mockExtraction(input: DocumentExtractionInput): DocumentExtraction {
  return withSafetyNotice({
    documentType: input.documentTypeHint ?? 'insurance_certificate',
    vehicleRegistration: null,
    provider: 'Sample Insurer (Demo)',
    referenceNumber: null,
    issueDate: null,
    expiryDate: null,
    amountMinor: null,
    currency: 'LKR',
    ownerName: null,
    confidence: 0.55,
    rawFields: {},
    limitations: ['Mock extraction — confirm all fields manually before saving.'],
    safetyNotice: 'Extracted data must be verified by the vehicle owner.',
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

  let input: DocumentExtractionInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.imageBase64 || !input.mimeType) {
    return errorResponse('imageBase64 and mimeType are required');
  }

  const systemPrompt =
    'Extract vehicle document fields for Sri Lankan documents (insurance, revenue licence, registration). Return JSON. Dates ISO YYYY-MM-DD. Amounts as integer minor units (cents).';

  const userPrompt = JSON.stringify({
    documentTypeHint: input.documentTypeHint,
    locale: input.locale ?? 'en',
  });

  try {
    const result = await geminiVisionJson<DocumentExtraction>(
      {
        systemPrompt,
        userPrompt,
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
      },
      mockExtraction(input),
    );

    const extraction = withSafetyNotice({ ...result.data, modelId: result.modelId });

    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      modelId: result.modelId,
      success: true,
      latencyMs: Date.now() - started,
    });

    return jsonResponse(extraction);
  } catch (err) {
    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      success: false,
      errorCode: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
      latencyMs: Date.now() - started,
    });
    return errorResponse('Document extraction failed', 500);
  }
});
