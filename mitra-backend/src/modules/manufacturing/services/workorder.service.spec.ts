import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderService } from './workorder.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkOrder } from '../entities/workorder.entity';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const makeRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: any) => d),
});

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let repo: ReturnType<typeof makeRepo>;
  let dsQuery: jest.Mock;

  beforeEach(async () => {
    repo = makeRepo();
    dsQuery = jest.fn().mockImplementation((_sql: string, params: unknown[]) =>
      Promise.resolve(
        params[0] === 'bi-1'
          ? [{ id: 'bi-1', bom_id: 'b-1', status: 'RELEASED' }]
          : [{ id: params[0], status: 'RELEASED' }],
      ),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderService,
        { provide: getRepositoryToken(WorkOrder), useValue: repo },
        { provide: DataSource, useValue: { query: dsQuery } },
      ],
    }).compile();
    service = module.get<WorkOrderService>(WorkOrderService);
    jest.clearAllMocks();
  });

  it('persists a work order with a generated number', async () => {
    repo.save.mockResolvedValue({ id: 'wo-1', woNumber: 'WO-1', status: 'DRAFT' });
    const result = await service.create({ plannedQty: 10 }, 'user-1', 'tenant-1');
    expect(result.woNumber).toBe('WO-1');
  });

  it('validates artifact links scoped to the caller\'s tenant', async () => {
    repo.save.mockResolvedValue({ id: 'wo-1', woNumber: 'WO-1' });
    await service.create(
      { drawingId: 'd-1', bomId: 'b-1', bomItemId: 'bi-1', routingId: 'r-1', processPlanId: 'pp-1' },
      'user-1',
      'tenant-1',
    );
    expect(dsQuery).toHaveBeenCalledTimes(5);
    for (const [sql, params] of dsQuery.mock.calls) {
      expect(sql).toContain('tenant_id = $2');
      expect(sql).toContain('deleted_at IS NULL');
      expect(params).toEqual([expect.any(String), 'tenant-1']);
    }
  });

  it('rejects a cross-tenant artifact link as not found', async () => {
    dsQuery.mockResolvedValue([]);
    await expect(service.create({ drawingId: 'd-other' }, 'user-1', 'tenant-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects non-RELEASED artifact links', async () => {
    dsQuery.mockResolvedValue([{ id: 'd-1', status: 'DRAFT' }]);
    await expect(service.create({ drawingId: 'd-1' }, 'user-1', 'tenant-1')).rejects.toThrow(/RELEASED/);
  });

  it('rejects tenantless create before any artifact read (fail closed)', async () => {
    await expect(service.create({ drawingId: 'd-1' }, 'user-1', null)).rejects.toThrow(ForbiddenException);
    expect(dsQuery).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('assertReleased passes the tenant scope through', async () => {
    await service.assertReleased('engineering_routings', 'r-1', 'Routing', 'tenant-1');
    expect(dsQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id = $2'), ['r-1', 'tenant-1']);
  });
});