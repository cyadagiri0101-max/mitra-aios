import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DfmFinding,
  DfmSeverity,
  DfmFindingStatus,
} from '../entities/dfm-finding.entity';
import {
  GeometricFeature,
  GeometricFeatureType,
} from '../entities/geometric-feature.entity';
import { GeometricFeatureService } from './geometric-feature.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { EkosEntityType } from '../../ekos/entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../../ekos/entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';
import {
  EvaluateDfmDto,
  ReviewDfmFindingDto,
  DfmEvaluationSummary,
} from '../dto/geometry-dfm.dto';

@Injectable()
export class DfmRuleEngineService {
  private readonly logger = new Logger(DfmRuleEngineService.name);

  // Authoritative engineering standards catalog
  private readonly standards: Record<string, any> = {
    ABS: { minWall: 1.5, minDraft: 1.0, maxRibRatio: 0.6, maxBossRatio: 0.65, maxHoleRatio: 8.0 },
    POLYCARBONATE: { minWall: 2.0, minDraft: 1.5, maxRibRatio: 0.5, maxBossRatio: 0.6, maxHoleRatio: 6.0 },
    NYLON_PA66: { minWall: 1.2, minDraft: 0.75, maxRibRatio: 0.65, maxBossRatio: 0.7, maxHoleRatio: 10.0 },
    DEFAULT: { minWall: 1.5, minDraft: 1.0, maxRibRatio: 0.6, maxBossRatio: 0.65, maxHoleRatio: 8.0 },
  };

  constructor(
    @InjectRepository(DfmFinding)
    private readonly findingRepo: Repository<DfmFinding>,
    private readonly featureService: GeometricFeatureService,
    private readonly ekosGraphService: EkosGraphService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Run deterministic DFM rule evaluation against extracted geometric features.
   */
  async evaluateDfm(
    dto: EvaluateDfmDto,
    tenantId: string,
    user?: any,
  ): Promise<DfmEvaluationSummary> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const revision = dto.drawingRevision || 'Rev A';
    const material = (dto.material || 'ABS').toUpperCase();
    const rulesConfig = this.standards[material] || this.standards.DEFAULT;

    // Fetch features extracted for this drawing revision
    const features = await this.featureService.getFeaturesByDrawing(
      dto.drawingId,
      revision,
      tenantId,
    );

    const findingsToCreate: DfmFinding[] = [];

    for (const feat of features) {
      // Rule 1: Minimum Wall Thickness Check (DFM-WALL-001)
      if (feat.featureType === GeometricFeatureType.WALL_THICKNESS) {
        const observedMinWall = Number(feat.measurements?.minWallThickness || 0);
        const thresholdMinWall = dto.customThresholds?.minWall || rulesConfig.minWall;

        if (observedMinWall > 0 && observedMinWall < thresholdMinWall) {
          findingsToCreate.push(
            this.findingRepo.create({
              tenantId,
              projectId: dto.projectId,
              drawingId: dto.drawingId,
              drawingRevision: revision,
              featureId: feat.id,
              ruleId: 'DFM-WALL-001',
              ruleVersion: '1.0',
              severity: observedMinWall < thresholdMinWall * 0.7 ? DfmSeverity.CRITICAL : DfmSeverity.WARNING,
              status: DfmFindingStatus.OPEN,
              observedValue: observedMinWall,
              expectedThreshold: thresholdMinWall,
              unit: 'mm',
              explanation: `Minimum wall thickness (${observedMinWall} mm) is below standard threshold of ${thresholdMinWall} mm for ${material}, causing high injection short-shot risk.`,
              evidenceContext: { material, featureRef: feat.geometryReference, ruleName: 'MIN_WALL_THICKNESS' },
            }),
          );
        }
      }

      // Rule 2: Minimum Draft Angle Check (DFM-DRAFT-001)
      if (feat.featureType === GeometricFeatureType.DRAFT_ANGLE) {
        const observedDraft = Number(feat.measurements?.minDraftAngle ?? 0);
        const thresholdDraft = dto.customThresholds?.minDraft || rulesConfig.minDraft;

        if (observedDraft < thresholdDraft) {
          findingsToCreate.push(
            this.findingRepo.create({
              tenantId,
              projectId: dto.projectId,
              drawingId: dto.drawingId,
              drawingRevision: revision,
              featureId: feat.id,
              ruleId: 'DFM-DRAFT-001',
              ruleVersion: '1.0',
              severity: observedDraft <= 0 ? DfmSeverity.CRITICAL : DfmSeverity.WARNING,
              status: DfmFindingStatus.OPEN,
              observedValue: observedDraft,
              expectedThreshold: thresholdDraft,
              unit: 'deg',
              explanation: `Draft angle (${observedDraft}°) is below the recommended ${thresholdDraft}° for ${material}, leading to part ejection scuffing and mold damage.`,
              evidenceContext: { material, featureRef: feat.geometryReference, ruleName: 'MIN_DRAFT_ANGLE' },
            }),
          );
        }
      }

      // Rule 3: Rib Aspect Ratio Check (DFM-RIB-001)
      if (feat.featureType === GeometricFeatureType.RIB) {
        const ribThickness = Number(feat.measurements?.ribThickness || 0);
        const nominalWall = 2.0; // standard nominal reference
        const observedRatio = ribThickness / nominalWall;
        const thresholdRatio = rulesConfig.maxRibRatio;

        if (observedRatio > thresholdRatio) {
          findingsToCreate.push(
            this.findingRepo.create({
              tenantId,
              projectId: dto.projectId,
              drawingId: dto.drawingId,
              drawingRevision: revision,
              featureId: feat.id,
              ruleId: 'DFM-RIB-001',
              ruleVersion: '1.0',
              severity: DfmSeverity.WARNING,
              status: DfmFindingStatus.OPEN,
              observedValue: observedRatio,
              expectedThreshold: thresholdRatio,
              unit: 'ratio',
              explanation: `Rib-to-wall thickness ratio (${observedRatio.toFixed(2)}) exceeds recommended maximum (${thresholdRatio}) for ${material}, risking visible cosmetic sink marks.`,
              evidenceContext: { material, featureRef: feat.geometryReference, ruleName: 'RIB_SINK_MARK_RISK' },
            }),
          );
        }
      }

      // Rule 4: Deep Hole Aspect Ratio (DFM-HOLE-001)
      if (feat.featureType === GeometricFeatureType.HOLE) {
        const depthToDia = Number(feat.measurements?.depthToDiaRatio || 0);
        const thresholdHoleRatio = rulesConfig.maxHoleRatio;

        if (depthToDia > thresholdHoleRatio) {
          findingsToCreate.push(
            this.findingRepo.create({
              tenantId,
              projectId: dto.projectId,
              drawingId: dto.drawingId,
              drawingRevision: revision,
              featureId: feat.id,
              ruleId: 'DFM-HOLE-001',
              ruleVersion: '1.0',
              severity: DfmSeverity.WARNING,
              status: DfmFindingStatus.OPEN,
              observedValue: depthToDia,
              expectedThreshold: thresholdHoleRatio,
              unit: 'ratio',
              explanation: `Hole depth-to-diameter ratio (${depthToDia.toFixed(1)}) exceeds standard tooling threshold (${thresholdHoleRatio}), causing core pin deflection and mold erosion.`,
              evidenceContext: { material, featureRef: feat.geometryReference, ruleName: 'CORE_PIN_DEFLECTION_RISK' },
            }),
          );
        }
      }

      // Rule 5: Injection Gating Location & Flow Length (DFM-GATE-001)
      if (feat.featureType === GeometricFeatureType.GATE_LOCATION) {
        const flowLengthToWall = Number(feat.measurements?.flowLengthRatio || 0);
        const maxFlowLengthRatio = 150.0;

        if (flowLengthToWall > maxFlowLengthRatio) {
          findingsToCreate.push(
            this.findingRepo.create({
              tenantId,
              projectId: dto.projectId,
              drawingId: dto.drawingId,
              drawingRevision: revision,
              featureId: feat.id,
              ruleId: 'DFM-GATE-001',
              ruleVersion: '1.0',
              severity: DfmSeverity.WARNING,
              status: DfmFindingStatus.OPEN,
              observedValue: flowLengthToWall,
              expectedThreshold: maxFlowLengthRatio,
              unit: 'L/t',
              explanation: `Flow length to thickness ratio (${flowLengthToWall.toFixed(1)}) exceeds limit (${maxFlowLengthRatio}), risking hesitation and high injection pressure.`,
              evidenceContext: { material, featureRef: feat.geometryReference, ruleName: 'INJECTION_GATING_FLOW_RISK' },
            }),
          );
        }
      }

      // Rule 6: CNC Machining Internal Corner & Tool Reach (DFM-CNC-ACCESS-001)
      if (feat.featureType === GeometricFeatureType.CNC_INTERNAL_CORNER) {
        const cornerRadius = Number(feat.measurements?.cornerRadius || 0);
        const minToolRadius = 1.0; // mm

        if (cornerRadius > 0 && cornerRadius < minToolRadius) {
          findingsToCreate.push(
            this.findingRepo.create({
              tenantId,
              projectId: dto.projectId,
              drawingId: dto.drawingId,
              drawingRevision: revision,
              featureId: feat.id,
              ruleId: 'DFM-CNC-ACCESS-001',
              ruleVersion: '1.0',
              severity: DfmSeverity.WARNING,
              status: DfmFindingStatus.OPEN,
              observedValue: cornerRadius,
              expectedThreshold: minToolRadius,
              unit: 'mm',
              explanation: `Internal corner radius (${cornerRadius} mm) is smaller than standard end-mill minimum (${minToolRadius} mm), requiring micro-tooling or EDM electrode sparking.`,
              evidenceContext: { material, featureRef: feat.geometryReference, ruleName: 'CNC_CORNER_RADIUS_CONSTRAINT' },
            }),
          );
        }
      }

      // Rule 7: Sheet Metal Minimum Bend Radius (DFM-SM-BEND-001)
      if (feat.featureType === GeometricFeatureType.SHEET_METAL_BEND) {
        const bendRadius = Number(feat.measurements?.bendRadius || 0);
        const sheetThickness = Number(feat.measurements?.sheetThickness || 1.0);
        const minBendRatio = 1.0; // 1x sheet thickness
        const observedBendRatio = sheetThickness > 0 ? bendRadius / sheetThickness : 0;

        if (observedBendRatio < minBendRatio) {
          findingsToCreate.push(
            this.findingRepo.create({
              tenantId,
              projectId: dto.projectId,
              drawingId: dto.drawingId,
              drawingRevision: revision,
              featureId: feat.id,
              ruleId: 'DFM-SM-BEND-001',
              ruleVersion: '1.0',
              severity: DfmSeverity.WARNING,
              status: DfmFindingStatus.OPEN,
              observedValue: observedBendRatio,
              expectedThreshold: minBendRatio,
              unit: 'ratio',
              explanation: `Bend radius to sheet thickness ratio (${observedBendRatio.toFixed(2)}) is below minimum (${minBendRatio}), causing outer fiber cracking during forming.`,
              evidenceContext: { material, featureRef: feat.geometryReference, ruleName: 'SHEET_METAL_BEND_CRACK_RISK' },
            }),
          );
        }
      }
    }

    const saved = await this.findingRepo.save(findingsToCreate);

    // Project DFM findings to EKOS graph
    try {
      for (const finding of saved) {
        await this.ekosGraphService.recordEdge(
          {
            sourceEntityType: EkosEntityType.CAD_MODEL,
            sourceEntityId: finding.featureId || finding.drawingId,
            sourceEntityRevision: finding.drawingRevision,
            targetEntityType: EkosEntityType.NCR, // Projects as engineering risk node
            targetEntityId: finding.id,
            relationType: EkosRelationType.OBSERVED_IN,
            provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
            confidence: 1.0,
          },
          tenantId,
        );
      }
    } catch (err: any) {
      this.logger.warn(`EKOS DFM projection non-blocking warning: ${err?.message || err}`);
    }

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'DFM_RULES_EVALUATED',
      entityType: 'DFM_EVALUATION',
      entityId: dto.drawingId,
      metadata: {
        drawingId: dto.drawingId,
        drawingRevision: revision,
        material,
        findingsGenerated: saved.length,
      },
    });

    const criticalCount = saved.filter((f) => f.severity === DfmSeverity.CRITICAL).length;
    const warningCount = saved.filter((f) => f.severity === DfmSeverity.WARNING).length;
    const advisoryCount = saved.filter((f) => f.severity === DfmSeverity.ADVISORY || f.severity === DfmSeverity.INFO).length;

    return {
      drawingId: dto.drawingId,
      drawingRevision: revision,
      material,
      processType: dto.processType || 'INJECTION_MOLDING',
      totalFindingsCount: saved.length,
      criticalCount,
      warningCount,
      advisoryCount,
      findings: saved,
    };
  }

  /**
   * Retrieve all DFM findings for a drawing.
   */
  async getFindingsByDrawing(
    drawingId: string,
    revision: string = 'Rev A',
    tenantId: string,
  ): Promise<DfmFinding[]> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    return this.findingRepo.find({
      where: { tenantId, drawingId, drawingRevision: revision },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Governed human engineering review of a DFM finding.
   */
  async reviewFinding(
    findingId: string,
    dto: ReviewDfmFindingDto,
    tenantId: string,
    user?: any,
  ): Promise<DfmFinding> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const finding = await this.findingRepo.findOne({
      where: { id: findingId, tenantId },
    });

    if (!finding) {
      throw new NotFoundException(`DFM Finding '${findingId}' not found in tenant.`);
    }

    finding.status = dto.status;
    finding.humanReviewerId = user?.id || null;
    finding.reviewedAt = new Date();
    finding.decisionNotes = dto.decisionNotes || null;

    const saved = await this.findingRepo.save(finding);

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'DFM_FINDING_REVIEWED',
      entityType: 'DFM_FINDING',
      entityId: saved.id,
      metadata: {
        status: saved.status,
        reviewerId: saved.humanReviewerId,
        decisionNotes: saved.decisionNotes,
      },
    });

    return saved;
  }
}
