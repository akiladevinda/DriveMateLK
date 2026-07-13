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
import { buildMockDashboardAnalysis } from '@/services/ai/dashboard-heuristics';

const MOCK_MODEL_ID = 'mock-drivemate-lk-v1';

function withSafetyNotice<T extends { safetyNotice: string }>(result: T): T {
  return {
    ...result,
    safetyNotice: `${AI_SAFETY_DISCLAIMER} ${result.safetyNotice}`.trim(),
  };
}

export class MockAIProvider implements AIProvider {
  async analyzeDashboardImage(input: DashboardImageInput): Promise<DashboardAnalysis> {
    return withSafetyNotice(
      buildMockDashboardAnalysis({
        imageBase64: input.imageBase64,
        dashboardMessage: input.dashboardMessage,
        mockedReason:
          'Client mock AI is active. Photos are not visually analysed unless the Gemini edge function is used.',
      }),
    );
  }

  async analyzeVehicleSymptoms(input: SymptomAnalysisInput): Promise<SymptomAnalysis> {
    const text = input.symptoms.toLowerCase();
    const vibration = text.includes('vibrat') || text.includes('shake');
    const braking = text.includes('brak');
    const riskLevel: SymptomAnalysis['riskLevel'] =
      braking && vibration ? 'high' : vibration ? 'medium' : 'low';

    return withSafetyNotice({
      symptomSummary: input.symptoms.slice(0, 280),
      possibleCauses: vibration
        ? [
            {
              cause: 'Wheel balance or tyre wear',
              confidence: 0.62,
              explanation:
                'Vibration that rises with speed is often linked to tyres, balance or bent rims.',
            },
            {
              cause: braking ? 'Brake disc or pad irregularity' : 'Driveshaft or engine mount wear',
              confidence: braking ? 0.74 : 0.38,
              explanation: braking
                ? 'Vibration during braking may relate to warped discs or uneven pad deposit.'
                : 'Without braking association, mounts or rotating assemblies are possible contributors.',
            },
          ]
        : [
            {
              cause: 'Needs more symptom detail',
              confidence: 0.45,
              explanation:
                'Provide when it happens, speed, warning lights and recent service history for better guidance.',
            },
          ],
      confidenceRange: { min: 0.35, max: 0.75 },
      riskLevel,
      recommendedChecks: [
        'Inspect tyre pressure and tread',
        'Note whether a warning light is illuminated',
        'Review recent service or tyre work',
      ],
      recommendedGarageCategory: braking ? 'brake_specialist' : 'general_garage',
      roadsideAssistanceRecommended: riskLevel === 'high',
      canContinueDriving: braking
        ? 'professional_inspection_recommended'
        : 'likely_yes_with_caution',
      limitations: [
        'Mock analysis cannot inspect the vehicle.',
        'Hidden mechanical faults cannot be ruled in or out from text alone.',
      ],
      safetyNotice: 'Guidance only — not a confirmed mechanical diagnosis.',
      followUpQuestions: [
        'When did it begin?',
        'Does it occur while braking?',
        'Does it occur at a certain speed?',
        'Is a warning light visible?',
      ],
      modelId: MOCK_MODEL_ID,
    } satisfies SymptomAnalysis);
  }

  async extractDocument(input: DocumentExtractionInput): Promise<DocumentExtraction> {
    return withSafetyNotice({
      documentType: input.documentTypeHint ?? 'insurance_certificate',
      vehicleRegistration: null,
      provider: 'Demo Insurance (Mock)',
      referenceNumber: 'MOCK-POL-001',
      issueDate: null,
      expiryDate: null,
      amountMinor: null,
      currency: 'LKR',
      ownerName: null,
      confidence: 0.4,
      rawFields: { sourceMimeType: input.mimeType },
      limitations: ['Mock OCR does not read image bytes.'],
      safetyNotice: 'Confirm every extracted field before saving.',
      modelId: MOCK_MODEL_ID,
    } satisfies DocumentExtraction);
  }

  async inspectVehicleImages(
    _input: VehicleInspectionInput,
  ): Promise<VehicleInspectionResult> {
    return withSafetyNotice({
      completionPercentage: 25,
      overallAssessment:
        'Limited mock inspection. Image analysis cannot confirm hidden damage, mechanical condition or accident history.',
      findings: [
        {
          category: 'exterior',
          item: 'Visible body panels',
          severity: 'attention',
          observation: 'Mock provider flagged possible surface wear that needs human verification.',
          recommendedAction: 'Inspect in daylight and compare with seller disclosures.',
          confidence: 0.4,
        },
      ],
      checklistHighlights: [
        'Confirm chassis and engine numbers against documents',
        'Check tyre age and wear',
        'Inspect for warning lights during a short test drive',
      ],
      limitations: [
        'Photos cannot prove structural integrity or flood history.',
        'Use official DMT verification workflows for ownership checks.',
      ],
      safetyNotice: 'Image analysis is guidance only and not a full vehicle inspection.',
      modelId: MOCK_MODEL_ID,
    } satisfies VehicleInspectionResult);
  }

  async generateResaleAdvice(input: ResaleAdviceInput): Promise<ResaleAdvice> {
    const base = Math.max(
      1_000_000_00,
      Math.round(18_000_000_00 - input.mileage * 80),
    );

    return withSafetyNotice({
      privateSaleRangeMinor: { min: base, max: base + 800_000_00 },
      dealerRangeMinor: { min: base - 900_000_00, max: base - 100_000_00 },
      currency: 'LKR',
      confidence: 'low',
      factorsIncreasingValue: [
        'Complete documented service history can improve buyer confidence.',
        'Valid insurance and revenue licence support smoother handover.',
      ],
      factorsReducingValue: [
        'Higher mileage typically narrows private-sale expectations.',
        'Unresolved issues or incomplete documents may reduce offers.',
      ],
      preparationRecommendations: [
        'Service before listing if overdue',
        'Replace visibly worn tyres if budget allows',
        'Prepare a shareable vehicle passport without sensitive IDs',
      ],
      dataLimitations: [
        'No live Sri Lankan listing feed is connected in mock mode.',
        'Ranges are illustrative rule-based estimates only.',
      ],
      safetyNotice: 'Valuation is an estimate, not an appraisal or guaranteed sale price.',
      modelId: MOCK_MODEL_ID,
    } satisfies ResaleAdvice);
  }

  async chat(input: VehicleChatInput): Promise<VehicleChatResponse> {
    const make = input.context?.make ?? 'vehicle';

    return withSafetyNotice({
      reply: `Based on your ${make} profile, I can help with maintenance timing, document renewals and general symptom guidance. Ask about service, fuel economy or warning lights. This is guidance only — not a mechanical diagnosis.`,
      suggestedFollowUps: [
        'When is my next service?',
        'Which documents expire soon?',
        'Why might fuel economy drop in city traffic?',
      ],
      referencedVehicleData: input.context ? ['make', 'odometer'] : [],
      limitations: ['Mock chat does not call a live model.'],
      safetyNotice: 'AI chat is informational guidance only.',
      modelId: MOCK_MODEL_ID,
    } satisfies VehicleChatResponse);
  }
}
export const mockAIProvider = new MockAIProvider();
