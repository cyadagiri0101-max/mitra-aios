import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EngineeringBomService } from './engineering-bom.service';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringBomItem, BomItemType } from '../entities/engineering-bom-item.entity';
import { EngineeringBomRevision } from '../entities/engineering-bom-revision.entity';
import { EngineeringBomSubstitution } from '../entities/engineering-bom-substitution.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';

describe('EngineeringBomService', () => {
  let service: EngineeringBomService;
  let bomRepo: any;
  let itemRepo: any;
  let revisionRepo: any;
  let substitutionRepo: any;

  const bom = {
    id: 'b-1', bomNumber: 'BOM-2026-0001', name: 'Core Assembly', projectId: 'p-1',
    status: 'DRAFT', revision: 'A', tenantId: 't-1', createdAt: new Date(), deletedAt: null,
  };

  const makeItem = (over: any = {}) => ({
    id: 'i-1', bomId: 'b-1', lineNumber: 10, parentItemId: null, partNumber: 'P-001',
    partName: 'Screw', itemType: BomItemType.STANDARD_COMPONENT, quantityPer: 4, unitCost: 1.5,
    extendedCost: 6, tenantId: 't-1', deletedAt: null, ...over,
  });

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
    bomRepo = {
      createQueryBuilder: jest.fn(() => makeQb([bom])),
      findOne: jest.fn().mockResolvedValue({ ...bom }),
      find: jest.fn().mockResolvedValue([{ ...bom }]),
      save: jest.fn((b: any) => Promise.resolve({ ...b, id: b.id ?? 'b-9' })),
      create: jest.fn((b: any) => ({ ...b })),
      count: jest.fn().mockResolvedValue(0),
    };
    itemRepo = {
      find: jest.fn().mockResolvedValue([makeItem()]),
      findOne: jest.fn().mockResolvedValue(makeItem()),
      save: jest.fn((i: any) => Promise.resolve({ ...i, id: i.id ?? 'i-9' })),
      create: jest.fn((i: any) => ({ ...i })),
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
    substitutionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((s: any) => Promise.resolve({ ...s, id: 's-9' })),
      create: jest.fn((s: any) => ({ ...s })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringBomService,
        { provide: getRepositoryToken(EngineeringBom), useValue: bomRepo },
        { provide: getRepositoryToken(EngineeringBomItem), useValue: itemRepo },
        { provide: getRepositoryToken(EngineeringBomRevision), useValue: revisionRepo },
        { provide: getRepositoryToken(EngineeringBomSubstitution), useValue: substitutionRepo },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb({})) } },
        { provide: WorkflowService, useValue: { createInstance: jest.fn(), findInstanceByEntity: jest.fn() } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
        { provide: EngineeringEventBus, useValue: { publish: jest.fn(), subscribe: jest.fn(() => () => undefined) } },
        { provide: EngineeringAiHooksService, useValue: { dispatchEvent: jest.fn().mockResolvedValue({ dispatched: 0 }), findByCodes: jest.fn().mockResolvedValue([]) } },
        { provide: OutboxService, useValue: { append: jest.fn().mockResolvedValue({ id: 'outbox-1' }), relay: jest.fn().mockResolvedValue({ relayed: 0, failed: 0 }) } },
      ],
    }).compile();

    service = module.get(EngineeringBomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a BOM with generated number', async () => {
    const result = await service.create({ projectId: 'p-1', name: 'Assembly' }, 'u-1', 't-1');
    expect(result.bomNumber).toMatch(/^BOM-\d{4}-\d{4}$/);
    expect(result.projectId).toBe('p-1');
  });

  it('rejects creation without projectId (no orphans)', async () => {
    await expect(service.create({ name: 'Assembly' }, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
  });

  it('adds a child item under a parent', async () => {
    const parent = makeItem({ id: 'parent-1' });
    itemRepo.findOne.mockImplementation(async ({ where }: any) =>
      where.id === 'parent-1' ? parent : makeItem());
    const result = await service.addItem('b-1', { parentItemId: 'parent-1', partNumber: 'P-002', quantityPer: 2 }, 'u-1', 't-1');
    expect(result.parentItemId).toBe('parent-1');
    expect(result.lineNumber).toMatch(/^10\.\d+$/);
  });

  it('rolls up cost: parent cost = sum of children, leaf = qty × unit', async () => {
    itemRepo.find.mockResolvedValue([
      makeItem({ id: 'p1', lineNumber: 10, quantityPer: 1, unitCost: 0, parentItemId: null }),
      makeItem({ id: 'c1', lineNumber: 20, parentItemId: 'p1', partNumber: 'P-002', quantityPer: 3, unitCost: 2 }),
      makeItem({ id: 'c2', lineNumber: 30, parentItemId: 'p1', partNumber: 'P-003', quantityPer: 1, unitCost: 5 }),
    ]);
    const result = await service.rollupCost('b-1', 't-1');
    expect(result.totalCost).toBe(11);
    expect(bomRepo.save).toHaveBeenCalledWith(expect.objectContaining({ totalCost: 11 }));
  });

  it('throws NotFound for unknown BOM', async () => {
    bomRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing', 't-1')).rejects.toThrow(NotFoundException);
  });

  it('exports CSV with header + rows', async () => {
    const csv = await service.exportCsv('b-1', 't-1');
    expect(csv).toContain('partNumber');
    expect(csv).toContain('P-001');
  });
});
