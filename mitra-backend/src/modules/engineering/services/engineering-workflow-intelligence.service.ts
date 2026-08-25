import { Injectable, Logger } from '@nestjs/common';

export interface WorkflowStageSummary {
  stage: 'DESIGN' | 'DETAILING' | 'REVIEW' | 'APPROVAL' | 'SUBMISSION';
  totalTasks: number;
  completedTasks: number;
  isComplete: boolean;
}

export interface EngineeringHealthReport {
  projectId: string;
  tenantId: string;
  overallHealthScore: number;
  stageSummaries: WorkflowStageSummary[];
  digitalThreadCoveragePercent: number;
  pendingEcrCount: number;
  bottlenecksDetected: string[];
  isAutonomousDecision: false;
  timestamp: string;
}

@Injectable()
export class EngineeringWorkflowIntelligenceService {
  private readonly logger = new Logger(EngineeringWorkflowIntelligenceService.name);

  /**
   * Evaluates end-to-end engineering workflow intelligence and digital thread health for a project.
   */
  evaluateProjectWorkflowHealth(
    projectId: string,
    tenantId: string,
    tasks: { stage: WorkflowStageSummary['stage']; completed: boolean }[] = [],
    bomCount: number = 0,
    bomWithCadCount: number = 0,
    pendingEcrs: number = 0
  ): EngineeringHealthReport {
    const stages: WorkflowStageSummary['stage'][] = ['DESIGN', 'DETAILING', 'REVIEW', 'APPROVAL', 'SUBMISSION'];

    const stageSummaries: WorkflowStageSummary[] = stages.map((stage) => {
      const stageTasks = tasks.filter((t) => t.stage === stage);
      const total = stageTasks.length;
      const completed = stageTasks.filter((t) => t.completed).length;
      return {
        stage,
        totalTasks: total,
        completedTasks: completed,
        isComplete: total > 0 && total === completed,
      };
    });

    const digitalThreadCoveragePercent = bomCount === 0 ? 100 : Math.round((bomWithCadCount / bomCount) * 100);

    const bottlenecksDetected: string[] = [];
    if (pendingEcrs > 3) {
      bottlenecksDetected.push('HIGH_PENDING_ECR_LOAD');
    }
    if (digitalThreadCoveragePercent < 80) {
      bottlenecksDetected.push('LOW_CAD_BOM_ALIGNMENT');
    }

    const completedStages = stageSummaries.filter((s) => s.isComplete).length;
    let overallHealthScore = 100;
    if (bottlenecksDetected.length > 0) overallHealthScore -= bottlenecksDetected.length * 15;
    if (completedStages < stages.length) overallHealthScore -= (stages.length - completedStages) * 5;
    overallHealthScore = Math.max(0, Math.min(100, overallHealthScore));

    const report: EngineeringHealthReport = {
      projectId,
      tenantId,
      overallHealthScore,
      stageSummaries,
      digitalThreadCoveragePercent,
      pendingEcrCount: pendingEcrs,
      bottlenecksDetected,
      isAutonomousDecision: false, // Mandatory platform invariant
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[WORKFLOW-INTELLIGENCE] Project=${projectId} Tenant=${tenantId} HealthScore=${overallHealthScore} ` +
      `ThreadCoverage=${digitalThreadCoveragePercent}% PendingECRs=${pendingEcrs}`
    );

    return report;
  }
}
