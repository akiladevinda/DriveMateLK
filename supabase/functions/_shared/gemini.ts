import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SAFETY_NOTICE =
  'This AI result provides general guidance and is NOT a confirmed mechanical diagnosis. When safety is uncertain, stop in a safe place and contact a qualified professional.';

export { SAFETY_NOTICE };

export type GeminiTextRequest = {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: Record<string, unknown>;
};

export type GeminiVisionRequest = GeminiTextRequest & {
  imageBase64: string;
  mimeType: string;
};

export type GeminiResult<T> = {
  data: T;
  modelId: string;
  mocked: boolean;
};

function getTextModel(): string {
  return Deno.env.get('GEMINI_TEXT_MODEL') ?? 'gemini-flash-latest';
}

function getVisionModel(): string {
  return Deno.env.get('GEMINI_VISION_MODEL') ?? 'gemini-flash-latest';
}

/** Prefer configured model, then known working Flash aliases. */
function visionModelCandidates(): string[] {
  const primary = getVisionModel();
  const fallbacks = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.0-flash'];
  return [...new Set([primary, ...fallbacks])];
}

function textModelCandidates(): string[] {
  const primary = getTextModel();
  const fallbacks = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.0-flash'];
  return [...new Set([primary, ...fallbacks])];
}

async function callGeminiGenerateContent(
  model: string,
  body: Record<string, unknown>,
): Promise<{ text: string; modelId: string }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY missing');
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 500)}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini returned empty response');
  }

  return { text, modelId: model };
}

async function callWithModelFallback(
  models: string[],
  body: Record<string, unknown>,
): Promise<{ text: string; modelId: string }> {
  let lastError: Error | null = null;
  for (const model of models) {
    try {
      return await callGeminiGenerateContent(model, body);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      // Try next model on quota / not-found; stop on auth errors.
      if (msg.includes('(401)') || msg.includes('(403)') || msg.includes('API_KEY')) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error('All Gemini models failed');
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let raw = (fenced ? fenced[1] : text).trim();

  // Strip BOM / leading junk before the first object/array.
  const startObj = raw.indexOf('{');
  const startArr = raw.indexOf('[');
  let start = -1;
  if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
  else start = Math.max(startObj, startArr);
  if (start > 0) {
    raw = raw.slice(start);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Gemini sometimes appends a second object or commentary after valid JSON.
    const sliced = sliceFirstJsonValue(raw);
    if (sliced) {
      return JSON.parse(sliced) as T;
    }
    throw new Error(`Failed to parse Gemini JSON (${raw.slice(0, 120)}…)`);
  }
}

/** Extract the first complete JSON object or array from a string. */
function sliceFirstJsonValue(raw: string): string | null {
  const first = raw.trimStart();
  if (!first.startsWith('{') && !first.startsWith('[')) return null;

  const open = first[0];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < first.length; i++) {
    const ch = first[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth += 1;
    if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return first.slice(0, i + 1);
      }
    }
  }
  return null;
}

export async function geminiTextJson<T>(
  request: GeminiTextRequest,
  mockData: T,
): Promise<GeminiResult<T>> {
  if (!Deno.env.get('GEMINI_API_KEY')) {
    return { data: mockData, modelId: 'mock-drivemate-lk-v1', mocked: true };
  }

  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    responseMimeType: 'application/json',
  };

  if (request.jsonSchema) {
    generationConfig.responseSchema = request.jsonSchema;
  }

  const { text, modelId } = await callWithModelFallback(textModelCandidates(), {
    systemInstruction: { parts: [{ text: request.systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
    generationConfig,
  });

  return { data: extractJson<T>(text), modelId, mocked: false };
}

export async function geminiVisionJson<T>(
  request: GeminiVisionRequest,
  mockData: T,
): Promise<GeminiResult<T>> {
  if (!Deno.env.get('GEMINI_API_KEY')) {
    return { data: mockData, modelId: 'mock-drivemate-lk-v1', mocked: true };
  }

  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    responseMimeType: 'application/json',
  };

  if (request.jsonSchema) {
    generationConfig.responseSchema = request.jsonSchema;
  }

  // Cap payload size — oversized base64 is a common Edge Function failure cause.
  const maxChars = 900_000;
  const imageData =
    request.imageBase64.length > maxChars
      ? request.imageBase64.slice(0, maxChars)
      : request.imageBase64;

  const { text, modelId } = await callWithModelFallback(visionModelCandidates(), {
    systemInstruction: { parts: [{ text: request.systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [
        { text: request.userPrompt },
        { inlineData: { mimeType: request.mimeType, data: imageData } },
      ],
    }],
    generationConfig,
  });

  return { data: extractJson<T>(text), modelId, mocked: false };
}

export function withSafetyNotice<T extends { safetyNotice?: string }>(result: T): T {
  return {
    ...result,
    safetyNotice: `${SAFETY_NOTICE} ${result.safetyNotice ?? ''}`.trim(),
  };
}

export async function logAiUsage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    vehicleId?: string;
    functionName: string;
    modelId?: string;
    success: boolean;
    errorCode?: string;
    latencyMs?: number;
  },
): Promise<void> {
  await supabase.from('ai_usage_events').insert({
    user_id: params.userId,
    vehicle_id: params.vehicleId ?? null,
    function_name: params.functionName,
    model_id: params.modelId ?? null,
    success: params.success,
    error_code: params.errorCode ?? null,
    latency_ms: params.latencyMs ?? null,
  });
}
