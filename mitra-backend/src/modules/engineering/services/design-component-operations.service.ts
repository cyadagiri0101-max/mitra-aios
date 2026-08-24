import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignComponent } from '../entities/design-component.entity';
import { DesignComponentRevision } from '../entities/design-component-revision.entity';
import { DesignComponentDeliverable } from '../entities/design-component-deliverable.entity';
import { AuditService } from '../../audit/services/audit.service';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { EkosEntityType } from '../../ekos/entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../../ekos/entities/ekos-graph-edge.entity';
import {
  CreateDesignComponentDto,
  CreateComponentRevisionDto,
  UpdateComponentDeliverableStatusDto,
  BulkAssignDeliverablesDto,
} from '../dto/design-component-operations.dto';
import { DesignChecklist } from '../entities/design-checklist.entity';
import { DesignChecklistItem } from '../entities/design-checklist-item.entity';
import { DesignEngineerProfile } from '../entities/design-team-capacity.entity';

@Injectable()
export class DesignComponentOperationsService {
  private readonly logger = new Logger(DesignComponentOperationsService.name);

  constructor(
    @InjectRepository(DesignComponent)
    private readonly componentRepo: Repository<DesignComponent>,
    @InjectRepository(DesignComponentRevision)
    private readonly revisionRepo: Repository<DesignComponentRevision>,
    @InjectRepository(DesignComponentDeliverable)
    private readonly deliverableRepo: Repository<DesignComponentDeliverable>,
    @InjectRepository(DesignChecklist)
    private readonly checklistRepo: Repository<DesignChecklist>,
    @InjectRepository(DesignChecklistItem)
    private readonly checklistItemRepo: Repository<DesignChecklistItem>,
    @InjectRepository(DesignEngineerProfile)
    private readonly engineerRepo: Repository<DesignEngineerProfile>,
    private readonly auditService: AuditService,
    private readonly ekosGraphService: EkosGraphService,
  ) {}

  /**
   * Phase 2: Create Component with Granular Deliverables
   */
  async createComponent(
    dto: CreateDesignComponentDto,
    tenantId: string,
  ): Promise<DesignComponent> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    if (!dto.projectId || !dto.componentCode || !dto.name) {
      throw new BadRequestException('Project ID, component code, and name are required');
    }

    const plannedUnits = dto.plannedWorkloadUnits || 10.0;

    const component = this.componentRepo.create({
      tenantId,
      projectId: dto.projectId,
      packageId: dto.packageId,
      componentCode: dto.componentCode,
      name: dto.name,
      componentType: dto.componentType,
      variantBpCode: dto.variantBpCode,
      activeRevision: 'Rev 0',
      responsibleEngineerId: dto.responsibleEngineerId,
      reviewerId: dto.reviewerId,
      status: 'IN_DESIGN',
      plannedWorkloadUnits: plannedUnits,
      actualWorkloadUnits: 0,
      reworkWorkloadUnits: 0,
      completionPercentage: 0,
    });

    const savedComponent = await this.componentRepo.save(component);

    // Initial Rev 0
    const initialRev = this.revisionRepo.create({
      tenantId,
      componentId: savedComponent.id,
      revisionCode: 'Rev 0',
      revisionReason: 'STANDARDIZATION',
      description: 'Initial component release',
      incrementalWorkloadUnits: plannedUnits,
      reworkWorkloadUnits: 0,
      engineerId: dto.responsibleEngineerId,
      reviewerId: dto.reviewerId,
      status: 'APPROVED',
      approvedAt: new Date(),
    });
    await this.revisionRepo.save(initialRev);

    // Deliverables breakdown (default or supplied)
    const deliverableDtos = dto.deliverables && dto.deliverables.length > 0
      ? dto.deliverables
      : [
          { deliverableType: '3D_DEVELOPMENT' as const, name: '3D CAD Modeling', plannedUnits: plannedUnits * 0.4 },
          { deliverableType: 'DETAILING' as const, name: '2D Detailing & Tolerancing', plannedUnits: plannedUnits * 0.3 },
          { deliverableType: 'VERIFICATION' as const, name: 'Design Verification & Self-Check', plannedUnits: plannedUnits * 0.15 },
          { deliverableType: '3D_DTP' as const, name: '3D Data to Programming Preparation', plannedUnits: plannedUnits * 0.15 },
        ];

    const deliverables = deliverableDtos.map((d) =>
      this.deliverableRepo.create({
        tenantId,
        componentId: savedComponent.id,
        deliverableType: d.deliverableType,
        name: d.name,
        plannedUnits: d.plannedUnits || 2.0,
        actualUnits: 0,
        responsibleEngineerId: d.responsibleEngineerId || dto.responsibleEngineerId,
        status: 'NOT_STARTED',
      }),
    );

    savedComponent.deliverables = await this.deliverableRepo.save(deliverables);

    // Audit log
    await this.auditService.log({
      tenantId,
      projectId: dto.projectId,
      entityType: 'DesignComponent',
      entityId: savedComponent.id,
      action: 'CREATE_COMPONENT',
      metadata: { componentCode: dto.componentCode, componentType: dto.componentType },
    });

    // EKOS Edge
    try {
      await this.ekosGraphService.recordEdge(
        {
          sourceEntityType: EkosEntityType.PROJECT,
          sourceEntityId: dto.projectId,
          sourceEntityRevision: 'Rev 0',
          targetEntityType: EkosEntityType.CAD_MODEL,
          targetEntityId: savedComponent.id,
          relationType: EkosRelationType.DERIVED_FROM,
          provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
          confidence: 1.0,
          properties: { componentCode: dto.componentCode },
        },
        tenantId,
      );
    } catch (err: any) {
      this.logger.warn(`EKOS edge non-blocking: ${(err as any)?.message}`);
    }

    return savedComponent;
  }

  /**
   * Phase 2: Add Component Revision (Incremental Workload Modeling)
   */
  async addComponentRevision(
    componentId: string,
    dto: CreateComponentRevisionDto,
    tenantId: string,
    user: any,
  ): Promise<DesignComponentRevision> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    const component = await this.componentRepo.findOne({
      where: { id: componentId, tenantId },
    });

    if (!component) throw new NotFoundException('Design component not found');

    const incrementalUnits = Number(dto.incrementalWorkloadUnits || 0);
    const reworkUnits = Number(dto.reworkWorkloadUnits || 0);

    const revision = this.revisionRepo.create({
      tenantId,
      componentId: component.id,
      revisionCode: dto.revisionCode,
      revisionReason: dto.revisionReason,
      description: dto.description,
      incrementalWorkloadUnits: incrementalUnits,
      reworkWorkloadUnits: reworkUnits,
      engineerId: dto.engineerId || user?.userId || 'engineer',
      status: 'PENDING_REVIEW',
    });

    const savedRevision = await this.revisionRepo.save(revision);

    // Update active revision & incremental workload on component
    component.activeRevision = dto.revisionCode;
    component.plannedWorkloadUnits = Number(component.plannedWorkloadUnits) + incrementalUnits;
    component.reworkWorkloadUnits = Number(component.reworkWorkloadUnits) + reworkUnits;
    component.status = 'UNDER_REVIEW';

    await this.componentRepo.save(component);

    await this.auditService.log({
      tenantId,
      projectId: component.projectId,
      entityType: 'DesignComponentRevision',
      entityId: savedRevision.id,
      action: 'ADD_COMPONENT_REVISION',
      metadata: {
        revisionCode: dto.revisionCode,
        incrementalUnits,
        reworkUnits,
        reason: dto.revisionReason,
      },
    });

    return savedRevision;
  }

  /**
   * Phase 4: Update Deliverable Status & Calculate Component Progress
   */
  async updateDeliverableStatus(
    deliverableId: string,
    dto: UpdateComponentDeliverableStatusDto,
    tenantId: string,
  ): Promise<DesignComponentDeliverable> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const deliverable = await this.deliverableRepo.findOne({
      where: { id: deliverableId, tenantId },
      relations: ['component'],
    });

    if (!deliverable) throw new NotFoundException('Component deliverable not found');

    deliverable.status = dto.status;
    if (dto.actualUnits !== undefined) deliverable.actualUnits = dto.actualUnits;
    if (dto.evidenceReference) deliverable.evidenceReference = dto.evidenceReference;
    if (dto.reviewerNotes) deliverable.reviewerNotes = dto.reviewerNotes;

    if (dto.status === 'COMPLETED') {
      deliverable.completionTimestamp = new Date();
    }

    const updatedDeliverable = await this.deliverableRepo.save(deliverable);

    // Recalculate component total actuals and completion %
    const allDeliverables = await this.deliverableRepo.find({
      where: { componentId: deliverable.componentId, tenantId },
    });

    const totalPlanned = allDeliverables.reduce((acc, d) => acc + Number(d.plannedUnits || 0), 0);
    const totalActual = allDeliverables.reduce((acc, d) => acc + Number(d.actualUnits || 0), 0);
    const completedDeliverables = allDeliverables.filter((d) => d.status === 'COMPLETED');

    const completionPercentage =
      allDeliverables.length > 0 ? (completedDeliverables.length / allDeliverables.length) * 100 : 0;

    const component = deliverable.component;
    component.actualWorkloadUnits = totalActual;
    component.completionPercentage = Number(completionPercentage.toFixed(1));

    if (completionPercentage === 100) {
      component.status = 'APPROVED';
    } else if (completionPercentage > 0) {
      component.status = 'IN_DESIGN';
    }

    await this.componentRepo.save(component);
    return updatedDeliverable;
  }

  /**
   * Phase 3: Get Project Component Workload & Deliverables Tree
   */
  async getProjectComponents(projectId: string, tenantId: string): Promise<any> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const components = await this.componentRepo.find({
      where: { projectId, tenantId },
      relations: ['revisions', 'deliverables'],
    });

    const totalPlanned = components.reduce((acc, c) => acc + Number(c.plannedWorkloadUnits || 0), 0);
    const totalActual = components.reduce((acc, c) => acc + Number(c.actualWorkloadUnits || 0), 0);
    const totalRework = components.reduce((acc, c) => acc + Number(c.reworkWorkloadUnits || 0), 0);

    return {
      projectId,
      totalComponentsCount: components.length,
      totalPlannedUnits: Number(totalPlanned.toFixed(1)),
      totalActualUnits: Number(totalActual.toFixed(1)),
      totalReworkUnits: Number(totalRework.toFixed(1)),
      components: components.map((c) => ({
        id: c.id,
        componentCode: c.componentCode,
        name: c.name,
        componentType: c.componentType,
        variantBpCode: c.variantBpCode,
        activeRevision: c.activeRevision,
        responsibleEngineerId: c.responsibleEngineerId,
        reviewerId: c.reviewerId,
        status: c.status,
        plannedWorkloadUnits: Number(c.plannedWorkloadUnits),
        actualWorkloadUnits: Number(c.actualWorkloadUnits),
        reworkWorkloadUnits: Number(c.reworkWorkloadUnits),
        completionPercentage: Number(c.completionPercentage),
        revisionsCount: c.revisions?.length || 0,
        deliverablesCount: c.deliverables?.length || 0,
        deliverables: c.deliverables || [],
      })),
    };
  }

  /**
   * M12.1G DoD-01: Seed Objective Definition of Done Checklist for Deliverable (Idempotent)
   */
  async seedDeliverableChecklist(
    deliverableId: string,
    deliverableType: string,
    tenantId: string,
    user?: any,
  ): Promise<DesignChecklist> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');

    const deliverable = await this.deliverableRepo.findOne({
      where: { id: deliverableId, tenantId },
      relations: ['component'],
    });

    if (!deliverable) throw new NotFoundException('Deliverable not found');

    // Check if checklist already exists for this deliverable to guarantee idempotency
    const existingChecklist = await this.checklistRepo.findOne({
      where: {
        tenantId,
        projectId: deliverable.component.projectId,
        title: `DoD Checklist: ${deliverable.name} (${deliverable.id})`,
      },
      relations: ['items'],
    });

    if (existingChecklist) {
      return existingChecklist;
    }

    // Standard mandatory verification items by deliverable type
    const templateItems: Array<{ itemCode: string; description: string; isMandatory: boolean }> = [];
    const normType = deliverableType.toUpperCase();

    if (normType.includes('3D') || normType.includes('CAVITY') || normType.includes('CORE')) {
      templateItems.push(
        { itemCode: 'DOD-3D-01', description: 'Verify 3D solid model topology, draft angles, and wall thicknesses', isMandatory: true },
        { itemCode: 'DOD-3D-02', description: 'Verify parting surface shutoff angle >= 7 degrees and match line fit', isMandatory: true },
        { itemCode: 'DOD-3D-03', description: 'Verify shrinkage scale application and thermal expansion compensation', isMandatory: true },
      );
    } else if (normType.includes('DETAILING') || normType.includes('2D') || normType.includes('INSERT_2D')) {
      templateItems.push(
        { itemCode: 'DOD-2D-01', description: 'Verify critical dimensions, datum references, and GD&T geometric tolerancing', isMandatory: true },
        { itemCode: 'DOD-2D-02', description: 'Verify surface roughness annotations and title block metadata', isMandatory: true },
      );
    } else if (normType.includes('ELECTRODE')) {
      templateItems.push(
        { itemCode: 'DOD-EDM-01', description: 'Verify spark gap undersize, orbit clearance, and spark area calculations', isMandatory: true },
        { itemCode: 'DOD-EDM-02', description: 'Verify CMM probe origin, burn depth, and electrode holder clearances', isMandatory: true },
      );
    } else if (normType.includes('EDM')) {
      templateItems.push(
        { itemCode: 'DOD-EDM-03', description: 'Verify EDM coordinate readings sheet and VDI surface finish specs', isMandatory: true },
      );
    } else if (normType.includes('FIXTURE') || normType.includes('JIG')) {
      templateItems.push(
        { itemCode: 'DOD-FIX-01', description: 'Verify clamping force, CNC table locating pins, and clearance for cutting tools', isMandatory: true },
      );
    } else if (normType.includes('CMM')) {
      templateItems.push(
        { itemCode: 'DOD-CMM-01', description: 'Verify probing alignment coordinate system matches CAD solid origin', isMandatory: true },
      );
    } else if (normType.includes('PROCESS_PLANNING')) {
      templateItems.push(
        { itemCode: 'DOD-PP-01', description: 'Verify machining operation sequence, tool clearance, and raw material allowances', isMandatory: true },
      );
    } else if (normType.includes('PART_LIST') || normType.includes('FASTENER') || normType.includes('STANDARD_PARTS')) {
      templateItems.push(
        { itemCode: 'DOD-BOM-01', description: 'Verify fastener thread size, length, grade, and catalog part numbers', isMandatory: true },
        { itemCode: 'DOD-BOM-02', description: 'Verify store stock inventory availability for standard hardware', isMandatory: true },
      );
    } else {
      templateItems.push(
        { itemCode: 'DOD-GEN-01', description: 'Verify deliverable geometry and standard checklist requirements', isMandatory: true },
      );
    }

    const checklist = this.checklistRepo.create({
      tenantId,
      projectId: deliverable.component.projectId,
      stage: 'PROCESS_PLANNING',
      checklistType: 'DELIVERABLE_DOD',
      title: `DoD Checklist: ${deliverable.name} (${deliverable.id})`,
      status: 'PENDING',
      mandatoryItemsTotal: templateItems.filter((i) => i.isMandatory).length,
      mandatoryItemsCompleted: 0,
      allMandatoryPassed: false,
    });

    const savedChecklist = await this.checklistRepo.save(checklist);

    const checklistItems = templateItems.map((item) =>
      this.checklistItemRepo.create({
        tenantId,
        checklistId: savedChecklist.id,
        itemCode: item.itemCode,
        description: item.description,
        isMandatory: item.isMandatory,
        ownerId: deliverable.responsibleEngineerId || user?.userId,
        status: 'PENDING',
      }),
    );

    savedChecklist.items = await this.checklistItemRepo.save(checklistItems);

    await this.auditService.log({
      tenantId,
      projectId: deliverable.component.projectId,
      entityType: 'DesignChecklist',
      entityId: savedChecklist.id,
      action: 'SEED_DELIVERABLE_CHECKLIST',
      metadata: { deliverableId, deliverableType, itemsCount: checklistItems.length },
    });

    return savedChecklist;
  }

  /**
   * M12.1G RE-01: Bulk Engineer Assignment with Capacity & Skill Bottleneck Evaluation
   */
  async bulkAssignDeliverables(
    dto: BulkAssignDeliverablesDto,
    tenantId: string,
    user?: any,
  ): Promise<{
    assignedCount: number;
    unchangedCount: number;
    engineerId: string;
    newTotalLoadHours: number;
    isOverloaded: boolean;
    skillBottleneckWarnings: string[];
    affectedDeliverableIds: string[];
  }> {
    if (!tenantId) throw new ForbiddenException('Tenant context required');
    if (!dto.deliverableIds || dto.deliverableIds.length === 0) {
      throw new BadRequestException('At least one deliverable ID is required');
    }
    if (!dto.engineerId) {
      throw new BadRequestException('Engineer ID is required for bulk assignment');
    }

    const deliverables = await this.deliverableRepo.find({
      where: (dto.deliverableIds || []).map((id: string) => ({ id, tenantId })),
      relations: ['component'],
    });

    if (deliverables.length === 0) {
      throw new NotFoundException('No matching deliverables found for this tenant');
    }

    let assignedCount = 0;
    let unchangedCount = 0;
    const affectedIds: string[] = [];

    for (const deliverable of deliverables) {
      const isAlreadyAssigned =
        deliverable.responsibleEngineerId &&
        deliverable.responsibleEngineerId !== 'UNASSIGNED';

      if (isAlreadyAssigned && !dto.overwriteExisting) {
        unchangedCount++;
        continue;
      }

      deliverable.responsibleEngineerId = dto.engineerId;
      affectedIds.push(deliverable.id);
      assignedCount++;
    }

    if (affectedIds.length > 0) {
      await this.deliverableRepo.save(deliverables.filter((d) => affectedIds.includes(d.id)));
    }

    // Evaluate capacity load on target engineer
    const allAssigned = await this.deliverableRepo.find({
      where: { responsibleEngineerId: dto.engineerId, tenantId },
    });

    const newTotalLoad = allAssigned.reduce((acc, d) => acc + Number(d.plannedUnits || 0), 0);
    const profile = await this.engineerRepo.findOne({
      where: [{ engineerCode: dto.engineerId, tenantId } as any, { name: dto.engineerId, tenantId } as any],
    });

    const weeklyCapacity = profile?.weeklyCapacityHours || 40;
    const isOverloaded = newTotalLoad > weeklyCapacity;

    const skillBottleneckWarnings: string[] = [];
    if (isOverloaded) {
      skillBottleneckWarnings.push(
        `Engineer ${dto.engineerId} exceeds weekly capacity (${newTotalLoad.toFixed(1)}h / ${weeklyCapacity}h planned). Delivery risk elevated.`,
      );
    }

    await this.auditService.log({
      tenantId,
      projectId: deliverables[0]?.component?.projectId || 'UNKNOWN',
      entityType: 'DesignComponentDeliverable',
      entityId: dto.engineerId,
      action: 'BULK_ENGINEER_ASSIGNMENT',
      metadata: {
        assignedCount,
        unchangedCount,
        engineerId: dto.engineerId,
        newTotalLoadHours: Number(newTotalLoad.toFixed(1)),
        isOverloaded,
        affectedIds,
      },
    });

    return {
      assignedCount,
      unchangedCount,
      engineerId: dto.engineerId,
      newTotalLoadHours: Number(newTotalLoad.toFixed(1)),
      isOverloaded,
      skillBottleneckWarnings,
      affectedDeliverableIds: affectedIds,
    };
  }
}
