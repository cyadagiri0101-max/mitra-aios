import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkOrderEngineService } from './work-order-engine.service';
import { WorkOrder, WorkOrderStatus } from '../entities/workorder.entity';
import { JobCard } from '../entities/jobcard.entity';
import { MaterialReservation } from '../entities/material-reservation.entity';
import { InspectionCheckpoint } from '../entities/inspection-checkpoint.entity';
import { WorkflowService } from '@modules/workflow/services/workflow.service';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { WorkOrderService } from './workorder.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';

const user: any = { id: 'u-1', email: 'ops@mitra.io', role: 'MANAGEMENT', tenantId: 't-1', permissions: ['manufacturing:work_order:release'] };

describe('WorkOrderEngineService', () => {
  let service: WorkOrderEngineService;
  let outbox: any;
  let workflow: any;
  let workOrderService: any;
  let emQuery: any;
  const outboxRows: any[] = [];
  const traceEdges: any[] = [];

  const makeRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => (Array.isArray(d) ? d : { ...d })),
    save: jest.fn((d: any) => Promise.resolve(d)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  });

  const wo = {
    id: 'wo-1', woNumber: 'WO-2026-0001', partName: 'Core Insert', operationType: 'MANUFACTURING',
    status: WorkOrderStatus.DRAFT, plannedQty: 10, plannedStartDate: new Date('2026-08-01'),
    projectId: 'p-1', drawingId: 'd-1', bomId: 'b-1', bomItemId: 'bi-1', routingId: 'r-1',
    processPlanId: 'pp-1', partId: 'part-1', costBaseline: 0, estimatedHours: 8,
    tenantId: 't-1', completedQty: 0, reworkQty: 0, scrapQty: 0,
  };

  beforeEach(async () => {
    outboxRows.length = 0;
    traceEdges.length = 0;
    const woRepo = makeRepo();
    woRepo.findOne.mockResolvedValue({ ...wo });
    const jobRepo = makeRepo();
    const resRepo = makeRepo();
    const cpRepo = makeRepo();

    emQuery = jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('engineering_drawings')) return [{ id: 'd-1', drawing_number: 'DRW-0001', title: 'Core Insert', current_revision: 'A' }];
      if (sql.includes('engineering_drawing_revisions')) return [{ revision: 'A', version_number: 1, status: 'RELEASED', released_at: new Date() }];
      if (sql.includes('engineering_boms')) return [{ id: 'b-1', bom_number: 'BOM-0001', name: 'Core Insert BOM', revision: 'A', version_number: 1, total_cost: 100 }];
      if (sql.includes('engineering_bom_revisions')) return [{ revision: 'A', version_number: 1, total_cost: 100, released_at: new Date() }];
      if (sql.includes('engineering_routings')) return [{ id: 'r-1', routing_number: 'RT-0001', name: 'Core Routing', version: 'A', total_cost: 50 }];
      if (sql.includes('engineering_routing_revisions')) return [{ version: 'A', snapshot: {}, change_summary: 'first', released_at: new Date() }];
      if (sql.includes('process_plans')) return [{ id: 'pp-1', plan_number: 'PP-0001', plan_version: 1 }];
      if (sql.includes('engineering_operations')) return [
        { id: 'op-1', operation_number: 10, operation_code: 'OP10', description: 'CNC Turn', work_center_id: 'wc-1', machine_id: null, setup_time_minutes: 30, cycle_time_minutes: 5, standard_time_minutes: 60, quantity_per_cycle: 1, cost_per_hour: 50, operation_cost: 10, predecessor_operation_id: null, inspection_required: true, tool_requirements: null, material_requirements: null, quality_checkpoints: [{ name: 'OD', dimension: 'OD 50mm', tolerance: '±0.02', instrument: 'Micrometer' }] },
      ];
      if (sql.includes('engineering_bom_items')) return [
        { id: 'bi-1', parent_item_id: null, line_number: 10, part_number: 'RM-001', part_name: 'EN8 Bar', item_type: 'RAW', source_type: 'STOCK', quantity: 2, quantity_per: 'per-piece', uom: 'KG', unit_cost: 5, extended_cost: 10, drawing_id: null, effective_from: null, effective_to: null },
      ];
      if (sql.includes('engineering_trace_edges')) { traceEdges.push(params); return []; }
      return [];
    });

    const em: any = {
      getRepository: jest.fn((entity: any) => {
        if (entity === WorkOrder) return woRepo;
        if (entity === JobCard) return jobRepo;
        if (entity === MaterialReservation) return resRepo;
        if (entity === InspectionCheckpoint) return cpRepo;
        return makeRepo();
      }),
      query: emQuery,
    };

    outbox = { append: jest.fn(async (eventType: string, aggregateType: string, aggregateId: string, payload: any, opts: any) => {
      outboxRows.push({ eventType, aggregateType, aggregateId, payload, opts });
      return { id: 'o-1' };
    }) };

    workflow = {
      findInstanceByEntity: jest.fn().mockResolvedValue(null),
      createInstance: jest.fn().mockResolvedValue({ id: 'wf-1' }),
      executeTransition: jest.fn().mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'RELEASED' }, history: [{ fromState: 'DRAFT', toState: 'RELEASED' }] }),
    };

    workOrderService = {
      assertReleased: jest.fn().mockResolvedValue({ id: 'r-1', routing_number: 'RT-0001', version: 'A', part_number: 'P-9', total_cost: 50, total_standard_hours: 8 }),
      create: jest.fn(async (d: any) => ({ ...d, id: 'wo-2', woNumber: 'WO-2026-0002' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderEngineService,
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: getRepositoryToken(JobCard), useValue: jobRepo },
        { provide: getRepositoryToken(MaterialReservation), useValue: resRepo },
        { provide: getRepositoryToken(InspectionCheckpoint), useValue: cpRepo },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb(em)) } },
        { provide: WorkOrderService, useValue: workOrderService },
        { provide: WorkflowService, useValue: workflow },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get(WorkOrderEngineService);
  });

  describe('generateFromArtifacts', () => {
    it('rejects generation without a routing', async () => {
      await expect(service.generateFromArtifacts({}, user)).rejects.toThrow(BadRequestException);
      expect(workOrderService.create).not.toHaveBeenCalled();
    });

    it('creates a DRAFT work order from the released routing', async () => {
      const result = await service.generateFromArtifacts({ routingId: 'r-1', plannedQty: 5 }, user);
      expect(workOrderService.assertReleased).toHaveBeenCalledWith('engineering_routings', 'r-1', 'Routing', 't-1');
      expect(workOrderService.create).toHaveBeenCalledWith(expect.objectContaining({
        routingId: 'r-1', status: 'DRAFT', partName: 'P-9', costBaseline: 50, estimatedHours: 8,
      }), 'u-1', 't-1');
      expect(result.woNumber).toBe('WO-2026-0002');
    });
  });

  describe('release', () => {
    it('creates the workflow instance, snapshot, job cards, reservations, checkpoints and trace edges', async () => {
      const result = await service.release('wo-1', user);

      expect(workflow.findInstanceByEntity).toHaveBeenCalledWith('work_order', 'wo-1', 't-1', expect.anything());
      expect(workflow.createInstance).toHaveBeenCalledWith('manufacturing_work_order', 'work_order', 'wo-1', expect.anything(), expect.anything());
      expect(workflow.executeTransition).toHaveBeenCalledWith('wf-1', expect.stringMatching(/^b2000000-/), expect.anything(), expect.anything());

      expect(result.status).toBe('RELEASED');
      expect(result.snapshot.routing?.routingNumber).toBe('RT-0001');
      expect(result.snapshot.operations).toHaveLength(1);
      expect(result.snapshot.bomItems).toHaveLength(1);
      expect(result.costBaseline).toBe(50);

      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.WORK_ORDER_RELEASED)).toBe(true);
      expect(traceEdges.length).toBeGreaterThanOrEqual(5);
      expect(traceEdges.some((params) => params[2] === 'WORK_ORDER' && params[4] === 'DRAWING')).toBe(true);
    });

    it('rejects releasing a non-DRAFT work order', async () => {
      const woRepo = (service as any).workOrderRepo;
      woRepo.findOne.mockResolvedValue({ ...wo, status: WorkOrderStatus.RELEASED });
      await expect(service.release('wo-1', user)).rejects.toThrow(BadRequestException);
    });

    it('rejects releasing another tenant\'s work order with 404', async () => {
      const woRepo = (service as any).workOrderRepo;
      woRepo.findOne.mockResolvedValue(null);
      const other: any = { id: 'u-2', email: 'y@mitra.io', role: 'MANAGEMENT', tenantId: 't-2', permissions: [] };
      await expect(service.release('wo-1', other)).rejects.toThrow(NotFoundException);
      expect(workflow.createInstance).not.toHaveBeenCalled();
    });
  });

  describe('transition', () => {
    it('completes the work order and releases reservations', async () => {
      workflow.findInstanceByEntity.mockResolvedValue({ id: 'wf-1' });
      workflow.executeTransition.mockResolvedValue({ id: 'wf-1', currentState: { stateCode: 'COMPLETED' }, history: [{ fromState: 'IN_PROGRESS', toState: 'COMPLETED' }] });

      const result = await service.transition('wo-1', 'COMPLETE', user, 'done');

      expect(result.status).toBe('COMPLETED');
      expect(outboxRows.some((r) => r.eventType === EngineeringDomainEventType.WORK_ORDER_COMPLETED && r.payload.remarks === 'done')).toBe(true);
      const resRepo = (service as any).reservationRepo;
      expect(resRepo.update).toHaveBeenCalledWith({ workOrderId: 'wo-1', tenantId: 't-1' }, { status: 'RELEASED', updatedBy: 'u-1' });
    });

    it('rejects a tenantless user (fail closed)', async () => {
      const tenantless: any = { id: 'u-9', email: 'x@mitra.io', role: 'MANAGEMENT', tenantId: null, permissions: [] };
      await expect(service.transition('wo-1', 'START', tenantless)).rejects.toThrow(ForbiddenException);
      await expect(service.release('wo-1', tenantless)).rejects.toThrow(ForbiddenException);
      await expect(service.listJobCards('wo-1', null)).rejects.toThrow(ForbiddenException);
      await expect(service.listReservations('wo-1', null)).rejects.toThrow(ForbiddenException);
      await expect(service.listCheckpoints('wo-1', null)).rejects.toThrow(ForbiddenException);
    });

    it('rejects cross-tenant transitions with 404', async () => {
      const woRepo = (service as any).workOrderRepo;
      woRepo.findOne.mockResolvedValue(null);
      const other: any = { id: 'u-2', email: 'y@mitra.io', role: 'MANAGEMENT', tenantId: 't-2', permissions: [] };
      await expect(service.transition('wo-1', 'START', other)).rejects.toThrow(NotFoundException);
    });

    it('rejects a transition when no workflow instance exists', async () => {
      await expect(service.transition('wo-1', 'START', user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reads', () => {
    it('lists job cards, reservations and checkpoints scoped to the tenant', async () => {
      await service.listJobCards('wo-1', 't-1');
      await service.listReservations('wo-1', 't-1');
      await service.listCheckpoints('wo-1', 't-1');
      const jobRepo = (service as any).jobCardRepo;
      expect(jobRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workOrderId: 'wo-1', tenantId: 't-1' }) }));
      const resRepo = (service as any).reservationRepo;
      expect(resRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workOrderId: 'wo-1', tenantId: 't-1' }) }));
      const cpRepo = (service as any).checkpointRepo;
      expect(cpRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workOrderId: 'wo-1', tenantId: 't-1' }) }));
    });
  });
});
