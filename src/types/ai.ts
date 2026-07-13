import type { FuelType, TransmissionType, VehicleType } from '@/types/database';

export const AI_SAFETY_DISCLAIMER =
  'This AI result provides general guidance and is NOT a confirmed mechanical diagnosis. When safety is uncertain, stop in a safe place and contact a qualified professional.';

export type DashboardSymbolSeverity =
  | 'informational'
  | 'attention'
  | 'urgent'
  | 'critical';

export type CanContinueDriving =
  | 'unknown'
  | 'likely_yes_with_caution'
  | 'professional_inspection_recommended'
  | 'stop_when_safe'
  | 'do_not_continue';

export type ImageQuality = 'good' | 'acceptable' | 'poor';

export type SymptomRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ResaleConfidence = 'low' | 'medium' | 'high';

export type InspectionFindingSeverity = 'good' | 'attention' | 'critical' | 'unknown';

export interface DetectedDashboardSymbol {
  name: string;
  description: string;
  confidence: number;
  severity: DashboardSymbolSeverity;
  likelyMeaning: string;
  possibleCauses: string[];
  recommendedActions: string[];
  canContinueDriving: CanContinueDriving;
}

export interface DashboardImageInput {
  vehicleId: string;
  imageBase64: string;
  mimeType: string;
  dashboardMessage?: string;
  odometer?: number;
  locale?: 'en' | 'si' | 'ta';
}

export interface DashboardAnalysis {
  detectedSymbols: DetectedDashboardSymbol[];
  imageQuality: ImageQuality;
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
}

export interface SymptomAnalysisInput {
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
}

export interface SymptomAnalysis {
  symptomSummary: string;
  possibleCauses: Array<{
    cause: string;
    confidence: number;
    explanation: string;
  }>;
  confidenceRange: { min: number; max: number };
  riskLevel: SymptomRiskLevel;
  recommendedChecks: string[];
  recommendedGarageCategory: string;
  roadsideAssistanceRecommended: boolean;
  canContinueDriving: CanContinueDriving;
  limitations: string[];
  safetyNotice: string;
  followUpQuestions?: string[];
  modelId?: string;
}

export interface DocumentExtractionInput {
  vehicleId?: string;
  documentTypeHint?: string;
  imageBase64: string;
  mimeType: string;
  locale?: 'en' | 'si' | 'ta';
}

export interface DocumentExtraction {
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
}

export interface VehicleInspectionInput {
  vehicleId?: string;
  make?: string;
  model?: string;
  year?: number;
  images: Array<{
    base64: string;
    mimeType: string;
    category?: string;
    caption?: string;
  }>;
  inspectionPurpose: 'pre_purchase' | 'owner_check' | 'resale_prep';
  locale?: 'en' | 'si' | 'ta';
}

export interface InspectionFinding {
  category: string;
  item: string;
  severity: InspectionFindingSeverity;
  observation: string;
  recommendedAction: string | null;
  confidence: number;
}

export interface VehicleInspectionResult {
  completionPercentage: number;
  overallAssessment: string;
  findings: InspectionFinding[];
  checklistHighlights: string[];
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
}

export interface ResaleAdviceInput {
  vehicleId: string;
  make: string;
  model: string;
  variant?: string;
  manufactureYear: number;
  registrationYear?: number;
  mileage: number;
  fuelType: FuelType;
  transmission: TransmissionType;
  vehicleType: VehicleType;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  serviceHistoryCompleteness: 'complete' | 'partial' | 'minimal' | 'unknown';
  accidentDisclosed: boolean;
  previousOwnersCount?: number;
  modifications?: string[];
  tireCondition?: 'good' | 'fair' | 'replace_soon';
  documentStatusSummary?: string;
  comparableListings?: Array<{
    priceMinor: number;
    mileage: number;
    year: number;
    source?: string;
  }>;
  locale?: 'en' | 'si' | 'ta';
}

export interface ResaleAdvice {
  privateSaleRangeMinor: { min: number; max: number };
  dealerRangeMinor: { min: number; max: number };
  currency: string;
  confidence: ResaleConfidence;
  factorsIncreasingValue: string[];
  factorsReducingValue: string[];
  preparationRecommendations: string[];
  dataLimitations: string[];
  safetyNotice: string;
  modelId?: string;
}

export interface VehicleChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface VehicleChatContext {
  make?: string;
  model?: string;
  year?: number;
  odometer?: number;
  fuelType?: FuelType;
  activeIssues?: string[];
  upcomingReminders?: string[];
  recentServiceSummary?: string;
  monthlyExpenseSummary?: string;
  documentExpirySummary?: string;
}

export interface VehicleChatInput {
  vehicleId?: string;
  conversationId?: string;
  message: string;
  history?: VehicleChatMessage[];
  context?: VehicleChatContext;
  locale?: 'en' | 'si' | 'ta';
}

export interface VehicleChatResponse {
  reply: string;
  suggestedFollowUps?: string[];
  referencedVehicleData?: string[];
  limitations: string[];
  safetyNotice: string;
  modelId?: string;
}

export interface AIProvider {
  analyzeDashboardImage(input: DashboardImageInput): Promise<DashboardAnalysis>;
  analyzeVehicleSymptoms(input: SymptomAnalysisInput): Promise<SymptomAnalysis>;
  extractDocument(input: DocumentExtractionInput): Promise<DocumentExtraction>;
  inspectVehicleImages(input: VehicleInspectionInput): Promise<VehicleInspectionResult>;
  generateResaleAdvice(input: ResaleAdviceInput): Promise<ResaleAdvice>;
  chat(input: VehicleChatInput): Promise<VehicleChatResponse>;
}
