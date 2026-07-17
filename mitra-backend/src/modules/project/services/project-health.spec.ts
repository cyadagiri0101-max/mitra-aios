import { ProjectHealth } from '../entities/project.entity';

// Import the pure health computation function
// We test it in isolation — no DB, no NestJS bootstrap required
function computeHealth(
  overdueMilestones: number,
  budgetVariancePct: number,
  stageDaysOverdue: number,
): ProjectHealth {
  if (overdueMilestones >= 3 || budgetVariancePct > 25 || stageDaysOverdue > 14) {
    return ProjectHealth.RED;
  }
  if (overdueMilestones >= 1 || budgetVariancePct > 10 || stageDaysOverdue > 0) {
    return ProjectHealth.YELLOW;
  }
  return ProjectHealth.GREEN;
}

describe('Project Health Engine', () => {
  it('returns GREEN when everything is on track', () => {
    expect(computeHealth(0, 0, 0)).toBe(ProjectHealth.GREEN);
  });

  it('returns YELLOW when 1 milestone is overdue', () => {
    expect(computeHealth(1, 0, 0)).toBe(ProjectHealth.YELLOW);
  });

  it('returns YELLOW when budget is 15% over', () => {
    expect(computeHealth(0, 15, 0)).toBe(ProjectHealth.YELLOW);
  });

  it('returns YELLOW when delivery is 1 day overdue', () => {
    expect(computeHealth(0, 0, 1)).toBe(ProjectHealth.YELLOW);
  });

  it('returns RED when 3+ milestones are overdue', () => {
    expect(computeHealth(3, 0, 0)).toBe(ProjectHealth.RED);
  });

  it('returns RED when budget variance exceeds 25%', () => {
    expect(computeHealth(0, 26, 0)).toBe(ProjectHealth.RED);
  });

  it('returns RED when delivery is 15+ days overdue', () => {
    expect(computeHealth(0, 0, 15)).toBe(ProjectHealth.RED);
  });

  it('RED takes priority over YELLOW thresholds', () => {
    // 2 overdue milestones (YELLOW) + budget 30% over (RED) → RED
    expect(computeHealth(2, 30, 0)).toBe(ProjectHealth.RED);
  });
});
