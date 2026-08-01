import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProjectActivityService } from './project-activity.service';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { AiProjectionService } from './ai-projection.service';
import { ProjectDomainEventType } from '../events/project.events';

describe('ProjectActivityService', () => {
  let service: ProjectActivityService;
  let activityRepo: any;

  beforeEach(async () => {
    activityRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectActivityService,
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
      ],
    }).compile();

    service = module.get(ProjectActivityService);
  });

  it('returns paginated activity feed', async () => {
    activityRepo.findAndCount.mockResolvedValue([[{ id: 'a-1' }], 1]);
    const result = await service.findByProject('p-1', 't-1', 2, 25);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(activityRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25 }),
    );
  });

  it('caps limit at 200', async () => {
    await service.findByProject('p-1', 't-1', 1, 500);
    expect(activityRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it('throws NotFound for missing entry', async () => {
    activityRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('nope', 't-1')).rejects.toThrow(NotFoundException);
    activityRepo.findOne.mockResolvedValue({ id: 'a-1' });
    await expect(service.findOne('a-1', 't-1')).resolves.toEqual({ id: 'a-1' });
  });
});

describe('AiProjectionService', () => {
  let service: AiProjectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiProjectionService],
    }).compile();
    service = module.get(AiProjectionService);
  });

  it('returns NOT_CONFIGURED envelope when no provider registered', async () => {
    const risk = await service.predictRisk('p-1', {});
    expect(risk.available).toBe(false);
    expect(risk.provider).toBe('none');

    const delay = await service.predictDelay('p-1', {});
    expect(delay.available).toBe(false);

    const res = await service.recommendResources('p-1', {});
    expect(res.available).toBe(false);

    const similar = await service.findSimilarProjects('p-1', {});
    expect(similar.available).toBe(false);

    const opt = await service.optimizeTimeline('p-1', {});
    expect(opt.available).toBe(false);

    const summary = await service.summarizeMeetings('p-1', {});
    expect(summary.available).toBe(false);
  });

  it('delegates to the registered provider (last one wins)', async () => {
    const provider = {
      name: 'FakeAI',
      predictRisk: jest.fn().mockResolvedValue({
        predictedRiskLevel: 'HIGH', predictedDelayDays: 12, confidence: 0.8, reasons: ['x'],
      }),
      recommendResources: jest.fn().mockResolvedValue({ recommendations: [] }),
    };
    service.registerProvider(provider);
    const result = await service.predictRisk('p-1', { tenantId: 't' });
    expect(result.available).toBe(true);
    expect(result.provider).toBe('FakeAI');
    expect((result as any).predictedRiskLevel).toBe('HIGH');
    expect(provider.predictRisk).toHaveBeenCalledWith('p-1', { tenantId: 't' });
  });

  it('falls back to NOT_CONFIGURED when provider lacks a capability', async () => {
    service.registerProvider({ name: 'Partial' });
    const result = await service.predictDelay('p-1', {});
    expect(result.available).toBe(false);
  });

  it('handle() is a no-op for domain events (Sprint 2.2)', async () => {
    await expect(
      service.handle({
        eventType: ProjectDomainEventType.PROJECT_CREATED,
        occurredAt: new Date(),
        projectId: 'p-1',
        tenantId: null,
        actorId: null,
        payload: {},
      }),
    ).resolves.toBeUndefined();
  });
});
