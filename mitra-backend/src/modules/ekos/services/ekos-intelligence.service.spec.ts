import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { EkosIntelligenceService } from './ekos-intelligence.service';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge } from '../entities/ekos-graph-edge.entity';
import { EkosGraphService } from './ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('EkosIntelligenceService', () => {
  let service: EkosIntelligenceService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';

  const mockNodeRepo = {
    find: jest.fn(),
  };

  const mockEdgeRepo = {};

  const mockGraphService = {
    getLineage: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EkosIntelligenceService,
        { provide: getRepositoryToken(EkosGraphNode), useValue: mockNodeRepo },
        { provide: getRepositoryToken(EkosGraphEdge), useValue: mockEdgeRepo },
        { provide: EkosGraphService, useValue: mockGraphService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<EkosIntelligenceService>(EkosIntelligenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should aggregate project enterprise context', async () => {
    mockGraphService.getLineage.mockResolvedValue({
      nodes: [
        { entityType: EkosEntityType.PROJECT, entityId: mockProjectId, label: 'Mold Project' },
        { entityType: EkosEntityType.DRAWING, entityId: 'drw-1' },
        { entityType: EkosEntityType.WORK_ORDER, entityId: 'wo-1' },
        { entityType: EkosEntityType.NCR, entityId: 'ncr-1' },
      ],
      edges: [{ id: 'e1' }],
    });

    const ctx = await service.getProjectEnterpriseContext(mockProjectId, mockTenantId);

    expect(ctx.projectId).toBe(mockProjectId);
    expect(ctx.engineeringArtifactsCount).toBe(1);
    expect(ctx.activeWorkOrdersCount).toBe(1);
    expect(ctx.qualityIssuesCount).toBe(1);
  });

  it('should answer cross-domain question with cited entity grounding', async () => {
    mockNodeRepo.find.mockResolvedValue([
      {
        entityType: EkosEntityType.DRAWING,
        entityId: 'drw-1',
        label: 'DWG-100 Rev B',
        provenanceSource: 'ENGINEERING_WORKFLOW',
      },
    ]);

    const res = await service.queryCrossDomainQuestion(
      { query: 'Why was the tool modified in Rev B?', projectId: mockProjectId },
      mockTenantId,
    );

    expect(res.isAiInferred).toBe(true);
    expect(res.citedEntities.length).toBe(1);
    expect(res.citedEntities[0].label).toBe('DWG-100 Rev B');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EKOS_INTELLIGENCE_QUERY_EXECUTED' }),
    );
  });
});
