export const HEALTH_SCORE_DISCLAIMER =
  'This score is an app-generated maintenance and ownership indicator. It does not prove mechanical roadworthiness or legal fitness for use on Sri Lankan roads.';

export type HealthScoreFactorKey =
  | 'documents_valid'
  | 'maintenance_completed'
  | 'overdue_maintenance'
  | 'unresolved_warnings'
  | 'active_urgent_issues'
  | 'tire_status'
  | 'battery_status'
  | 'service_consistency'
  | 'odometer_freshness'
  | 'user_reported_condition';

export type HealthScoreFactor = {
  key: HealthScoreFactorKey;
  label: string;
  score: number;
  maxScore: number;
  status: 'good' | 'attention' | 'critical' | 'unknown';
  detail: string;
};

export type HealthScoreInput = {
  documentsValidRatio: number;
  documentsExpiringSoonCount: number;
  documentsExpiredCount: number;
  maintenanceOnTimeRatio: number;
  overdueMaintenanceCount: number;
  unresolvedWarningCount: number;
  activeUrgentIssueCount: number;
  tireStatus: 'good' | 'fair' | 'replace_soon' | 'unknown';
  batteryStatus: 'good' | 'fair' | 'replace_soon' | 'unknown';
  serviceConsistencyScore: number;
  odometerUpdatedWithinDays: number | null;
  userReportedCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
};

export type HealthScoreResult = {
  totalScore: number;
  statusLabel: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | 'Critical';
  factors: HealthScoreFactor[];
  recommendedActions: string[];
  disclaimer: string;
};

const FACTOR_WEIGHTS: Record<HealthScoreFactorKey, number> = {
  documents_valid: 15,
  maintenance_completed: 15,
  overdue_maintenance: 12,
  unresolved_warnings: 12,
  active_urgent_issues: 12,
  tire_status: 8,
  battery_status: 8,
  service_consistency: 8,
  odometer_freshness: 5,
  user_reported_condition: 5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ratioScore(ratio: number, maxScore: number): number {
  return Math.round(clamp(ratio, 0, 1) * maxScore);
}

function conditionScore(
  value: HealthScoreInput['tireStatus'],
  maxScore: number,
): { score: number; status: HealthScoreFactor['status']; detail: string } {
  switch (value) {
    case 'good':
      return { score: maxScore, status: 'good', detail: 'Reported in good condition.' };
    case 'fair':
      return {
        score: Math.round(maxScore * 0.65),
        status: 'attention',
        detail: 'Monitor wear; replacement may be needed soon.',
      };
    case 'replace_soon':
      return { score: Math.round(maxScore * 0.25), status: 'critical', detail: 'Replacement recommended.' };
    default:
      return { score: Math.round(maxScore * 0.5), status: 'unknown', detail: 'No recent status recorded.' };
  }
}

function statusLabelFromScore(score: number): HealthScoreResult['statusLabel'] {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Attention';
  return 'Critical';
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const factors: HealthScoreFactor[] = [];

  const documentsScore = ratioScore(input.documentsValidRatio, FACTOR_WEIGHTS.documents_valid);
  factors.push({
    key: 'documents_valid',
    label: 'Documents valid',
    score: documentsScore,
    maxScore: FACTOR_WEIGHTS.documents_valid,
    status:
      input.documentsExpiredCount > 0
        ? 'critical'
        : input.documentsExpiringSoonCount > 0
          ? 'attention'
          : 'good',
    detail:
      input.documentsExpiredCount > 0
        ? `${input.documentsExpiredCount} document(s) expired.`
        : input.documentsExpiringSoonCount > 0
          ? `${input.documentsExpiringSoonCount} document(s) expiring soon.`
          : 'Core documents appear valid.',
  });

  factors.push({
    key: 'maintenance_completed',
    label: 'Maintenance completed on time',
    score: ratioScore(input.maintenanceOnTimeRatio, FACTOR_WEIGHTS.maintenance_completed),
    maxScore: FACTOR_WEIGHTS.maintenance_completed,
    status: input.maintenanceOnTimeRatio >= 0.8 ? 'good' : 'attention',
    detail: `${Math.round(input.maintenanceOnTimeRatio * 100)}% of scheduled maintenance completed on time.`,
  });

  const overduePenalty = clamp(input.overdueMaintenanceCount * 3, 0, FACTOR_WEIGHTS.overdue_maintenance);
  factors.push({
    key: 'overdue_maintenance',
    label: 'Overdue maintenance',
    score: FACTOR_WEIGHTS.overdue_maintenance - overduePenalty,
    maxScore: FACTOR_WEIGHTS.overdue_maintenance,
    status: input.overdueMaintenanceCount > 0 ? 'critical' : 'good',
    detail:
      input.overdueMaintenanceCount > 0
        ? `${input.overdueMaintenanceCount} maintenance item(s) overdue.`
        : 'No overdue maintenance recorded.',
  });

  const warningPenalty = clamp(input.unresolvedWarningCount * 4, 0, FACTOR_WEIGHTS.unresolved_warnings);
  factors.push({
    key: 'unresolved_warnings',
    label: 'Unresolved warning-light reports',
    score: FACTOR_WEIGHTS.unresolved_warnings - warningPenalty,
    maxScore: FACTOR_WEIGHTS.unresolved_warnings,
    status: input.unresolvedWarningCount > 0 ? 'attention' : 'good',
    detail:
      input.unresolvedWarningCount > 0
        ? `${input.unresolvedWarningCount} unresolved warning report(s).`
        : 'No unresolved dashboard warnings.',
  });

  const urgentPenalty = clamp(input.activeUrgentIssueCount * 5, 0, FACTOR_WEIGHTS.active_urgent_issues);
  factors.push({
    key: 'active_urgent_issues',
    label: 'Active urgent issues',
    score: FACTOR_WEIGHTS.active_urgent_issues - urgentPenalty,
    maxScore: FACTOR_WEIGHTS.active_urgent_issues,
    status: input.activeUrgentIssueCount > 0 ? 'critical' : 'good',
    detail:
      input.activeUrgentIssueCount > 0
        ? `${input.activeUrgentIssueCount} urgent issue(s) open.`
        : 'No urgent issues open.',
  });

  const tire = conditionScore(input.tireStatus, FACTOR_WEIGHTS.tire_status);
  factors.push({
    key: 'tire_status',
    label: 'Tire status',
    score: tire.score,
    maxScore: FACTOR_WEIGHTS.tire_status,
    status: tire.status,
    detail: tire.detail,
  });

  const battery = conditionScore(input.batteryStatus, FACTOR_WEIGHTS.battery_status);
  factors.push({
    key: 'battery_status',
    label: 'Battery status',
    score: battery.score,
    maxScore: FACTOR_WEIGHTS.battery_status,
    status: battery.status,
    detail: battery.detail,
  });

  factors.push({
    key: 'service_consistency',
    label: 'Service consistency',
    score: ratioScore(input.serviceConsistencyScore, FACTOR_WEIGHTS.service_consistency),
    maxScore: FACTOR_WEIGHTS.service_consistency,
    status: input.serviceConsistencyScore >= 0.7 ? 'good' : 'attention',
    detail: 'Based on regular service intervals recorded in the app.',
  });

  const odometerFreshnessScore =
    input.odometerUpdatedWithinDays === null
      ? Math.round(FACTOR_WEIGHTS.odometer_freshness * 0.4)
      : input.odometerUpdatedWithinDays <= 14
        ? FACTOR_WEIGHTS.odometer_freshness
        : input.odometerUpdatedWithinDays <= 45
          ? Math.round(FACTOR_WEIGHTS.odometer_freshness * 0.7)
          : Math.round(FACTOR_WEIGHTS.odometer_freshness * 0.35);

  factors.push({
    key: 'odometer_freshness',
    label: 'Odometer data freshness',
    score: odometerFreshnessScore,
    maxScore: FACTOR_WEIGHTS.odometer_freshness,
    status:
      input.odometerUpdatedWithinDays !== null && input.odometerUpdatedWithinDays <= 14
        ? 'good'
        : 'attention',
    detail:
      input.odometerUpdatedWithinDays === null
        ? 'No recent odometer update recorded.'
        : `Last updated ${input.odometerUpdatedWithinDays} day(s) ago.`,
  });

  const conditionMap = {
    excellent: 1,
    good: 0.85,
    fair: 0.65,
    poor: 0.4,
    unknown: 0.55,
  } as const;

  factors.push({
    key: 'user_reported_condition',
    label: 'User-reported condition',
    score: Math.round(FACTOR_WEIGHTS.user_reported_condition * conditionMap[input.userReportedCondition]),
    maxScore: FACTOR_WEIGHTS.user_reported_condition,
    status:
      input.userReportedCondition === 'poor'
        ? 'critical'
        : input.userReportedCondition === 'fair'
          ? 'attention'
          : 'good',
    detail: `Owner reported condition: ${input.userReportedCondition.replace('_', ' ')}.`,
  });

  const rawTotal = factors.reduce((sum, factor) => sum + factor.score, 0);
  const totalScore = clamp(Math.round(rawTotal), 0, 100);

  const recommendedActions: string[] = [];
  if (input.documentsExpiredCount > 0) {
    recommendedActions.push('Renew expired documents such as insurance or revenue licence.');
  }
  if (input.documentsExpiringSoonCount > 0) {
    recommendedActions.push('Review documents expiring within the next 30 days.');
  }
  if (input.overdueMaintenanceCount > 0) {
    recommendedActions.push('Schedule overdue maintenance at a trusted garage.');
  }
  if (input.unresolvedWarningCount > 0 || input.activeUrgentIssueCount > 0) {
    recommendedActions.push('Have unresolved warning lights or urgent issues inspected professionally.');
  }
  if (input.tireStatus === 'replace_soon' || input.batteryStatus === 'replace_soon') {
    recommendedActions.push('Plan tire or battery replacement before long trips.');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Keep service records and document renewals up to date.');
  }

  return {
    totalScore,
    statusLabel: statusLabelFromScore(totalScore),
    factors,
    recommendedActions,
    disclaimer: HEALTH_SCORE_DISCLAIMER,
  };
}
