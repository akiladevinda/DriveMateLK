import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { SubscriptionEntitlement, SubscriptionPlan } from '@/types/database';

export type EntitlementState = {
  plan: SubscriptionPlan;
  maxVehicles: number;
  maxAiScansPerMonth: number;
  maxDocumentStorageMb: number;
  familySharingEnabled: boolean;
  advancedReportsEnabled: boolean;
  isPremium: boolean;
};

export interface EntitlementProvider {
  getEntitlements(userId: string): Promise<EntitlementState>;
}

const FREE_DEFAULTS: EntitlementState = {
  plan: 'free',
  maxVehicles: 1,
  maxAiScansPerMonth: 5,
  maxDocumentStorageMb: 100,
  familySharingEnabled: false,
  advancedReportsEnabled: false,
  isPremium: false,
};

const PREMIUM_DEFAULTS: EntitlementState = {
  plan: 'premium_individual',
  maxVehicles: 10,
  maxAiScansPerMonth: 100,
  maxDocumentStorageMb: 2048,
  familySharingEnabled: true,
  advancedReportsEnabled: true,
  isPremium: true,
};

function fromRow(row: SubscriptionEntitlement): EntitlementState {
  const isPremium = row.plan !== 'free' && row.status === 'active';
  return {
    plan: row.plan,
    maxVehicles: row.max_vehicles,
    maxAiScansPerMonth: row.max_ai_scans_per_month,
    maxDocumentStorageMb: row.max_document_storage_mb,
    familySharingEnabled: row.family_sharing_enabled,
    advancedReportsEnabled: row.advanced_reports_enabled,
    isPremium,
  };
}

export class MockEntitlementProvider implements EntitlementProvider {
  private readonly overrides = new Map<string, EntitlementState>();

  setMockPlan(userId: string, plan: SubscriptionPlan): void {
    if (plan === 'free') {
      this.overrides.set(userId, FREE_DEFAULTS);
    } else {
      this.overrides.set(userId, { ...PREMIUM_DEFAULTS, plan });
    }
  }

  async getEntitlements(userId: string): Promise<EntitlementState> {
    const override = this.overrides.get(userId);
    if (override) return override;

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('subscription_entitlements')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) return fromRow(data);
    }

    return FREE_DEFAULTS;
  }
}

let provider: MockEntitlementProvider | null = null;

export function getEntitlementProvider(): MockEntitlementProvider {
  if (!provider) {
    provider = new MockEntitlementProvider();
  }
  return provider;
}

export function canAddVehicle(currentCount: number, entitlements: EntitlementState): boolean {
  return currentCount < entitlements.maxVehicles;
}
