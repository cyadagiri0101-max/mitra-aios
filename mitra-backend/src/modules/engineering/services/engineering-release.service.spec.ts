import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  EngineeringReleaseService,
  EngineeringReleaseState,
} from './engineering-release.service';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { EngineeringBomRevision } from '../entities/engineering-bom-revision.entity';
import { EngineeringDrawingRevision } from '../entities/engineering-drawing-revision.entity';
import { EngineeringBomService } from './engineering-bom.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';

describe('EngineeringReleaseService', () => {
  let service: EngineeringReleaseService;
  let drawingRepo: any;
  let bomRepo: any;
  let bomRevisionRepo: any;
  let bomService: any;
  let auditService: any;
  let eventBus: any;

  const mockTenantId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';

  beforeEach(async () => {
    drawingRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    bomRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    bomRevisionRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 'rev-1', ...dto })),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    bomService = {
      listItems: jest.fn().mockResolvedValue([
        {
          id: 'item-1',
          lineNumber: '1',
          partNumber: 'CAV-01',
          partName: 'Cavity Insert',
          quantityPer: 2,
          quantity: 2,
          uom: 'EA',
          unitCost: 1500,
          extendedCost: 3000,
        },
      ]),
    };
    auditService = {
      logBusinessEvent: jest.fn().mockResolvedValue(undefined),
    };
    eventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringReleaseService,
        { provide: getRepositoryToken(EngineeringDrawing), useValue: drawingRepo },
        { provide: getRepositoryToken(EngineeringBom), useValue: bomRepo },
        { provide: getRepositoryToken(EngineeringRouting), useValue: {} },
        { provide: getRepositoryToken(EngineeringBomRevision), useValue: bomRevisionRepo },
        { provide: getRepositoryToken(EngineeringDrawingRevision), useValue: {} },
        { provide: EngineeringBomService, useValue: bomService },
        { provide: AuditService, useValue: auditService },
        { provide: EngineeringEventBus, useValue: eventBus },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<EngineeringReleaseService>(EngineeringReleaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('freezeArtifact', () => {
    it('should freeze a DRAFT drawing and record audit log', async () => {
      const mockDrawing = {
        id: 'drw-1',
        drawingNumber: 'DRW-2026-0001',
        status: EngineeringReleaseState.DRAFT,
        projectId: 'proj-1',
        tenantId: mockTenantId,
      };
      drawingRepo.findOne.mockResolvedValue(mockDrawing);
      drawingRepo.save.mockImplementation((d: any) => Promise.resolve(d));

      const result = await service.freezeArtifact(
        'drawing',
        'drw-1',
        'Pre-release mold base freeze',
        mockUserId,
        mockTenantId,
      );

      expect(result.status).toBe(EngineeringReleaseState.FROZEN);
      expect(result.updatedBy).toBe(mockUserId);
      expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
        'engineering.drawing.frozen',
        'EngineeringDrawing',
        'drw-1',
        mockUserId,
        expect.objectContaining({ status: EngineeringReleaseState.FROZEN }),
        undefined,
        'proj-1',
      );
    });

    it('should throw when attempting to freeze an already RELEASED artifact', async () => {
      drawingRepo.findOne.mockResolvedValue({
        id: 'drw-1',
        status: EngineeringReleaseState.RELEASED,
        tenantId: mockTenantId,
      });

      await expect(
        service.freezeArtifact('drawing', 'drw-1', undefined, mockUserId, mockTenantId),
      ).rejects.toThrow('Cannot freeze an already RELEASED drawing');
    });
  });

  describe('releaseArtifact', () => {
    it('should release a BOM, capture snapshot, and publish BOM_RELEASED event', async () => {
      const mockBom = {
        id: 'bom-1',
        bomNumber: 'BOM-2026-0001',
        name: '4-Cavity Injection Mold BOM',
        revision: 'A',
        versionNumber: 1,
        totalCost: 15000,
        status: EngineeringReleaseState.FROZEN,
        projectId: 'proj-1',
        tenantId: mockTenantId,
      };
      bomRepo.findOne.mockResolvedValue(mockBom);
      bomRepo.save.mockImplementation((b: any) => Promise.resolve(b));
      bomRevisionRepo.findOne.mockResolvedValue(null);

      const result = await service.releaseArtifact(
        'bom',
        'bom-1',
        'Final design release for manufacturing handoff',
        mockUserId,
        mockTenantId,
      );

      expect(result.status).toBe(EngineeringReleaseState.RELEASED);
      expect(result.releasedBy).toBe(mockUserId);
      expect(result.releasedAt).toBeDefined();
      expect(bomRevisionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bomId: 'bom-1',
          revision: 'A',
          totalCost: 15000,
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUserId,
          payload: expect.objectContaining({
            entityId: 'bom-1',
            status: EngineeringReleaseState.RELEASED,
          }),
        }),
      );
    });
  });

  describe('getReleaseStatus', () => {
    it('should return manufacturing ready certificate when RELEASED', async () => {
      drawingRepo.findOne.mockResolvedValue({
        id: 'drw-1',
        drawingNumber: 'DRW-2026-0001',
        currentRevision: 'B',
        versionNumber: 2,
        status: EngineeringReleaseState.RELEASED,
        approvedAt: new Date(),
        approvedBy: mockUserId,
        releasedAt: new Date(),
        releasedBy: mockUserId,
        projectId: 'proj-1',
        tenantId: mockTenantId,
      });

      const cert = await service.getReleaseStatus('drawing', 'drw-1', mockTenantId);

      expect(cert.entityType).toBe('drawing');
      expect(cert.revision).toBe('B');
      expect(cert.manufacturingReady).toBe(true);
      expect(cert.status).toBe(EngineeringReleaseState.RELEASED);
    });
  });
});
