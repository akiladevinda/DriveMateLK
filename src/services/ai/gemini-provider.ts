import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { buildMockDashboardAnalysis } from '@/services/ai/dashboard-heuristics';
import {
  AI_SAFETY_DISCLAIMER,
  type AIProvider,
  type DashboardAnalysis,
  type DashboardImageInput,
  type DocumentExtraction,
  type DocumentExtractionInput,
  type ResaleAdvice,
  type ResaleAdviceInput,
  type SymptomAnalysis,
  type SymptomAnalysisInput,
  type VehicleChatInput,
  type VehicleChatResponse,
  type VehicleInspectionInput,
  type VehicleInspectionResult,
} from '@/services/ai/types';

type EdgeFunctionName =
  | 'analyze-dashboard-image'
  | 'analyze-vehicle-symptoms'
  | 'extract-document'
  | 'inspect-vehicle-images'
  | 'generate-resale-advice'
  | 'vehicle-chat';

type InvokeResult<T> = { data: T | null; error: Error | null };

async function invokeEdgeFunction<TResponse>(
  functionName: EdgeFunctionName,
  body: Record<string, unknown>,
): Promise<InvokeResult<TResponse>> {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: new Error('Supabase is not configured. Use the mock AI provider instead.'),
    };
  }

  const { data, error } = await supabase.functions.invoke<TResponse>(functionName, {
    body,
  });

  if (error) {
    let detail = error.message;
    // Prefer the Edge Function JSON error body when available.
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const payload = (await context.json()) as { error?: string };
        if (payload?.error) {
          detail = payload.error;
        }
      }
    } catch {
      // keep original message
    }
    return { data: null, error: new Error(detail) };
  }

  return { data: data ?? null, error: null };
}

function ensureSafetyNotice<T extends { safetyNotice?: string }>(result: T): T {
  return {
    ...result,
    safetyNotice: result.safetyNotice
      ? `${AI_SAFETY_DISCLAIMER} ${result.safetyNotice}`.trim()
      : AI_SAFETY_DISCLAIMER,
  };
}

export class GeminiAIProvider implements AIProvider {
  async analyzeDashboardImage(input: DashboardImageInput): Promise<DashboardAnalysis> {
    const { data, error } = await invokeEdgeFunction<DashboardAnalysis>(
      'analyze-dashboard-image',
      { ...input },
    );

    if (data && !error) {
      if (data.modelId === 'mock-drivemate-lk-v1' && input.dashboardMessage?.trim()) {
        const local = buildMockDashboardAnalysis({
          imageBase64: input.imageBase64,
          dashboardMessage: input.dashboardMessage,
          mockedReason:
            'Server returned mock AI (GEMINI_API_KEY missing on Edge Function, or vision disabled).',
        });
        return ensureSafetyNotice(local);
      }
      return ensureSafetyNotice(data);
    }

    // Edge invoke failed — keep a soft text fallback but surface the real server error.
    const fallback = buildMockDashboardAnalysis({
      imageBase64: input.imageBase64,
      dashboardMessage: input.dashboardMessage,
      mockedReason: `Live AI failed: ${error?.message ?? 'unknown error'}`,
    });
    return ensureSafetyNotice(fallback);
  }

  async analyzeVehicleSymptoms(input: SymptomAnalysisInput): Promise<SymptomAnalysis> {
    const { data, error } = await invokeEdgeFunction<SymptomAnalysis>(
      'analyze-vehicle-symptoms',
      { ...input },
    );
    if (error || !data) {
      throw error ?? new Error('Symptom analysis failed');
    }
    return ensureSafetyNotice(data);
  }

  async extractDocument(input: DocumentExtractionInput): Promise<DocumentExtraction> {
    const { data, error } = await invokeEdgeFunction<DocumentExtraction>('extract-document', {
      ...input,
    });
    if (error || !data) {
      throw error ?? new Error('Document extraction failed');
    }
    return ensureSafetyNotice(data);
  }

  async inspectVehicleImages(input: VehicleInspectionInput): Promise<VehicleInspectionResult> {
    const { data, error } = await invokeEdgeFunction<VehicleInspectionResult>(
      'inspect-vehicle-images',
      { ...input },
    );
    if (error || !data) {
      throw error ?? new Error('Vehicle inspection failed');
    }
    return ensureSafetyNotice(data);
  }

  async generateResaleAdvice(input: ResaleAdviceInput): Promise<ResaleAdvice> {
    const { data, error } = await invokeEdgeFunction<ResaleAdvice>(
      'generate-resale-advice',
      { ...input },
    );
    if (error || !data) {
      throw error ?? new Error('Resale advice generation failed');
    }
    return ensureSafetyNotice(data);
  }

  async chat(input: VehicleChatInput): Promise<VehicleChatResponse> {
    const { data, error } = await invokeEdgeFunction<VehicleChatResponse>('vehicle-chat', {
      ...input,
    });
    if (error || !data) {
      throw error ?? new Error('Vehicle chat failed');
    }
    return ensureSafetyNotice(data);
  }
}

export const geminiAIProvider = new GeminiAIProvider();
