import { Test, TestingModule } from '@nestjs/testing';
import { EkosGraphController } from './ekos-graph.controller';
import { EkosGraphService } from '../services/ekos-graph.service';
import { EkosReconciliationService } from '../services/ekos-reconciliation.service';
import { EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosRelationType } from '../entities/ekos-graph-edge.entity';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

describe('EkosGraphController', () => {
  let controller: EkosGraphController;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'engineer@mitra.ai',
    tenantId: mockTenantId,
    role: 'ADMIN',
    permissions: [],
  };

  const mockGraphService = {
    registerNode: jest.fn(),
    recordEdge: jest.fn(),
    getLineage: jest.fn(),
    analyzeImpact: jest.fn(),
  };

  const mockReconciliationService = {
    verifyGraphIntegrity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EkosGraphController],
      providers: [
        { provide: EkosGraphService, useValue: mockGraphService },
        { provide: EkosReconciliationService, useValue: mockReconciliationService },
      ],
    }).compile();

    controller = module.get<EkosGraphController>(EkosGraphController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register node via POST /nodes', async () => {
    mockGraphService.registerNode.mockResolvedValue({ id: 'node-1' });

    const res = await controller.registerNode(
      {
        entityType: EkosEntityType.PROJECT,
        entityId: '22222222-2222-2222-2222-222222222222',
        label: 'Tooling Rev B',
      },
      mockUser,
    );

    expect(res).toEqual({ id: 'node-1' });
    expect(mockGraphService.registerNode).toHaveBeenCalledWith(
      expect.anything(),
      mockTenantId,
      mockUser,
    );
  });

  it('should record edge via POST /edges', async () => {
    mockGraphService.recordEdge.mockResolvedValue({ id: 'edge-1' });

    const res = await controller.recordEdge(
      {
        sourceEntityType: EkosEntityType.DRAWING,
        sourceEntityId: '33333333-3333-3333-3333-333333333333',
        targetEntityType: EkosEntityType.WORK_ORDER,
        targetEntityId: '44444444-4444-4444-4444-444444444444',
        relationType: EkosRelationType.REFERENCES,
      },
      mockUser,
    );

    expect(res).toEqual({ id: 'edge-1' });
    expect(mockGraphService.recordEdge).toHaveBeenCalledWith(
      expect.anything(),
      mockTenantId,
      mockUser,
    );
  });

  it('should retrieve lineage via GET /lineage/:entityType/:entityId', async () => {
    mockGraphService.getLineage.mockResolvedValue({ rootNodeId: 'node-1', nodes: [], edges: [] });

    const res = await controller.getLineage(
      EkosEntityType.PROJECT,
      '22222222-2222-2222-2222-222222222222',
      {},
      mockUser,
    );

    expect(res.rootNodeId).toBe('node-1');
  });

  it('should analyze impact via GET /impact/:entityType/:entityId', async () => {
    mockGraphService.analyzeImpact.mockResolvedValue({ blastRadiusScore: 35 });

    const res = await controller.analyzeImpact(
      EkosEntityType.DRAWING,
      '33333333-3333-3333-3333-333333333333',
      {},
      mockUser,
    );

    expect(res.blastRadiusScore).toBe(35);
  });

  it('should verify integrity via GET /integrity', async () => {
    mockReconciliationService.verifyGraphIntegrity.mockResolvedValue({ isHealthy: true });

    const res = await controller.verifyIntegrity(mockUser);

    expect(res.isHealthy).toBe(true);
  });
});
