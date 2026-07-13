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

const FUNCTION_NAME = 'vehicle-chat';

type VehicleChatInput = {
  vehicleId?: string;
  conversationId?: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: Record<string, unknown>;
  locale?: 'en' | 'si' | 'ta';
};

type VehicleChatResponse = {
  reply: string;
  suggestedFollowUps?: string[];
  referencedVehicleData?: string[];
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
};

function mockChat(input: VehicleChatInput): VehicleChatResponse {
  return withSafetyNotice({
    reply:
      'I can help with general vehicle care, reminders, and when to consult a garage. For warning lights or safety concerns, please have a qualified mechanic inspect the vehicle.',
    suggestedFollowUps: [
      'What maintenance is due soon?',
      'How do I prepare documents for renewal?',
    ],
    referencedVehicleData: input.context ? Object.keys(input.context) : [],
    limitations: ['Chat responses are general guidance for Sri Lankan vehicle owners.'],
    safetyNotice: 'Chat guidance is not a confirmed mechanical diagnosis.',
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
    maxRequests: 60,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs);

  let input: VehicleChatInput;
  try {
    input = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  if (!input.message?.trim()) {
    return errorResponse('message is required');
  }

  let conversationId = input.conversationId;

  if (!conversationId) {
    const { data: conversation, error } = await auth.supabase
      .from('ai_conversations')
      .insert({
        user_id: auth.user.id,
        vehicle_id: input.vehicleId ?? null,
        conversation_type: 'general',
        title: input.message.slice(0, 80),
      })
      .select('id')
      .single();

    if (error || !conversation) {
      return errorResponse('Failed to create conversation', 500);
    }
    conversationId = conversation.id;
  }

  await auth.supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: input.message,
  });

  const systemPrompt =
    'You are DriveMate LK vehicle assistant for Sri Lanka. Be concise. Never confirm mechanical diagnosis. Encourage professional inspection when safety is uncertain.';

  const userPrompt = JSON.stringify({
    message: input.message,
    history: input.history ?? [],
    context: input.context ?? {},
    locale: input.locale ?? 'en',
  });

  try {
    const result = await geminiTextJson<VehicleChatResponse>(
      { systemPrompt, userPrompt },
      mockChat(input),
    );

    const response = withSafetyNotice({ ...result.data, modelId: result.modelId });

    await auth.supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: response.reply,
      metadata: {
        suggestedFollowUps: response.suggestedFollowUps,
        modelId: result.modelId,
      },
    });

    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      modelId: result.modelId,
      success: true,
      latencyMs: Date.now() - started,
    });

    return jsonResponse({ ...response, conversationId });
  } catch (err) {
    await logAiUsage(auth.supabase, {
      userId: auth.user.id,
      vehicleId: input.vehicleId,
      functionName: FUNCTION_NAME,
      success: false,
      errorCode: err instanceof Error ? err.message.slice(0, 120) : 'unknown',
      latencyMs: Date.now() - started,
    });
    return errorResponse('Vehicle chat failed', 500);
  }
});
