import { Injectable, Logger } from '@nestjs/common';

export interface DefectRootCauseCorrelation {
  ncrId: string;
  defectType: string;
  drawingNumber: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  isClosed: boolean;
}

export interface QualityClosedLoopReport {
  projectId: string;
  tenantId: string;
  qualityHealthScore: number;
  openCriticalNcrCount: number;
  openMajorNcrCount: number;
  openMinorNcrCount: number;
  recurringDefectPatterns: string[];
  recommendedDfmRules: string[];
  isAutonomousDecision: false;
  timestamp: string;
}

@Injectable()
export class QualityClosedLoopIntelligenceService {
  private readonly logger = new Logger(QualityClosedLoopIntelligenceService.name);

  /**
   * Evaluates quality and service closed-loop feedback into engineering design.
   */
  evaluateClosedLoopHealth(
    projectId: string,
    tenantId: string,
    defects: DefectRootCauseCorrelation[] = []
  ): QualityClosedLoopReport {
    const openDefects = defects.filter((d) => !d.isClosed);
    const openCritical = openDefects.filter((d) => d.severity === 'CRITICAL').length;
    const openMajor = openDefects.filter((d) => d.severity === 'MAJOR').length;
    const openMinor = openDefects.filter((d) => d.severity === 'MINOR').length;

    // Detect recurring defect types (occurrences >= 2)
    const defectCounts = new Map<string, number>();
    openDefects.forEach((d) => {
      defectCounts.set(d.defectType, (defectCounts.get(d.defectType) || 0) + 1);
    });

    const recurringDefectPatterns: string[] = [];
    const recommendedDfmRules: string[] = [];

    defectCounts.forEach((count, type) => {
      if (count >= 2) {
        recurringDefectPatterns.push(`RECURRING_DEFECT_${type.toUpperCase()}_COUNT_${count}`);
        recommendedDfmRules.push(`RECOMMEND_DFM_INSPECTION_GATE_FOR_${type.toUpperCase()}`);
      }
    });

    let qualityHealthScore = 100;
    qualityHealthScore -= openCritical * 30;
    qualityHealthScore -= openMajor * 15;
    qualityHealthScore -= openMinor * 5;
    qualityHealthScore = Math.max(0, Math.min(100, qualityHealthScore));

    const report: QualityClosedLoopReport = {
      projectId,
      tenantId,
      qualityHealthScore,
      openCriticalNcrCount: openCritical,
      openMajorNcrCount: openMajor,
      openMinorNcrCount: openMinor,
      recurringDefectPatterns,
      recommendedDfmRules,
      isAutonomousDecision: false, // Mandatory platform invariant
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[QUALITY-CLOSED-LOOP] Project=${projectId} Tenant=${tenantId} HealthScore=${qualityHealthScore} ` +
      `OpenCritical=${openCritical} OpenMajor=${openMajor} RecurringPatterns=${recurringDefectPatterns.length}`
    );

    return report;
  }
}
