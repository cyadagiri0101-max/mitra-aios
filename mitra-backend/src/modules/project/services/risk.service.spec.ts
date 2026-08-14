import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RiskService } from './risk.service';
import { ProjectRisk, RiskStatus } from '../entities/projectrisk.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

describe('RiskService', () => {
  let service: RiskService;
  let riskRepo: any;
  let activityRepo: any;
  let eventBus: any;

  const risk = {
    id: 'r-1', projectId: 'p-1', title: 'Material shortage', impact: 4, probability: 3,
    exposure: 12, status: RiskStatus.OPEN, category: 'SUPPLY', reviewDate: null,
    deletedAt: null, closedAt: null,
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
    riskRepo = {
      createQueryBuilder: jest.fn(() => makeQb([risk])),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((r) => Promise.resolve({ ...r, id: r.id ?? 'new' })),
      create: jest.fn((r) => ({ ...r })),
    };
    activityRepo = { create: jest.fn((a) => ({ ...a })), save: jest.fn((a) => Promise.resolve(a)) };
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        { provide: getRepositoryToken(ProjectRisk), useValue: riskRepo },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
        { provide: DomainEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get(RiskService);
  });

  describe('exposure computation', () => {
    it('computes exposure = impact × probability (clamped 1..25)', async () => {
      riskRepo.save.mockImplementation((r: any) => Promise.resolve({ ...r, id: 'r-9' }));
      const saved = await service.create('p-1', { title: 'X', impact: 5, probability: 5 }, 'u-1', 'User', 't-1');
      expect(saved.exposure).toBe(25);
      const saved2 = await service.create('p-1', { title: 'Y', impact: 1, probability: 1 }, 'u-1', 'User', 't-1');
      expect(saved2.exposure).toBe(1);
    });

    it('recomputes exposure on update when impact/probability change', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk });
      const saved = await service.update('r-1', { probability: 5 }, 'u-1', 't-1');
      expect(saved.exposure).toBe(20);
    });

    it('keeps exposure when only title changes', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk });
      const saved = await service.update('r-1', { title: 'Renamed' }, 'u-1', 't-1');
      expect(saved.exposure).toBe(12);
    });
  });

  describe('create/close', () => {
    it('raises a risk and publishes RISK_CREATED', async () => {
      riskRepo.save.mockImplementation((r: any) => Promise.resolve({ ...r, id: 'r-9' }));
      const saved = await service.create('p-1', { title: 'Z' }, 'u-1', 'User', 't-1');
      expect(saved.status).toBe(RiskStatus.OPEN);
      expect(saved.raisedBy).toBe('u-1');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.RISK_CREATED }),
      );
    });

    it('closes a risk with resolution and publishes RISK_CLOSED', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk });
      riskRepo.save.mockImplementation((r: any) => Promise.resolve(r));
      const saved = await service.close('r-1', 'Sourced alternate vendor', 'u-1', 't-1');
      expect(saved.status).toBe(RiskStatus.CLOSED);
      expect(saved.closedAt).toBeInstanceOf(Date);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.RISK_CLOSED }),
      );
    });

    it('throws NotFound for missing risk', async () => {
      riskRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nope', 't-1')).rejects.toThrow(NotFoundException);
      await expect(service.close('nope', 'x', 'u-1', 't-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('dashboard', () => {
    it('aggregates status/category/level and exposure metrics', async () => {
      const now = new Date();
      riskRepo.find.mockResolvedValue([
        { ...risk, status: RiskStatus.OPEN, exposure: 20, category: 'SUPPLY' },
        { ...risk, id: 'r-2', status: RiskStatus.CLOSED, exposure: 4, category: 'QUALITY' },
        { ...risk, id: 'r-3', status: RiskStatus.OPEN, exposure: 2, category: 'SUPPLY', reviewDate: new Date(now.getTime() - 86400000) },
      ]);
      const result = await service.dashboard('p-1', 't-1');
      expect(result.total).toBe(3);
      expect(result.open).toBe(2);
      expect(result.closed).toBe(1);
      expect(result.byStatus.OPEN).toBe(2);
      expect(result.byCategory.SUPPLY).toBe(2);
      expect(result.byLevel.CRITICAL).toBe(1);
      expect(result.overdueReviews).toBe(1);
      expect(result.criticalRisks).toBe(1);
      expect(result.maxExposure).toBe(20);
    });

    it('scopes the dashboard read to the caller\'s tenant', async () => {
      riskRepo.find.mockResolvedValue([]);
      await service.dashboard('p-1', 't-1');
      expect(riskRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ projectId: 'p-1', tenantId: 't-1' }) }),
      );
    });

    it('rejects tenantless dashboard reads (fail closed)', async () => {
      await expect(service.dashboard('p-1', null)).rejects.toThrow(ForbiddenException);
      expect(riskRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('findByProject', () => {
    it('supports filters and ordering by exposure', async () => {
      riskRepo.createQueryBuilder.mockReturnValue(makeQb([risk], 1));
      const result = await service.findByProject('p-1', { status: RiskStatus.OPEN, minExposure: 5 }, 't-1');
      expect(result.total).toBe(1);
      const qb = riskRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith('r.status = :status', { status: RiskStatus.OPEN });
      expect(qb.andWhere).toHaveBeenCalledWith('r.exposure >= :minExposure', { minExposure: 5 });
    });
  });

  describe('remove', () => {
    it('soft-deletes a risk', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk });
      riskRepo.save.mockImplementation((r: any) => Promise.resolve(r));
      const result = await service.remove('r-1', 'u-1', 't-1');
      expect(result.deleted).toBe(true);
    });
  });

  describe('lifecycle guards', () => {
    it('rejects creating a risk as CLOSED', async () => {
      await expect(
        service.create('p-1', { title: 'X', status: RiskStatus.CLOSED }, 'u-1', 'User', 't-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects status changes through update — close/reopen endpoints only', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk });
      await expect(
        service.update('r-1', { status: RiskStatus.CLOSED }, 'u-1', 't-1'),
      ).rejects.toThrow(/close.*reopen/i);
    });

    it('allows same-status updates through update', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk });
      riskRepo.save.mockImplementation((r: any) => Promise.resolve({ ...r }));
      const saved = await service.update('r-1', { status: RiskStatus.OPEN, title: 'Renamed' }, 'u-1', 't-1');
      expect(saved.title).toBe('Renamed');
      expect(saved.status).toBe(RiskStatus.OPEN);
    });

    it('rejects closing an already-closed risk', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk, status: RiskStatus.CLOSED });
      await expect(service.close('r-1', 'done', 'u-1', 't-1')).rejects.toThrow(/already closed/i);
    });

    it('reopens a closed risk and clears closedAt', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk, status: RiskStatus.CLOSED, closedAt: new Date() });
      riskRepo.save.mockImplementation((r: any) => Promise.resolve({ ...r }));
      const reopened = await service.reopen('r-1', 'supplier committed again', 'u-1', 't-1');
      expect(reopened.status).toBe(RiskStatus.OPEN);
      expect(reopened.closedAt).toBeNull();
      expect(activityRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ activityType: 'risk.reopened' }),
      );
    });

    it('rejects reopening a risk that is not closed', async () => {
      riskRepo.findOne.mockResolvedValue({ ...risk });
      await expect(service.reopen('r-1', 'why', 'u-1', 't-1')).rejects.toThrow(/closed/i);
    });
  });
});
