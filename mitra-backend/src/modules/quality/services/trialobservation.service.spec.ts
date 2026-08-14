import { Test, TestingModule } from '@nestjs/testing';
import { TrialObservationService } from './trialobservation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrialObservation } from '../entities/trialobservation.entity';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const makeRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  save: jest.fn(),
  create: jest.fn((d: any) => d),
});

describe('TrialObservationService', () => {
  let service: TrialObservationService;
  let repo: ReturnType<typeof makeRepo>;
  let dsQuery: jest.Mock;

  beforeEach(async () => {
    repo = makeRepo();
    dsQuery = jest.fn().mockResolvedValue([{ id: 'x' }]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrialObservationService,
        { provide: getRepositoryToken(TrialObservation), useValue: repo },
        { provide: DataSource, useValue: { query: dsQuery } },
      ],
    }).compile();
    service = module.get<TrialObservationService>(TrialObservationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne()', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('returns entity when found', async () => {
      const entity = { id: 'obs-1', observation: 'Flash near gate', tenantId: 'tenant-1' };
      repo.findOne.mockResolvedValue(entity);
      const result = await service.findOne('obs-1', 'tenant-1');
      expect(result).toEqual(entity);
    });
  });

  describe('create()', () => {
    it('persists a trial observation with createdBy', async () => {
      const data = { observation: 'Sink mark on side wall', severity: 'HIGH' };
      const saved = { id: 'obs-new', ...data, createdBy: 'user-1' };
      repo.save.mockResolvedValue(saved);
      await service.create(data, 'user-1', 'tenant-1');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ observation: 'Sink mark on side wall', createdBy: 'user-1' }),
      );
    });

    it('validates artifact links scoped to the caller\'s tenant', async () => {
      repo.save.mockResolvedValue({ id: 'obs-new' });
      await service.create(
        { observation: 'o', drawingId: 'd-1', bomItemId: 'bi-1', routingId: 'r-1' },
        'user-1', 'tenant-1',
      );
      expect(dsQuery).toHaveBeenCalledTimes(3);
      for (const [sql, params] of dsQuery.mock.calls) {
        expect(sql).toContain('tenant_id = $2');
        expect(params).toEqual([expect.any(String), 'tenant-1']);
      }
    });

    it('rejects tenantless create before any artifact read (fail closed)', async () => {
      await expect(
        service.create({ observation: 'o', drawingId: 'd-1' }, 'user-1', null),
      ).rejects.toThrow(ForbiddenException);
      expect(dsQuery).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('returns paginated results', async () => {
      repo.findAndCount.mockResolvedValue([[{ id: 'obs-1' }], 1]);
      const result = await service.findAll('tenant-1', 1, 20);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });
});
