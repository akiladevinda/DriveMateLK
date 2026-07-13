import { describe, expect, it } from 'vitest';

import { calculateHealthScore, HEALTH_SCORE_DISCLAIMER } from '@/services/health-score';

const healthyInput = {
  documentsValidRatio: 1,
  documentsExpiringSoonCount: 0,
  documentsExpiredCount: 0,
  maintenanceOnTimeRatio: 1,
  overdueMaintenanceCount: 0,
  unresolvedWarningCount: 0,
  activeUrgentIssueCount: 0,
  tireStatus: 'good' as const,
  batteryStatus: 'good' as const,
  serviceConsistencyScore: 0.9,
  odometerUpdatedWithinDays: 7,
  userReportedCondition: 'good' as const,
};

describe('calculateHealthScore', () => {
  it('returns high score for well-maintained vehicle', () => {
    const result = calculateHealthScore(healthyInput);
    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.statusLabel).toMatch(/Excellent|Good/);
    expect(result.disclaimer).toBe(HEALTH_SCORE_DISCLAIMER);
  });

  it('penalizes expired documents and overdue maintenance', () => {
    const result = calculateHealthScore({
      ...healthyInput,
      documentsValidRatio: 0.5,
      documentsExpiredCount: 2,
      overdueMaintenanceCount: 3,
      activeUrgentIssueCount: 2,
    });
    expect(result.totalScore).toBeLessThan(healthyInput.documentsValidRatio * 100);
    expect(result.recommendedActions.some((a) => a.includes('expired'))).toBe(true);
  });

  it('includes factor breakdown covering all weighted keys', () => {
    const result = calculateHealthScore(healthyInput);
    expect(result.factors.length).toBe(10);
    expect(result.factors.every((f) => f.score <= f.maxScore)).toBe(true);
  });
});
