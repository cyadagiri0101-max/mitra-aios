import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { WorkflowState } from '../entities/workflow-state.entity';
import { WorkflowTransition } from '../entities/workflow-transition.entity';
import { WorkflowInstance, WorkflowHistoryEntry } from '../entities/workflow-instance.entity';

// ─── MITRA Lifecycle Enforcement ──────────────────────────────────────────────
export enum MoldProjectStage {
  ENQUIRY = 'ENQUIRY',
  QUOTATION = 'QUOTATION',
  APPROVAL = 'APPROVAL',
  PROJECT_CREATED = 'PROJECT_CREATED',
  DESIGN_INITIATED = 'DESIGN_INITIATED',
  CPS_APPROVED = 'CPS_APPROVED',
  DESIGN_RELEASED = 'DESIGN_RELEASED',
  PROCESS_PLANNING = 'PROCESS_PLANNING',
  MACHINE_PLANNING = 'MACHINE_PLANNING',
  MANUFACTURING = 'MANUFACTURING',
  INTERNAL_TRIAL = 'INTERNAL_TRIAL',
  CUSTOMER_TRIAL = 'CUSTOMER_TRIAL',
  CAPA = 'CAPA',
  RETRIAL = 'RETRIAL',
  CUSTOMER_APPROVAL = 'CUSTOMER_APPROVAL',
  DISPATCH = 'DISPATCH',
  SERVICE = 'SERVICE',
}

export const MOLD_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ENQUIRY: ['QUOTATION'],
  QUOTATION: ['APPROVAL'],
  APPROVAL: ['PROJECT_CREATED'],
  PROJECT_CREATED: ['DESIGN_INITIATED'],
  DESIGN_INITIATED: ['CPS_APPROVED'],
  CPS_APPROVED: ['DESIGN_RELEASED'],
  DESIGN_RELEASED: ['PROCESS_PLANNING'],
  PROCESS_PLANNING: ['MACHINE_PLANNING'],
  MACHINE_PLANNING: ['MANUFACTURING'],
  MANUFACTURING: ['INTERNAL_TRIAL'],
  INTERNAL_TRIAL: ['CUSTOMER_TRIAL'],
  CUSTOMER_TRIAL: ['CAPA'],
  CAPA: ['RETRIAL'],
  RETRIAL: ['CUSTOMER_APPROVAL'],
  CUSTOMER_APPROVAL: ['DISPATCH'],
  DISPATCH: ['SERVICE'],
  SERVICE: [],
};

interface WorkflowContext {
  userId: string;
  userRole: string[];
  userPermissions: string[];
  tenantId?: string;
  remarks?: string;
  data?: Record<string, any>;
}

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowState) private readonly stateRepository: Repository<WorkflowState>,
    @InjectRepository(WorkflowTransition) private readonly transitionRepository: Repository<WorkflowTransition>,
    @InjectRepository(WorkflowInstance) private readonly instanceRepository: Repository<WorkflowInstance>,
  ) {}

  /** Validate MITRA stage transition strictly — no skipping allowed */
  validateMoldTransition(fromStage: string, toStage: string): void {
    const allowed = MOLD_ALLOWED_TRANSITIONS[fromStage];
    if (!allowed) throw new BadRequestException(`Unknown stage: ${fromStage}`);
    if (!allowed.includes(toStage)) {
      throw new BadRequestException(
        `Invalid transition: ${fromStage} → ${toStage}. ` +
        `Allowed: ${allowed.length ? allowed.join(', ') : 'none (final stage)'}`,
      );
    }
  }

  async findAllStates(tenantId?: string) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.stateRepository.find({ where, order: { sortOrder: 'ASC' }, take: 200 });
  }

  /** Available outgoing transitions for a workflow state (config-driven). */
  async findTransitionsForState(stateId: string, tenantId?: string, workflowType?: string) {
    const where: any = { fromStateId: stateId, isActive: true, deletedAt: IsNull() };
    if (workflowType) where.workflowType = workflowType;
    if (tenantId) where.tenantId = tenantId;
    return this.transitionRepository.find({
      where,
      relations: ['toState'],
      order: { name: 'ASC' },
    });
  }

  async createInstance(
    workflowType: string,
    entityType: string,
    entityId: string,
    context: WorkflowContext,
    em?: EntityManager,
  ) {
    const stateRepo = em ? em.getRepository(WorkflowState) : this.stateRepository;
    const instanceRepo = em ? em.getRepository(WorkflowInstance) : this.instanceRepository;

    // M-4 fix: resolve the initial state tenant-aware — prefer a
    // tenant-specific state definition, fall back to the system default.
    let initialState = null;
    if (context.tenantId) {
      initialState = await stateRepo.findOne({
        where: { workflowType, isInitial: true, tenantId: context.tenantId, deletedAt: IsNull() },
      });
    }
    if (!initialState) {
      initialState = await stateRepo.findOne({
        where: { workflowType, isInitial: true, tenantId: IsNull(), deletedAt: IsNull() },
      });
    }
    if (!initialState) {
      throw new BadRequestException(`No initial state for workflow: ${workflowType}`);
    }

    const historyEntry: WorkflowHistoryEntry = {
      fromState: '',
      toState: initialState.stateCode,
      transitionId: 'INIT',
      performedBy: context.userId,
      performedAt: new Date(),
      comments: 'Workflow initiated',
      attachments: [],
    };

    const instance = instanceRepo.create({
      workflowType, entityType, entityId,
      currentStateId: initialState.id,
      currentState: initialState,
      stateEnteredAt: new Date(),
      tenantId: context.tenantId ?? null,
      createdBy: context.userId,
      history: [historyEntry],
      status: 'active',
    });
    return instanceRepo.save(instance);
  }

  async executeTransition(
    instanceId: string,
    transitionId: string,
    context: WorkflowContext,
    em?: EntityManager,
  ) {
    const instanceRepo = em ? em.getRepository(WorkflowInstance) : this.instanceRepository;
    const transitionRepo = em ? em.getRepository(WorkflowTransition) : this.transitionRepository;

    const where: any = { id: instanceId, deletedAt: IsNull() };
    if (context.tenantId) where.tenantId = context.tenantId;
    const instance = await instanceRepo.findOne({
      where,
      relations: ['currentState'],
    });
    if (!instance) throw new NotFoundException('Workflow instance not found');

    const transitionWhere: any = {
      id: transitionId, fromStateId: instance.currentStateId, deletedAt: IsNull(),
    };
    if (context.tenantId) transitionWhere.tenantId = context.tenantId;
    const transition = await transitionRepo.findOne({
      where: transitionWhere,
      relations: ['fromState', 'toState'],
    });
    if (!transition) {
      throw new BadRequestException(
        `Invalid transition from state '${instance.currentState.stateCode}'`,
      );
    }

    // ── Enforce MITRA lifecycle for mold_project workflow ──────────────────
    if (instance.workflowType === 'mold_project') {
      this.validateMoldTransition(
        transition.fromState.stateCode,
        transition.toState.stateCode,
      );
    }

    // ── Role check ────────────────────────────────────────────────────────
    if (transition.requiredRoles?.length) {
      const hasRole = transition.requiredRoles.some((r) => context.userRole?.includes(r));
      if (!hasRole) {
        throw new ForbiddenException(
          `Requires one of: ${transition.requiredRoles.join(', ')}`,
        );
      }
    }

    // ── Permission check ──────────────────────────────────────────────────
    if (transition.requiredPermissions?.length) {
      const hasPermission = transition.requiredPermissions.some((p) =>
        context.userPermissions.includes(p),
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          `Requires permission: ${transition.requiredPermissions.join(', ')}`,
        );
      }
    }

    // ── Approval gate ─────────────────────────────────────────────────────
    if (transition.requiresApproval && !context.userPermissions.includes('workflow:approve')) {
      throw new ForbiddenException('This transition requires approval authority');
    }

    const previousState = instance.currentState.stateCode;
    instance.currentStateId = transition.toStateId;
    instance.currentState = transition.toState;
    instance.stateEnteredAt = new Date();
    instance.updatedBy = context.userId;

    const historyEntry: WorkflowHistoryEntry = {
      fromState: previousState,
      toState: transition.toState.stateCode,
      transitionId: transition.id,
      performedBy: context.userId,
      performedAt: new Date(),
      comments: context.remarks ?? '',
      attachments: [],
    };
    instance.history = [...(instance.history ?? []), historyEntry];
    return instanceRepo.save(instance);
  }

  async getInstanceHistory(instanceId: string, tenantId?: string, em?: EntityManager) {
    const instanceRepo = em ? em.getRepository(WorkflowInstance) : this.instanceRepository;
    const where: any = { id: instanceId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const instance = await instanceRepo.findOne({ where });
    if (!instance) throw new NotFoundException('Instance not found');
    return instance.history ?? [];
  }

  async findInstanceByEntity(
    entityType: string,
    entityId: string,
    tenantId?: string,
    em?: EntityManager,
  ) {
    const instanceRepo = em ? em.getRepository(WorkflowInstance) : this.instanceRepository;
    const where: any = { entityType, entityId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return instanceRepo.findOne({ where, relations: ['currentState'] });
  }
}
