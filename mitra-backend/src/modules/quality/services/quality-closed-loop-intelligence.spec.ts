import { QualityClosedLoopIntelligenceService, DefectRootCauseCorrelation } from './quality-closed-loop-intelligence.service';

describe('QualityClosedLoopIntelligenceService (S10)', () => {
  let service: QualityClosedLoopIntelligenceService;

  beforeEach(() => {
    service = new QualityClosedLoopIntelligenceService();
  });

  it('should evaluate clean quality health when all NCRs are closed', () => {
    const defects: DefectRootCauseCorrelation[] = [
      { ncrId: 'ncr-1', defectType: 'FLASH', drawingNumber: 'DWG-001', severity: 'CRITICAL', isClosed: true },
      { ncrId: 'ncr-2', defectType: 'WARPAGE', drawingNumber: 'DWG-002', severity: 'MAJOR', isClosed: true },
    ];

    const report = service.evaluateClosedLoopHealth('proj-101', 'tenant-alpha', defects);

    expect(report.projectId).toBe('proj-101');
    expect(report.tenantId).toBe('tenant-alpha');
    expect(report.qualityHealthScore).toBe(100);
    expect(report.openCriticalNcrCount).toBe(0);
    expect(report.recurringDefectPatterns.length).toBe(0);
    expect(report.isAutonomousDecision).toBe(false);
  });

  it('should detect recurring defects and recommend DFM inspection gates for recurring defect patterns', () => {
    const defects: DefectRootCauseCorrelation[] = [
      { ncrId: 'ncr-1', defectType: 'SINK_MARK', drawingNumber: 'DWG-001', severity: 'MAJOR', isClosed: false },
      { ncrId: 'ncr-2', defectType: 'SINK_MARK', drawingNumber: 'DWG-001', severity: 'MAJOR', isClosed: false },
      { ncrId: 'ncr-3', defectType: 'SHORT_SHOT', drawingNumber: 'DWG-003', severity: 'CRITICAL', isClosed: false },
    ];

    const report = service.evaluateClosedLoopHealth('proj-102', 'tenant-alpha', defects);

    expect(report.openCriticalNcrCount).toBe(1);
    expect(report.openMajorNcrCount).toBe(2);
    expect(report.qualityHealthScore).toBe(40); // 100 - 30 - 30 = 40
    expect(report.recurringDefectPatterns).toContain('RECURRING_DEFECT_SINK_MARK_COUNT_2');
    expect(report.recommendedDfmRules).toContain('RECOMMEND_DFM_INSPECTION_GATE_FOR_SINK_MARK');
    expect(report.isAutonomousDecision).toBe(false);
  });
});
