import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DfmRuleEngineService } from './dfm-rule-engine.service';
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
import { AuditService } from '../../audit/services/audit.service';

describe('DfmRuleEngineService', () => {
  let service: DfmRuleEngineService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';
  const mockDrawingId = '33333333-3333-3333-3333-333333333333';
  const mockFindingId = '44444444-4444-4444-4444-444444444444';

  const mockFindingRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => {
      if (Array.isArray(dto)) {
        return Promise.resolve(dto.map((d, idx) => ({ id: `finding-${idx}`, ...d })));
      }
      return Promise.resolve({ id: mockFindingId, ...dto });
    }),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockFeatureService = {
    getFeaturesByDrawing: jest.fn(),
  };

  const mockEkosService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-1' }),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DfmRuleEngineService,
        { provide: getRepositoryToken(DfmFinding), useValue: mockFindingRepo },
        { provide: GeometricFeatureService, useValue: mockFeatureService },
        { provide: EkosGraphService, useValue: mockEkosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DfmRuleEngineService>(DfmRuleEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should evaluate deterministic DFM rules and trigger findings for thin walls and insufficient draft', async () => {
    mockFeatureService.getFeaturesByDrawing.mockResolvedValue([
      {
        id: 'feat-wall',
        featureType: GeometricFeatureType.WALL_THICKNESS,
        measurements: { minWallThickness: 0.9 }, // below 1.5mm standard
        geometryReference: 'WALL_THIN',
      },
      {
        id: 'feat-draft',
        featureType: GeometricFeatureType.DRAFT_ANGLE,
        measurements: { minDraftAngle: 0.4 }, // below 1.0 deg standard
        geometryReference: 'DRAFT_CORE',
      },
    ]);

    const summary = await service.evaluateDfm(
      {
        drawingId: mockDrawingId,
        projectId: mockProjectId,
        material: 'ABS',
      },
      mockTenantId,
      { id: 'engineer-1' },
    );

    expect(summary.totalFindingsCount).toBe(2);
    expect(summary.findings[0].ruleId).toBe('DFM-WALL-001');
    expect(summary.findings[1].ruleId).toBe('DFM-DRAFT-001');
    expect(mockEkosService.recordEdge).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DFM_RULES_EVALUATED' }),
    );
  });

  it('should support governed human engineering review of findings', async () => {
    mockFindingRepo.findOne.mockResolvedValue({
      id: mockFindingId,
      tenantId: mockTenantId,
      status: DfmFindingStatus.OPEN,
    });

    const reviewed = await service.reviewFinding(
      mockFindingId,
      {
        status: DfmFindingStatus.ACCEPTED,
        decisionNotes: 'Tooling design will add localized rib stiffeners.',
      },
      mockTenantId,
      { id: 'chief-engineer' },
    );

    expect(reviewed.status).toBe(DfmFindingStatus.ACCEPTED);
    expect(reviewed.humanReviewerId).toBe('chief-engineer');
    expect(reviewed.decisionNotes).toContain('localized rib stiffeners');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DFM_FINDING_REVIEWED' }),
    );
  });
});
