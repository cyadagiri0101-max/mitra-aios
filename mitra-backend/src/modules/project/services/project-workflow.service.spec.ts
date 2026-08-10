import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectWorkflowService, PROJECT_WORKFLOW_TYPE } from './project-workflow.service';
import { Project } from '../entities/project.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { DomainEventBus } from './domain-event-bus.service';
import { ProjectDomainEventType } from '../events/project.events';
import { NotificationService } from '../../platform/services/notification.service';
import { DataSource } from 'typeorm';

describe('ProjectWorkflowService', () => {
  let service: ProjectWorkflowService;
  let projectRepo: any;
  let activityRepo: any;
  let workflowService: any;
  let auditService: any;
  let eventBus: any;
  let notificationService: any;
  let dataSource: any;
  let fakeEm: any;

  const actor = { userId: 'u-1', userRole: ['MANAGEMENT'], userPermissions: ['project:transition'], tenantId: 't-1' };
  const project = { id: 'p-1', status: 'DRAFT', workflowInstanceId: null, tenantId: 't-1', updatedBy: null };

  beforeEach(async () => {
    projectRepo = {
      findOne: jest.fn().mockResolvedValue({ ...project }),
      save: jest.fn((p) => Promise.resolve(p)),
    };
    activityRepo = {
      create: jest.fn((a) => ({ ...a })),
      save: jest.fn((a) => Promise.resolve(a)),
    };
    workflowService = {
      findInstanceByEntity: jest.fn().mockResolvedValue(null),
      createInstance: jest.fn().mockResolvedValue({
        id: 'wf-1',
        currentState: { stateCode: 'DRAFT' },
        currentStateId: 'st-1',
        stateEnteredAt: new Date(),
        history: [],
      }),
      findTransitionsForState: jest.fn().mockResolvedValue([
        { id: 'tr-1', name: 'Start Kickoff', requiredRoles: [], requiredPermissions: [] },
      ]),
      getInstanceHistory: jest.fn().mockResolvedValue([]),
      executeTransition: jest.fn().mockResolvedValue({
        id: 'wf-1',
        currentState: { stateCode: 'KICKOFF' },
        history: [{ fromState: 'DRAFT', toState: 'KICKOFF', performedBy: 'u-1' }],
      }),
    };
    auditService = { logBusinessEvent: jest.fn().mockResolvedValue({}) };
    eventBus = { publish: jest.fn() };
    notificationService = { enqueue: jest.fn().mockResolvedValue({}) };
    fakeEm = {
      getRepository: (e: any) => {
        if (e === Project) return projectRepo;
        if (e === ProjectActivityLog) return activityRepo;
        return { findOne: jest.fn(), save: jest.fn() };
      },
    };
    dataSource = { transaction: jest.fn((cb: any) => cb(fakeEm)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectWorkflowService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
        { provide: WorkflowService, useValue: workflowService },
        { provide: AuditService, useValue: auditService },
        { provide: DomainEventBus, useValue: eventBus },
        { provide: NotificationService, useValue: notificationService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ProjectWorkflowService);
  });

  it('returns workflow snapshot with visible transitions and history', async () => {
    const result = await service.getWorkflow('p-1', actor);
    expect(result.workflowType).toBe(PROJECT_WORKFLOW_TYPE);
    expect(result.currentState.stateCode).toBe('DRAFT');
    expect(result.availableTransitions).toHaveLength(1);
    expect(result.history).toEqual([]);
  });

  it('filters transitions the actor lacks permission for', async () => {
    workflowService.findTransitionsForState.mockResolvedValue([
      { id: 'tr-1', name: 'Allowed', requiredRoles: [], requiredPermissions: [] },
      { id: 'tr-2', name: 'Blocked', requiredRoles: [], requiredPermissions: ['project:admin'] },
      { id: 'tr-3', name: 'Role Blocked', requiredRoles: ['ADMIN'], requiredPermissions: [] },
    ]);
    const result = await service.getWorkflow('p-1', actor);
    expect(result.availableTransitions.map((t: any) => t.id)).toEqual(['tr-1']);
  });

  it('lazily initializes the workflow instance when missing', async () => {
    await service.getWorkflow('p-1', actor);
    expect(workflowService.createInstance).toHaveBeenCalledWith(
      PROJECT_WORKFLOW_TYPE, 'project', 'p-1', expect.objectContaining({ userId: 'u-1' }), undefined,
    );
    expect(projectRepo.save).toHaveBeenCalled();
  });

  it('throws NotFoundException for missing project', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await expect(service.getWorkflow('nope', actor)).rejects.toThrow(NotFoundException);
  });

  it('executes a transition and syncs project status', async () => {
    const result = await service.transition('p-1', 'tr-1', actor, 'Let us begin');
    expect(workflowService.executeTransition).toHaveBeenCalledWith(
      'wf-1', 'tr-1', expect.objectContaining({ remarks: 'Let us begin' }), fakeEm,
    );
    expect(projectRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'KICKOFF', updatedBy: 'u-1' }),
    );
    expect(result.project.status).toBe('KICKOFF');
    expect(result.transition.from).toBe('DRAFT');
    expect(result.transition.to).toBe('KICKOFF');
  });

  it('sets actualEndDate when reaching COMPLETED', async () => {
    workflowService.executeTransition.mockResolvedValue({
      id: 'wf-1',
      currentState: { stateCode: 'COMPLETED' },
      history: [{ fromState: 'CLOSING', toState: 'COMPLETED' }],
    });
    await service.transition('p-1', 'tr-1', actor);
    expect(projectRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPLETED', actualEndDate: expect.any(Date) }));
  });

  it('syncs the legacy stage column with the workflow state (W-3)', async () => {
    await service.transition('p-1', 'tr-1', actor);
    expect(projectRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'KICKOFF', stage: 'PROJECT_CREATED', stageEnteredAt: expect.any(Date) }),
    );
  });

  it('writes activity + audit + publishes domain event', async () => {
    await service.transition('p-1', 'tr-1', actor);
    expect(activityRepo.save).toHaveBeenCalled();
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
      'project.workflow.transition', 'Project', 'p-1', 'u-1', expect.objectContaining({ fromState: 'DRAFT', toState: 'KICKOFF' }), fakeEm,
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: ProjectDomainEventType.PROJECT_STATUS_CHANGED, projectId: 'p-1' }),
    );
  });

  it('notifies the project manager in the same transaction', async () => {
    projectRepo.findOne.mockResolvedValue({
      ...project, projectManagerId: 'pm-1', projectNumber: 'PRJ-2026-0001',
    });
    await service.transition('p-1', 'tr-1', actor, 'Let us begin');
    expect(notificationService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'inapp',
        recipient: 'pm-1',
        subject: expect.stringContaining('PRJ-2026-0001'),
      }),
      fakeEm,
    );
  });

  it('skips the notification when the project has no project manager', async () => {
    await service.transition('p-1', 'tr-1', actor);
    expect(notificationService.enqueue).not.toHaveBeenCalled();
  });

  it('rolls back the whole transaction when the engine rejects', async () => {
    workflowService.executeTransition.mockRejectedValue(new ForbiddenException('Requires permission: project:admin'));
    await expect(service.transition('p-1', 'tr-1', actor)).rejects.toThrow(ForbiddenException);
    expect(notificationService.enqueue).not.toHaveBeenCalled();
    expect(auditService.logBusinessEvent).not.toHaveBeenCalled();
  });
});
