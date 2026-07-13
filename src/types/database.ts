export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Timestamp = string;
export type Uuid = string;

export type VehicleType =
  | 'car'
  | 'suv'
  | 'van'
  | 'motorcycle'
  | 'scooter'
  | 'three_wheeler'
  | 'truck'
  | 'ev'
  | 'hybrid'
  | 'other';

export type FuelType =
  | 'petrol'
  | 'diesel'
  | 'hybrid_petrol'
  | 'hybrid_diesel'
  | 'electric'
  | 'cng'
  | 'other';

export type TransmissionType = 'manual' | 'automatic' | 'cvt' | 'dct' | 'other';

export type OdometerUnit = 'km' | 'mi';

export type OwnershipType = 'owned' | 'leased' | 'financed' | 'company';

export type FinancingStatus = 'none' | 'active' | 'settled';

export type DocumentType =
  | 'registration_certificate'
  | 'insurance_certificate'
  | 'revenue_licence'
  | 'emission_certificate'
  | 'lease_agreement'
  | 'service_invoice'
  | 'repair_receipt'
  | 'warranty'
  | 'tire_warranty'
  | 'battery_warranty'
  | 'driving_licence'
  | 'other';

export type DocumentStatus =
  | 'valid'
  | 'expiring_soon'
  | 'expired'
  | 'no_expiry'
  | 'pending_confirmation';

export type ReminderType =
  | 'insurance'
  | 'revenue_licence'
  | 'emission_test'
  | 'service'
  | 'engine_oil'
  | 'filters'
  | 'tires'
  | 'brake_inspection'
  | 'battery'
  | 'lease_payment'
  | 'warranty'
  | 'custom';

export type ReminderStatus = 'pending' | 'snoozed' | 'completed' | 'dismissed' | 'overdue';

export type ExpenseCategory =
  | 'fuel'
  | 'service'
  | 'repair'
  | 'insurance'
  | 'revenue_licence'
  | 'emission_test'
  | 'tires'
  | 'battery'
  | 'parking'
  | 'highway_toll'
  | 'cleaning'
  | 'accessories'
  | 'modification'
  | 'leasing'
  | 'inspection'
  | 'roadside_assistance'
  | 'other';

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export type MaintenanceScheduleStatus = 'pending' | 'due_soon' | 'overdue' | 'completed';

export type IssueSeverity = 'informational' | 'attention' | 'urgent' | 'critical';

export type IssueStatus = 'open' | 'monitoring' | 'resolved' | 'dismissed';

export type VehicleMemberRole = 'owner' | 'manager' | 'driver' | 'viewer' | 'emergency_only';

export type ServiceRequestStatus =
  | 'draft'
  | 'submitted'
  | 'quoted'
  | 'accepted'
  | 'cancelled'
  | 'expired';

export type GarageBookingStatus =
  | 'requested'
  | 'quote_received'
  | 'confirmed'
  | 'vehicle_received'
  | 'inspection_in_progress'
  | 'awaiting_approval'
  | 'repair_in_progress'
  | 'ready_for_collection'
  | 'completed'
  | 'cancelled';

export type RoadsideRequestType =
  | 'towing'
  | 'flat_tire'
  | 'battery_jump'
  | 'fuel_delivery'
  | 'lockout'
  | 'mechanical_breakdown'
  | 'accident'
  | 'other';

export type RoadsideRequestStatus =
  | 'requested'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type SubscriptionPlan = 'free' | 'premium_individual' | 'premium_family';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';

export type TimelineEventType =
  | 'vehicle_added'
  | 'document_uploaded'
  | 'fuel_entry'
  | 'expense_added'
  | 'service_completed'
  | 'maintenance_due'
  | 'warning_light_detected'
  | 'issue_reported'
  | 'issue_resolved'
  | 'insurance_renewed'
  | 'licence_renewed'
  | 'valuation_generated'
  | 'report_shared'
  | 'odometer_updated'
  | 'other';

export type AiMessageRole = 'user' | 'assistant' | 'system';

export type AiConversationType =
  | 'general'
  | 'dashboard_scan'
  | 'symptom'
  | 'inspection'
  | 'resale';

export interface ProfilesRow {
  id: Uuid;
  email: string;
  full_name: string | null;
  phone: string | null;
  preferred_language: 'en' | 'si' | 'ta';
  preferred_currency: string;
  profile_photo_url: string | null;
  home_district: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  onboarding_completed: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserSettingsRow {
  id: Uuid;
  user_id: Uuid;
  theme_mode: 'light' | 'dark' | 'system';
  language: 'en' | 'si' | 'ta';
  currency_code: string;
  notifications_enabled: boolean;
  biometric_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehiclesRow {
  id: Uuid;
  user_id: Uuid;
  nickname: string | null;
  registration_number: string;
  make: string;
  model: string;
  variant: string | null;
  manufacture_year: number;
  registration_year: number | null;
  vehicle_type: VehicleType;
  fuel_type: FuelType;
  transmission: TransmissionType;
  engine_capacity_cc: number | null;
  vin: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  color: string | null;
  current_odometer: number;
  odometer_unit: OdometerUnit;
  purchase_date: string | null;
  purchase_price_minor: number | null;
  purchase_currency: string;
  ownership_type: OwnershipType;
  financing_status: FinancingStatus;
  previous_owners_count: number | null;
  notes: string | null;
  main_image_url: string | null;
  is_primary: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehicleDocumentsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  document_type: DocumentType;
  title: string;
  provider: string | null;
  reference_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  amount_minor: number | null;
  currency: string;
  owner_name: string | null;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  status: DocumentStatus;
  extraction_confirmed: boolean;
  extracted_data: Json | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DocumentRemindersRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  document_id: Uuid | null;
  reminder_type: ReminderType;
  title: string;
  due_date: string | null;
  due_odometer: number | null;
  notify_days_before: number[];
  status: ReminderStatus;
  snoozed_until: Timestamp | null;
  completed_at: Timestamp | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface FuelEntriesRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  entry_date: string;
  odometer: number;
  litres: number;
  total_amount_minor: number;
  price_per_litre_minor: number | null;
  currency: string;
  fuel_type: FuelType;
  fuel_station: string | null;
  is_full_tank: boolean;
  receipt_storage_path: string | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ExpensesRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  category: ExpenseCategory;
  title: string;
  expense_date: string;
  amount_minor: number;
  currency: string;
  odometer: number | null;
  vendor: string | null;
  receipt_storage_path: string | null;
  notes: string | null;
  linked_service_id: Uuid | null;
  linked_fuel_entry_id: Uuid | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ServiceRecordsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  service_date: string;
  odometer: number;
  garage_id: Uuid | null;
  garage_name: string | null;
  service_type: string;
  labour_cost_minor: number;
  parts_cost_minor: number;
  other_cost_minor: number;
  total_cost_minor: number;
  currency: string;
  invoice_storage_path: string | null;
  notes: string | null;
  warranty_until: string | null;
  next_service_date: string | null;
  next_service_odometer: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ServiceItemsRow {
  id: Uuid;
  service_record_id: Uuid;
  work_performed: string;
  part_name: string | null;
  part_brand: string | null;
  part_number: string | null;
  quantity: number;
  unit_cost_minor: number;
  warranty_expiry: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehicleMaintenanceSchedulesRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  maintenance_type: string;
  due_date: string | null;
  due_odometer: number | null;
  repeat_interval_months: number | null;
  repeat_interval_km: number | null;
  priority: MaintenancePriority;
  status: MaintenanceScheduleStatus;
  notes: string | null;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MaintenanceRemindersRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  schedule_id: Uuid | null;
  reminder_type: ReminderType;
  title: string;
  due_date: string | null;
  due_odometer: number | null;
  status: ReminderStatus;
  snoozed_until: Timestamp | null;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehicleHealthScoresRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  total_score: number;
  status_label: string;
  factor_breakdown: Json;
  recommended_actions: string[];
  disclaimer: string;
  calculated_at: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehicleTimelineEventsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  event_type: TimelineEventType;
  title: string;
  description: string | null;
  metadata: Json | null;
  occurred_at: Timestamp;
  created_at: Timestamp;
}

export interface DashboardScansRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  image_storage_path: string;
  dashboard_message: string | null;
  analysis_result: Json;
  ai_model: string | null;
  issue_id: Uuid | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AiConversationsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid | null;
  conversation_type: AiConversationType;
  title: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AiMessagesRow {
  id: Uuid;
  conversation_id: Uuid;
  role: AiMessageRole;
  content: string;
  metadata: Json | null;
  created_at: Timestamp;
}

export interface VehicleIssuesRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  source: 'dashboard_scan' | 'symptom_analysis' | 'manual' | 'inspection' | 'obd';
  dashboard_scan_id: Uuid | null;
  ai_analysis: Json | null;
  resolved_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GaragesRow {
  id: Uuid;
  owner_user_id: Uuid | null;
  business_name: string;
  description: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'demo';
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  supported_vehicle_types: VehicleType[];
  supported_makes: string[];
  service_categories: string[];
  opening_hours: Json | null;
  rating: number | null;
  review_count: number;
  emergency_support: boolean;
  mobile_service: boolean;
  insurance_affiliations: string[];
  price_range: 'budget' | 'mid' | 'premium' | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GarageFavoritesRow {
  id: Uuid;
  user_id: Uuid;
  garage_id: Uuid;
  created_at: Timestamp;
}

export interface ServiceRequestsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  service_category: string;
  problem_description: string;
  preferred_date: string | null;
  preferred_district: string | null;
  status: ServiceRequestStatus;
  ai_report_id: Uuid | null;
  issue_id: Uuid | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GarageQuotesRow {
  id: Uuid;
  service_request_id: Uuid;
  garage_id: Uuid;
  inspection_fee_minor: number | null;
  labour_estimate_min_minor: number;
  labour_estimate_max_minor: number;
  parts_estimate_min_minor: number;
  parts_estimate_max_minor: number;
  total_estimate_min_minor: number;
  total_estimate_max_minor: number;
  currency: string;
  earliest_appointment: string | null;
  warranty_days: number | null;
  notes: string | null;
  valid_until: string | null;
  terms: string | null;
  is_estimate: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GarageBookingsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  garage_id: Uuid;
  service_request_id: Uuid | null;
  quote_id: Uuid | null;
  status: GarageBookingStatus;
  scheduled_at: Timestamp | null;
  notes: string | null;
  invoice_storage_path: string | null;
  service_record_id: Uuid | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RoadsideProvidersRow {
  id: Uuid;
  name: string;
  description: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  district: string;
  latitude: number;
  longitude: number;
  service_types: RoadsideRequestType[];
  is_verified: boolean;
  is_demo: boolean;
  rating: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RoadsideRequestsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  provider_id: Uuid | null;
  request_type: RoadsideRequestType;
  status: RoadsideRequestStatus;
  latitude: number;
  longitude: number;
  address: string | null;
  notes: string | null;
  assigned_at: Timestamp | null;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehicleValuationsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  private_sale_min_minor: number;
  private_sale_max_minor: number;
  dealer_min_minor: number;
  dealer_max_minor: number;
  currency: string;
  confidence: 'low' | 'medium' | 'high';
  positive_factors: string[];
  negative_factors: string[];
  preparation_recommendations: string[];
  limitations: string[];
  input_snapshot: Json;
  created_at: Timestamp;
}

export interface VehicleReportSharesRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  token_hash: string;
  included_sections: string[];
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  view_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehicleMembersRow {
  id: Uuid;
  vehicle_id: Uuid;
  user_id: Uuid;
  role: VehicleMemberRole;
  permissions: Json;
  invited_by: Uuid | null;
  accepted_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface VehicleInvitationsRow {
  id: Uuid;
  vehicle_id: Uuid;
  invited_by: Uuid;
  invitee_email: string;
  role: VehicleMemberRole;
  token_hash: string;
  expires_at: Timestamp;
  accepted_at: Timestamp | null;
  revoked_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface InsurancePoliciesRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  insurer_name: string;
  policy_number: string;
  coverage_type: string | null;
  premium_minor: number | null;
  currency: string;
  start_date: string;
  expiry_date: string;
  contact_phone: string | null;
  contact_email: string | null;
  document_id: Uuid | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type InsuranceClaimStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'closed';

export interface InsuranceClaimsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  policy_id: Uuid | null;
  claim_number: string | null;
  incident_date: string;
  description: string;
  status: InsuranceClaimStatus;
  claimed_amount_minor: number | null;
  approved_amount_minor: number | null;
  currency: string;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface LeaseRecordsRow {
  id: Uuid;
  user_id: Uuid;
  vehicle_id: Uuid;
  provider_name: string;
  original_price_minor: number;
  down_payment_minor: number;
  financed_amount_minor: number;
  currency: string;
  start_date: string;
  term_months: number;
  monthly_payment_minor: number;
  interest_rate_percent: number | null;
  remaining_instalments: number | null;
  official_settlement_minor: number | null;
  estimated_remaining_minor: number | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type LeasePaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';

export interface LeasePaymentsRow {
  id: Uuid;
  lease_record_id: Uuid;
  due_date: string;
  paid_date: string | null;
  amount_minor: number;
  currency: string;
  status: LeasePaymentStatus;
  reference_number: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SubscriptionEntitlementsRow {
  id: Uuid;
  user_id: Uuid;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  max_vehicles: number;
  max_ai_scans_per_month: number;
  max_document_storage_mb: number;
  family_sharing_enabled: boolean;
  advanced_reports_enabled: boolean;
  valid_from: Timestamp;
  valid_until: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type DbRow<T> = T & Record<string, unknown>;
type TableDef<T> = {
  Row: DbRow<T>;
  Insert: Partial<T> & Record<string, unknown>;
  Update: Partial<T> & Record<string, unknown>;
  Relationships: [];
};

export type Profile = ProfilesRow;
export type UserSettings = UserSettingsRow;
export type Vehicle = VehiclesRow;
export type VehicleDocument = VehicleDocumentsRow;
export type DocumentReminder = DocumentRemindersRow;
export type FuelEntry = FuelEntriesRow;
export type Expense = ExpensesRow;
export type ServiceRecord = ServiceRecordsRow;
export type ServiceItem = ServiceItemsRow;
export type VehicleMaintenanceSchedule = VehicleMaintenanceSchedulesRow;
export type MaintenanceReminder = MaintenanceRemindersRow;
export type VehicleHealthScore = VehicleHealthScoresRow;
export type VehicleTimelineEvent = VehicleTimelineEventsRow;
export type DashboardScan = DashboardScansRow;
export type AiConversation = AiConversationsRow;
export type AiMessage = AiMessagesRow;
export type VehicleIssue = VehicleIssuesRow;
export type Garage = GaragesRow;
export type GarageFavorite = GarageFavoritesRow;
export type ServiceRequest = ServiceRequestsRow;
export type GarageQuote = GarageQuotesRow;
export type GarageBooking = GarageBookingsRow;
export type RoadsideProvider = RoadsideProvidersRow;
export type RoadsideRequest = RoadsideRequestsRow;
export type VehicleValuation = VehicleValuationsRow;
export type VehicleReportShare = VehicleReportSharesRow;
export type VehicleMember = VehicleMembersRow;
export type VehicleInvitation = VehicleInvitationsRow;
export type InsurancePolicy = InsurancePoliciesRow;
export type InsuranceClaim = InsuranceClaimsRow;
export type LeaseRecord = LeaseRecordsRow;
export type LeasePayment = LeasePaymentsRow;
export type SubscriptionEntitlement = SubscriptionEntitlementsRow;

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfilesRow>;
      user_settings: TableDef<UserSettingsRow>;
      vehicles: TableDef<VehiclesRow>;
      vehicle_documents: TableDef<VehicleDocumentsRow>;
      document_reminders: TableDef<DocumentRemindersRow>;
      fuel_entries: TableDef<FuelEntriesRow>;
      expenses: TableDef<ExpensesRow>;
      service_records: TableDef<ServiceRecordsRow>;
      service_items: TableDef<ServiceItemsRow>;
      vehicle_maintenance_schedules: TableDef<VehicleMaintenanceSchedulesRow>;
      maintenance_reminders: TableDef<MaintenanceRemindersRow>;
      vehicle_health_scores: TableDef<VehicleHealthScoresRow>;
      vehicle_timeline_events: TableDef<VehicleTimelineEventsRow>;
      dashboard_scans: TableDef<DashboardScansRow>;
      ai_conversations: TableDef<AiConversationsRow>;
      ai_messages: TableDef<AiMessagesRow>;
      vehicle_issues: TableDef<VehicleIssuesRow>;
      garages: TableDef<GaragesRow>;
      garage_favorites: TableDef<GarageFavoritesRow>;
      service_requests: TableDef<ServiceRequestsRow>;
      garage_quotes: TableDef<GarageQuotesRow>;
      garage_bookings: TableDef<GarageBookingsRow>;
      roadside_providers: TableDef<RoadsideProvidersRow>;
      roadside_requests: TableDef<RoadsideRequestsRow>;
      vehicle_valuations: TableDef<VehicleValuationsRow>;
      vehicle_report_shares: TableDef<VehicleReportSharesRow>;
      vehicle_members: TableDef<VehicleMembersRow>;
      vehicle_invitations: TableDef<VehicleInvitationsRow>;
      insurance_policies: TableDef<InsurancePoliciesRow>;
      insurance_claims: TableDef<InsuranceClaimsRow>;
      lease_records: TableDef<LeaseRecordsRow>;
      lease_payments: TableDef<LeasePaymentsRow>;
      subscription_entitlements: TableDef<SubscriptionEntitlementsRow>;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_own_vehicle: {
        Args: { payload: Json };
        Returns: Tables<'vehicles'>;
      };
      user_can_access_vehicle: {
        Args: { p_vehicle_id: string };
        Returns: boolean;
      };
      user_can_manage_vehicle: {
        Args: { p_vehicle_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
