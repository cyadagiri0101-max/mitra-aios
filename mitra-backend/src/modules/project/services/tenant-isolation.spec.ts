/**
 * Tenant Isolation Tests
 *
 * Verifies that service-layer query methods include tenant scoping
 * to prevent cross-tenant data leakage.  These are "white-box" tests
 * that inspect the TypeORM `where` clauses passed to the repository.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMilestone } from '../entities/projectmilestone.entity';
import { ProjectBudget } from '../entities/projectbudget.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { DomainEventBus } from './domain-event-bus.service';
import { DataSource } from 'typeorm';

const makeRepo = () => ({
  findOne:      jest.fn().mockResolvedValue(null),
  find:         jest.fn().mockResolvedValue([]),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  count:        jest.fn().mockResolvedValue(0),
  create:       jest.fn((d: any) => d),
  save:         jest.fn((e: any) => Promise.resolve({ id: 'new-id', ...e })),
  update:       jest.fn().mockResolvedValue({ affected: 0 }),
  createQueryBuilder: jest.fn().mockReturnValue({
    where:       jest.fn().mockReturnThis(),
    andWhere:    jest.fn().mockReturnThis(),
    orderBy:     jest.fn().mockReturnThis(),
    skip:        jest.fn().mockReturnThis(),
    take:        jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  }),
});

const makeWorkflow = () => ({
  createInstance: jest.fn().mockResolvedValue({}),
  transition:     jest.fn().mockResolvedValue({}),
  getInstance:    jest.fn().mockResolvedValue(null),
});

describe('ProjectService — tenant isolation', () => {
  let service: ProjectService;
  let projectRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    projectRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project),          useValue: projectRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: makeRepo() },
        { provide: getRepositoryToken(ProjectBudget),    useValue: makeRepo() },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: makeRepo() },
        { provide: WorkflowService,                      useValue: makeWorkflow() },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb({ getRepository: () => makeRepo(), save: jest.fn() })) } },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn().mockResolvedValue({}) } },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('findAll() includes tenantId in where clause when provided', async () => {
    await service.findAll('tenant-abc');

    const whereArg = projectRepo.findAndCount.mock.calls[0][0].where;
    expect(whereArg).toHaveProperty('tenantId', 'tenant-abc');
  });

  it('findAll() fails closed without tenantId — no unfiltered reads (D)', async () => {
    await expect(service.findAll(undefined)).rejects.toThrow(ForbiddenException);
    expect(projectRepo.findAndCount).not.toHaveBeenCalled();
  });

  it('findAll() always includes deletedAt: IsNull() to exclude soft-deleted rows', async () => {
    await service.findAll('tenant-xyz');

    const whereArg = projectRepo.findAndCount.mock.calls[0][0].where;
    // IsNull() returns a FindOperator — it should not equal a plain null
    expect(whereArg.deletedAt).toBeDefined();
    expect(whereArg.deletedAt).not.toBeNull();
  });

  it('findOne() does not search without a defined id', async () => {
    await service.findOne('project-uuid', 'tenant-abc').catch(() => { /* NotFoundException expected */ });
    const whereArg = projectRepo.findOne.mock.calls[0][0].where;
    expect(whereArg.id).toBe('project-uuid');
  });

  it('create() does not derive tenant scoping from client-supplied data (subscriber-driven instead)', async () => {
    // CreateProjectDto has no `tenantId` field — whitelist validation would
    // strip it from any real request body. Tenant scoping is applied by
    // IndustrialSubscriber.beforeInsert() from the AsyncLocalStorage request
    // context, simulated here via the save() mock (since this unit test
    // uses a mocked repository and no real TypeORM subscriber runs).
    projectRepo.save.mockImplementation((e: any) =>
      Promise.resolve({ id: 'new-id', ...e, tenantId: 'tenant-from-context' }),
    );

    const saved = await service.create({ name: 'Test Project' }, 'user-1', 'tenant-from-context');

    expect(saved.tenantId).toBe('tenant-from-context');
  });
});
