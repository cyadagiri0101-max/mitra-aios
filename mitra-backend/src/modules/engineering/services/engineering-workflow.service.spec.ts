import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EngineeringWorkflowService } from './engineering-workflow.service';
import { EngineeringDrawing } from '../entities/engineering-drawing.entity';
import { EngineeringBom } from '../entities/engineering-bom.entity';
import { EngineeringRouting } from '../entities/engineering-routing.entity';
import { WorkflowService } from '../../workflow/services/workflow.service';
import { AuditService } from '../../audit/services/audit.service';
import { EngineeringEventBus } from './engineering-event-bus.service';

describe('EngineeringWorkflowService', () => {
  let service: EngineeringWorkflowService;
  let drawingRepo: any;
  let workflowService: any;
  let eventBus: any;

  const actor = { userId: 'u-1', userRole: ['DESIGN'], userPermissions: [], tenantId: 't-1' };
  const drawing = { id: 'd-1', drawingNumber: 'DRW-1', projectId: 'p-1', status: 'DRAFT', tenantId: 't-1', deletedAt: null };

  beforeEach(async () => {
    drawingRepo = {
      findOne: jest.fn().mockResolvedValue({ ...drawing }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((d: any) => Promise.resolve(d)),
      target: EngineeringDrawing,
    };
    const emptyRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((e: any) => Promise.resolve(e)),
      target: EngineeringBom,
    };
    workflowService = {
      findInstanceByEntity: jest.fn().mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'DRAFT' }, currentStateId: 's-1', stateEnteredAt: new Date() }),
      createInstance: jest.fn().mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'DRAFT' } }),
      findTransitionsForState: jest.fn().mockResolvedValue([]),
      getInstanceHistory: jest.fn().mockResolvedValue([]),
      executeTransition: jest.fn().mockResolvedValue({
        id: 'wf-1',
        currentState: { stateCode: 'RELEASED' },
        history: [{ fromState: 'DRAFT' }],
      }),
    };
    eventBus = { publish: jest.fn() };
    const transactionEm = {
      getRepository: jest.fn(() => drawingRepo),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringWorkflowService,
        { provide: getRepositoryToken(EngineeringDrawing), useValue: drawingRepo },
        { provide: getRepositoryToken(EngineeringBom), useValue: emptyRepo },
        { provide: getRepositoryToken(EngineeringRouting), useValue: emptyRepo },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb(transactionEm)) } },
        { provide: WorkflowService, useValue: workflowService },
        { provide: AuditService, useValue: { logBusinessEvent: jest.fn() } },
        { provide: EngineeringEventBus, useValue: eventBus },
      ],
    }).compile();

    service = module.get(EngineeringWorkflowService);
  });

  it('scopes the entity lookup to the caller tenant', async () => {
    await service.getWorkflow('drawing', 'd-1', actor);
    expect(drawingRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'd-1', tenantId: 't-1' }) }),
    );
  });

  it('rejects tenantless workflow snapshot (fail closed)', async () => {
    await expect(
      service.getWorkflow('drawing', 'd-1', { ...actor, tenantId: null }),
    ).rejects.toThrow(ForbiddenException);
    expect(drawingRepo.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 when the entity belongs to another tenant', async () => {
    drawingRepo.findOne.mockResolvedValue(null);
    await expect(
      service.getWorkflow('drawing', 'd-x', { ...actor, tenantId: 't-2' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('executes a transition and mirrors the state onto the scoped entity', async () => {
    const result = await service.transition('drawing', 'd-1', 'tr-1', actor, 'approved');
    expect(result.transition.to).toBe('RELEASED');
    expect(drawingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'd-1', status: 'RELEASED', tenantId: 't-1' }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't-1' }),
    );
  });

  it('rejects tenantless transition (fail closed)', async () => {
    await expect(
      service.transition('drawing', 'd-1', 'tr-1', { ...actor, tenantId: null }),
    ).rejects.toThrow(ForbiddenException);
    expect(drawingRepo.findOne).not.toHaveBeenCalled();
  });
});