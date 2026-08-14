import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import { ProjectMilestone, MilestoneStatus } from '../entities/projectmilestone.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { MilestoneTemplateItem } from '../entities/milestone-template-item.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { ProjectTask } from '../entities/projecttask.entity';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';

describe('MilestoneService', () => {
  let service: MilestoneService;
  let milestoneRepo: any;
  let templateRepo: any;
  let itemRepo: any;
  let activityRepo: any;
  let taskRepo: any;
  let eventBus: any;

  const baseMilestone = {
    id: 'm-1', projectId: 'p-1', milestoneName: 'Kickoff', status: MilestoneStatus.PENDING,
    completionPct: 0, plannedDate: new Date('2026-08-10'), actualDate: null,
    daysVariance: 0, delayDays: 0, requiresApproval: false, dependsOnMilestoneId: null,
    templateItemId: null, approvedBy: null, approvedAt: null, deletedAt: null, tenantId: 't-1',
  };

  beforeEach(async () => {
    milestoneRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn((m) => Promise.resolve({ ...m, id: m.id ?? 'new-id' })),
      create: jest.fn((m) => ({ ...m })),
      findOneBy: jest.fn(),
    };
    templateRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), save: jest.fn((t) => Promise.resolve({ ...t, id: 'tpl-1' })), create: jest.fn((t) => ({ ...t })) };
    itemRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), save: jest.fn((i) => Promise.resolve({ ...i, id: 'it-1' })), create: jest.fn((i) => ({ ...i })) };
    activityRepo = { create: jest.fn((a) => ({ ...a })), save: jest.fn((a) => Promise.resolve(a)), findAndCount: jest.fn().mockResolvedValue([[], 0]) };
    taskRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), save: jest.fn((t) => Promise.resolve({ ...t })), create: jest.fn((t) => ({ ...t })), count: jest.fn().mockResolvedValue(0) };
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneService,
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(MilestoneTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(MilestoneTemplateItem), useValue: itemRepo },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
        { provide: getRepositoryToken(ProjectTask), useValue: taskRepo },
        { provide: DomainEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get(MilestoneService);
  });

  describe('findByProject', () => {
    it('decorates milestones with isBlocked and dependency name', async () => {
      const dep = { ...baseMilestone, id: 'm-0', milestoneName: 'Prior Step', status: MilestoneStatus.COMPLETED };
      const own = { ...baseMilestone, dependsOnMilestoneId: 'm-0' };
      milestoneRepo.find.mockResolvedValue([own, dep]);
      milestoneRepo.findOne.mockResolvedValue(dep);

      const result = await service.findByProject('p-1', 't-1');
      const found = result.find((m: any) => m.id === 'm-1')!;
      expect(found.isBlocked).toBe(false);
      expect(found.dependsOnMilestoneName).toBe('Prior Step');
    });

    it('flags milestone as blocked when dependency is open', async () => {
      const dep = { ...baseMilestone, id: 'm-0', milestoneName: 'Prior Step', status: MilestoneStatus.PENDING };
      milestoneRepo.find.mockResolvedValue([{ ...baseMilestone, dependsOnMilestoneId: 'm-0' }]);
      milestoneRepo.findOne.mockResolvedValue(dep);

      const result = await service.findByProject('p-1', 't-1');
      expect(result[0].isBlocked).toBe(true);
    });
  });

  describe('complete', () => {
    it('completes on time -> COMPLETED with zero delay', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone });
      const saved = await service.complete('m-1', new Date('2026-08-10'), null, 'u-1', 't-1');
      expect(saved.status).toBe(MilestoneStatus.COMPLETED);
      expect(saved.completionPct).toBe(100);
      expect(saved.delayDays).toBe(0);
    });

    it('marks DELAYED when completed after planned date', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone });
      const saved = await service.complete('m-1', new Date('2026-08-20'), 'late', 'u-1', 't-1');
      expect(saved.status).toBe(MilestoneStatus.DELAYED);
      expect(saved.delayDays).toBe(10);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ProjectDomainEventType.MILESTONE_DELAYED }),
      );
    });

    it('blocks completion when dependency is not complete', async () => {
      const dep = { ...baseMilestone, id: 'dep-1', status: MilestoneStatus.PENDING };
      milestoneRepo.findOne
        .mockResolvedValueOnce({ ...baseMilestone, dependsOnMilestoneId: 'dep-1' })
        .mockResolvedValueOnce(dep);
      await expect(service.complete('m-1', new Date(), null, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });

    it('requires approval -> stays IN_PROGRESS with 100% pct', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone, requiresApproval: true });
      const saved = await service.complete('m-1', new Date('2026-08-10'), null, 'u-1', 't-1');
      expect(saved.status).toBe(MilestoneStatus.IN_PROGRESS);
      expect(saved.completionPct).toBe(100);
    });
  });

  describe('approve', () => {
    it('approves a completed pending-approval milestone', async () => {
      milestoneRepo.findOne.mockResolvedValue({
        ...baseMilestone, requiresApproval: true, completionPct: 100, daysVariance: 0,
      });
      const saved = await service.approve('m-1', 'u-1', 't-1');
      expect(saved.status).toBe(MilestoneStatus.COMPLETED);
      expect(saved.approvedBy).toBe('u-1');
      expect(saved.approvedAt).toBeInstanceOf(Date);
    });

    it('rejects approval for milestones that do not require it', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone });
      await expect(service.approve('m-1', 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects approval before completion', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone, requiresApproval: true, completionPct: 40 });
      await expect(service.approve('m-1', 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshDelays', () => {
    it('flags overdue open milestones as DELAYED', async () => {
      const overdue = {
        ...baseMilestone, id: 'm-9', status: MilestoneStatus.PENDING,
        plannedDate: new Date(Date.now() - 5 * 86400000),
      };
      const future = { ...baseMilestone, id: 'm-10', status: MilestoneStatus.PENDING, plannedDate: new Date(Date.now() + 86400000) };
      const done = { ...baseMilestone, id: 'm-11', status: MilestoneStatus.COMPLETED, plannedDate: new Date(Date.now() - 5 * 86400000) };
      milestoneRepo.find.mockResolvedValue([overdue, future, done]);
      milestoneRepo.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.refreshDelays('p-1', 'u-1', 't-1');
      expect(result.updated).toBe(1);
      expect(result.delayed).toBe(1);
      const savedOverdue = milestoneRepo.save.mock.calls.map((c: any[]) => c[0]).find((m: any) => m.id === 'm-9');
      expect(savedOverdue.status).toBe(MilestoneStatus.DELAYED);
      expect(savedOverdue.delayDays).toBe(5);
    });

    it('scopes the refresh to the caller\'s tenant', async () => {
      const overdue = {
        ...baseMilestone, id: 'm-12', status: MilestoneStatus.PENDING,
        plannedDate: new Date(Date.now() - 5 * 86400000),
      };
      milestoneRepo.find.mockResolvedValue([overdue]);
      milestoneRepo.save.mockImplementation((m: any) => Promise.resolve(m));
      await service.refreshDelays('p-1', 'u-1', 't-1');
      expect(milestoneRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ projectId: 'p-1', tenantId: 't-1' }) }),
      );
    });

    it('rejects tenantless refresh (fail closed)', async () => {
      await expect(service.refreshDelays('p-1', 'u-1', null)).rejects.toThrow(ForbiddenException);
      expect(milestoneRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates a milestone with auto sequence, PENDING status and activity', async () => {
      milestoneRepo.count.mockResolvedValue(3);
      const saved = await service.create('p-1', { milestoneName: 'New Step', milestoneStage: 'EXECUTION' }, 'u-1', 't-1');
      expect(saved.sequenceNumber).toBe(4);
      expect(saved.status).toBe(MilestoneStatus.PENDING);
      expect(saved.completionPct).toBe(0);
      expect(activityRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ activityType: 'milestone.created' }),
      );
    });

    it('rejects a dependency milestone from another project', async () => {
      milestoneRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create('p-1', { milestoneName: 'X', dependsOnMilestoneId: 'm-x' }, 'u-1', 't-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('templates', () => {
    it('creates template and rejects duplicate codes', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await service.createTemplate({ code: 'TPL', name: 'Template' }, 'u-1', 't-1');
      expect(templateRepo.save).toHaveBeenCalled();

      templateRepo.findOne.mockResolvedValue({ id: 'x' });
      await expect(service.createTemplate({ code: 'TPL', name: 'T' }, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFound for missing template', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.findTemplate('nope', 't-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes a milestone', async () => {
      milestoneRepo.findOne.mockImplementation((arg: any) =>
        (arg?.id ?? arg?.where?.id) ? { ...baseMilestone } : null,
      );
      const saved = await service.remove('m-1', 'u-1', 't-1');
      expect(saved.deletedAt).toBeInstanceOf(Date);
    });

    it('rejects deletion when another milestone depends on it', async () => {
      milestoneRepo.findOne.mockImplementation((arg: any) => {
        if (arg?.where?.dependsOnMilestoneId === 'm-1') return { ...baseMilestone, id: 'm-2', milestoneName: 'Next' };
        return { ...baseMilestone };
      });
      await expect(service.remove('m-1', 'u-1', 't-1')).rejects.toThrow(/depends on it/i);
    });

    it('rejects deletion while tasks are assigned to it', async () => {
      milestoneRepo.findOne.mockImplementation((arg: any) =>
        (arg?.id ?? arg?.where?.id) ? { ...baseMilestone } : null,
      );
      taskRepo.count.mockResolvedValue(2);
      await expect(service.remove('m-1', 'u-1', 't-1')).rejects.toThrow(/tasks are still assigned/i);
    });
  });
});
