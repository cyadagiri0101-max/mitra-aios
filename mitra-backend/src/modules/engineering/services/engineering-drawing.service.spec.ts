import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EngineeringDrawingService } from './engineering-drawing.service';
import { EngineeringDrawing, DrawingType } from '../entities/engineering-drawing.entity';
import { EngineeringDrawingRevision } from '../entities/engineering-drawing-revision.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';

describe('EngineeringDrawingService', () => {
  let service: EngineeringDrawingService;
  let drawingRepo: any;
  let revisionRepo: any;

  const drawing = {
    id: 'd-1',
    drawingNumber: 'DRW-2026-0001',
    title: 'Core Insert',
    drawingType: DrawingType.PART,
    projectId: 'p-1',
    currentRevision: 'A',
    status: 'DRAFT',
    workflowInstanceId: null,
    checkedOutBy: null,
    checkedOutAt: null,
    tenantId: 't-1',
    createdAt: new Date(),
    deletedAt: null,
  };

  const makeQb = (rows: any[] = [], count = rows.length) => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, count]),
    };
    return qb;
  };

  beforeEach(async () => {
    drawingRepo = {
      createQueryBuilder: jest.fn(() => makeQb([drawing])),
      findOne: jest.fn().mockResolvedValue({ ...drawing }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((d: any) => Promise.resolve({ ...d, id: d.id ?? 'd-9' })),
      create: jest.fn((d: any) => ({ ...d })),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    revisionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((r: any) => Promise.resolve({ ...r, id: 'r-9' })),
      create: jest.fn((r: any) => ({ ...r })),
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringDrawingService,
        { provide: getRepositoryToken(EngineeringDrawing), useValue: drawingRepo },
        { provide: getRepositoryToken(EngineeringDrawingRevision), useValue: revisionRepo },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb({})) } },
        { provide: WorkflowService, useValue: { createInstance: jest.fn(), findInstanceByEntity: jest.fn() } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
        { provide: EngineeringEventBus, useValue: { publish: jest.fn(), subscribe: jest.fn(() => () => undefined) } },
        { provide: EngineeringAiHooksService, useValue: { dispatchEvent: jest.fn().mockResolvedValue({ dispatched: 0 }), findByCodes: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get(EngineeringDrawingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a drawing with generated number', async () => {
    const result = await service.create({ projectId: 'p-1', title: 'Plate' }, 'u-1', 't-1');
    expect(result.drawingNumber).toMatch(/^DRW-\d{4}-\d{4}$/);
    expect(result.projectId).toBe('p-1');
    expect(result.status).toBe('DRAFT');
  });

  it('rejects creation without projectId (no orphans)', async () => {
    await expect(service.create({ title: 'Plate' }, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
  });

  it('throws NotFound for unknown drawing', async () => {
    drawingRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing', 't-1')).rejects.toThrow(NotFoundException);
  });

  it('checkout then checkin appends a revision and locks ownership', async () => {
    const checkedOut = { ...drawing, checkedOutBy: 'u-1', checkedOutAt: new Date() };
    drawingRepo.findOne.mockResolvedValue(checkedOut);
    drawingRepo.save.mockImplementation((d: any) => Promise.resolve({ ...d, id: d.id ?? 'd-9' }));

    await service.checkOut('d-1', {}, 'u-1', 't-1');
    expect(drawingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ checkedOutBy: 'u-1' }));

    const result = await service.checkIn('d-1', { revision: 'B', changeSummary: 'Fixed fillet' }, 'u-1', 't-1');
    expect(result.revision.revision).toBe('B');
    expect(result.drawing.currentRevision).toBe('B');
  });

  it('denies checkin while checked out by another user', async () => {
    const checkedOut = { ...drawing, checkedOutBy: 'u-2', checkedOutAt: new Date() };
    drawingRepo.findOne.mockResolvedValue(checkedOut);
    await expect(service.checkIn('d-1', { revision: 'B' }, 'u-1', 't-1')).rejects.toThrow(ConflictException);
  });

  describe('tenant isolation', () => {
    it('rejects tenantless creation (fail closed)', async () => {
      await expect(service.create({ projectId: 'p-1', title: 'Plate' }, 'u-1', null)).rejects.toThrow(ForbiddenException);
      expect(drawingRepo.save).not.toHaveBeenCalled();
    });

    it('writes the caller tenant onto the created drawing', async () => {
      const result = await service.create({ projectId: 'p-1', title: 'Plate' }, 'u-1', 't-1');
      expect(result.tenantId).toBe('t-1');
    });

    it('rejects tenantless findOne (fail closed)', async () => {
      await expect(service.findOne('d-1', null)).rejects.toThrow(ForbiddenException);
      expect(drawingRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns 404 for another tenant\'s drawing and never mutates it', async () => {
      drawingRepo.findOne.mockResolvedValue(null);
      await expect(service.update('d-x', { title: 'hijacked' }, 'u-1', 't-2')).rejects.toThrow(NotFoundException);
      expect(drawingRepo.save).not.toHaveBeenCalled();
    });

    it('scopes the lookup to the caller tenant', async () => {
      await service.findOne('d-1', 't-1');
      expect(drawingRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'd-1', tenantId: 't-1' }) }),
      );
    });
  });
});
