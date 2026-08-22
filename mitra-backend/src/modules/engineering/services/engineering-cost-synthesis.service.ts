import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EngineeringCostConfiguration,
  CostRateType,
  CostConfigurationStatus,
  CostRateLookupResult,
} from '../entities/engineering-cost-configuration.entity';
import {
  CostComponent,
  CostSummary,
  CostStatus,
} from '../entities/engineering-reasoning-result.entity';
import {
  CreateCostConfigurationDto,
  UpdateCostConfigurationDto,
  QueryCostConfigurationsDto,
} from '../dto/engineering-reasoning.dto';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class EngineeringCostSynthesisService {
  private readonly logger = new Logger(EngineeringCostSynthesisService.name);

  // Fallback / standard manufacturing physics baselines for quantities (hours, mass, etc.)
  private readonly baselineEffortFactors: Record<string, {
    machiningHours: number;
    toolingHours: number;
    inspectionHours: number;
    reworkHours: number;
    materialMassKg: number;
    cycleTimeSeconds: number;
  }> = {
    'DFM-WALL-001': {
      machiningHours: 3.5,
      toolingHours: 6.0,
      inspectionHours: 2.0,
      reworkHours: 4.0,
      materialMassKg: 0.25,
      cycleTimeSeconds: 4.5,
    },
    'DFM-DRAFT-001': {
      machiningHours: 2.0,
      toolingHours: 4.5,
      inspectionHours: 1.5,
      reworkHours: 3.0,
      materialMassKg: 0.15,
      cycleTimeSeconds: 3.0,
    },
    'DFM-RIB-001': {
      machiningHours: 1.5,
      toolingHours: 3.0,
      inspectionHours: 1.0,
      reworkHours: 2.5,
      materialMassKg: 0.10,
      cycleTimeSeconds: 2.0,
    },
    'DFM-HOLE-001': {
      machiningHours: 2.5,
      toolingHours: 5.0,
      inspectionHours: 2.0,
      reworkHours: 3.5,
      materialMassKg: 0.20,
      cycleTimeSeconds: 3.5,
    },
    DEFAULT: {
      machiningHours: 2.0,
      toolingHours: 4.0,
      inspectionHours: 1.5,
      reworkHours: 2.0,
      materialMassKg: 0.15,
      cycleTimeSeconds: 2.5,
    },
  };

  constructor(
    @InjectRepository(EngineeringCostConfiguration)
    private readonly costConfigRepo: Repository<EngineeringCostConfiguration>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Look up an authoritative rate from configuration. Never invents rates.
   */
  async lookupRate(
    tenantId: string,
    rateType: CostRateType,
    filters?: {
      workCenterId?: string;
      machineId?: string;
      materialId?: string;
      operationId?: string;
    },
  ): Promise<CostRateLookupResult> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const qb = this.costConfigRepo.createQueryBuilder('config')
      .where('config.tenant_id = :tenantId', { tenantId })
      .andWhere('config.rate_type = :rateType', { rateType })
      .andWhere('config.status = :status', { status: CostConfigurationStatus.ACTIVE });

    if (filters?.workCenterId) {
      qb.andWhere('(config.work_center_id = :workCenterId OR config.work_center_id IS NULL)', {
        workCenterId: filters.workCenterId,
      });
    }
    if (filters?.machineId) {
      qb.andWhere('(config.machine_id = :machineId OR config.machine_id IS NULL)', {
        machineId: filters.machineId,
      });
    }
    if (filters?.materialId) {
      qb.andWhere('(config.material_id = :materialId OR config.material_id IS NULL)', {
        materialId: filters.materialId,
      });
    }
    if (filters?.operationId) {
      qb.andWhere('(config.operation_id = :operationId OR config.operation_id IS NULL)', {
        operationId: filters.operationId,
      });
    }

    qb.orderBy('config.created_at', 'DESC');
    const match = await qb.getOne();

    if (!match) {
      return {
        rateValue: null,
        currency: 'INR',
        uom: 'UNIT',
        source: null,
        sourceReference: null,
        effectiveDate: null,
        configurationId: null,
        found: false,
      };
    }

    return {
      rateValue: Number(match.rateValue),
      currency: match.currency,
      uom: match.uom,
      source: match.source || match.rateName,
      sourceReference: match.sourceReference || match.id,
      effectiveDate: match.effectiveFrom,
      configurationId: match.id,
      found: true,
    };
  }

  /**
   * Synthesize operational and manufacturing cost impact across 6 categories.
   */
  async synthesizeCostImpact(
    ruleId: string,
    materialName: string,
    processType: string,
    tenantId: string,
    customContext?: Record<string, any>,
  ): Promise<CostSummary> {
    const factors = this.baselineEffortFactors[ruleId] || this.baselineEffortFactors.DEFAULT;
    const missingComponents: string[] = [];

    // 1. Material Cost Lookup
    const matRateResult = await this.lookupRate(tenantId, CostRateType.MATERIAL_UNIT, {
      materialId: customContext?.materialId,
    });
    const materialQuantity = customContext?.materialMassKg ?? factors.materialMassKg;
    const materialComponent: CostComponent = {
      componentId: `COST-MAT-${ruleId}`,
      category: 'MATERIAL',
      subCategory: `${materialName} Raw Material Impact`,
      description: `Raw material modification volume for ${materialName}`,
      quantity: materialQuantity,
      unit: 'KG',
      rate: matRateResult.rateValue,
      rateSource: matRateResult.source,
      rateTimestamp: matRateResult.effectiveDate ? matRateResult.effectiveDate.toISOString() : null,
      calculatedCost: matRateResult.found && matRateResult.rateValue !== null
        ? Number((materialQuantity * matRateResult.rateValue).toFixed(2))
        : null,
      currency: matRateResult.currency,
      status: matRateResult.found ? CostStatus.KNOWN : CostStatus.UNAVAILABLE,
      calculationMethod: 'MATERIAL_QUANTITY * MATERIAL_RATE',
      confidence: matRateResult.found ? 0.95 : 0.0,
      assumptions: [
        `Assumed density profile for ${materialName}`,
        matRateResult.found ? `Authoritative rate from ${matRateResult.source}` : 'Material rate not configured',
      ],
    };
    if (!matRateResult.found) missingComponents.push('MATERIAL');

    // 2. Machining Cost Lookup
    const machineRateResult = await this.lookupRate(tenantId, CostRateType.MACHINE_HOUR, {
      machineId: customContext?.machineId,
      workCenterId: customContext?.workCenterId,
    });
    const machiningHours = customContext?.machiningHours ?? factors.machiningHours;
    const machiningComponent: CostComponent = {
      componentId: `COST-MACH-${ruleId}`,
      category: 'MACHINING',
      subCategory: 'CNC & Finishing Operation',
      description: `Electrode machining, CNC milling, and EDM finishing for ${ruleId}`,
      quantity: machiningHours,
      unit: 'HOUR',
      rate: machineRateResult.rateValue,
      rateSource: machineRateResult.source,
      rateTimestamp: machineRateResult.effectiveDate ? machineRateResult.effectiveDate.toISOString() : null,
      calculatedCost: machineRateResult.found && machineRateResult.rateValue !== null
        ? Number((machiningHours * machineRateResult.rateValue).toFixed(2))
        : null,
      currency: machineRateResult.currency,
      status: machineRateResult.found ? CostStatus.ESTIMATED : CostStatus.UNAVAILABLE,
      calculationMethod: 'MACHINING_HOURS * MACHINE_HOUR_RATE',
      confidence: machineRateResult.found ? 0.90 : 0.0,
      assumptions: [
        `Machining effort estimated from toolpath complexity (${machiningHours} hrs)`,
        machineRateResult.found ? `Machine rate from ${machineRateResult.source}` : 'Machine hour rate not configured',
      ],
    };
    if (!machineRateResult.found) missingComponents.push('MACHINING');

    // 3. Tooling Setup / Modification Cost Lookup
    const toolingRateResult = await this.lookupRate(tenantId, CostRateType.TOOLING_SETUP, {
      operationId: customContext?.operationId,
    });
    const toolingHours = customContext?.toolingHours ?? factors.toolingHours;
    const toolingComponent: CostComponent = {
      componentId: `COST-TOOL-${ruleId}`,
      category: 'TOOLING',
      subCategory: 'Mold Insert & Core Pin Modification',
      description: `Tooling rework and core pin modification for ${ruleId}`,
      quantity: toolingHours,
      unit: 'HOUR',
      rate: toolingRateResult.rateValue,
      rateSource: toolingRateResult.source,
      rateTimestamp: toolingRateResult.effectiveDate ? toolingRateResult.effectiveDate.toISOString() : null,
      calculatedCost: toolingRateResult.found && toolingRateResult.rateValue !== null
        ? Number((toolingHours * toolingRateResult.rateValue).toFixed(2))
        : null,
      currency: toolingRateResult.currency,
      status: toolingRateResult.found ? CostStatus.ESTIMATED : CostStatus.UNAVAILABLE,
      calculationMethod: 'TOOLING_HOURS * TOOLING_SETUP_RATE',
      confidence: toolingRateResult.found ? 0.88 : 0.0,
      assumptions: [
        `Core pin & insert rework required (${toolingHours} hrs)`,
        toolingRateResult.found ? `Tooling rate from ${toolingRateResult.source}` : 'Tooling setup rate not configured',
      ],
    };
    if (!toolingRateResult.found) missingComponents.push('TOOLING');

    // 4. Quality / Inspection Cost Lookup
    const qualityRateResult = await this.lookupRate(tenantId, CostRateType.INSPECTION_HOUR);
    const inspectionHours = customContext?.inspectionHours ?? factors.inspectionHours;
    const qualityComponent: CostComponent = {
      componentId: `COST-QUAL-${ruleId}`,
      category: 'QUALITY',
      subCategory: 'CMM & Visual Inspection',
      description: `First article inspection and CMM validation for ${ruleId}`,
      quantity: inspectionHours,
      unit: 'HOUR',
      rate: qualityRateResult.rateValue,
      rateSource: qualityRateResult.source,
      rateTimestamp: qualityRateResult.effectiveDate ? qualityRateResult.effectiveDate.toISOString() : null,
      calculatedCost: qualityRateResult.found && qualityRateResult.rateValue !== null
        ? Number((inspectionHours * qualityRateResult.rateValue).toFixed(2))
        : null,
      currency: qualityRateResult.currency,
      status: qualityRateResult.found ? CostStatus.ESTIMATED : CostStatus.UNAVAILABLE,
      calculationMethod: 'INSPECTION_HOURS * INSPECTION_RATE',
      confidence: qualityRateResult.found ? 0.92 : 0.0,
      assumptions: [
        `CMM probe verification required (${inspectionHours} hrs)`,
        qualityRateResult.found ? `Inspection rate from ${qualityRateResult.source}` : 'Inspection rate not configured',
      ],
    };
    if (!qualityRateResult.found) missingComponents.push('QUALITY');

    // 5. Schedule Impact (Cycle Time / Machine Delay)
    const setupRateResult = await this.lookupRate(tenantId, CostRateType.SETUP_HOUR);
    const cycleTimeSec = factors.cycleTimeSeconds;
    const scheduleComponent: CostComponent = {
      componentId: `COST-SCHED-${ruleId}`,
      category: 'SCHEDULE',
      subCategory: 'Cycle Time & Setup Overhead',
      description: `Added molding cycle time of +${cycleTimeSec}s per shot and trial calibration`,
      quantity: Number((cycleTimeSec / 3600).toFixed(4)),
      unit: 'HOUR_PER_SHOT',
      rate: setupRateResult.rateValue,
      rateSource: setupRateResult.source,
      rateTimestamp: setupRateResult.effectiveDate ? setupRateResult.effectiveDate.toISOString() : null,
      calculatedCost: setupRateResult.found && setupRateResult.rateValue !== null
        ? Number(((cycleTimeSec / 3600) * setupRateResult.rateValue * 1000).toFixed(2)) // per 1k shots
        : null,
      currency: setupRateResult.currency,
      status: setupRateResult.found ? CostStatus.ESTIMATED : CostStatus.UNAVAILABLE,
      calculationMethod: '(CYCLE_TIME_SECONDS / 3600) * SETUP_RATE * 1000',
      confidence: setupRateResult.found ? 0.85 : 0.0,
      assumptions: [
        `Estimated thermal cooling delay of ${cycleTimeSec} seconds per cycle`,
        setupRateResult.found ? `Rate from ${setupRateResult.source}` : 'Setup rate not configured',
      ],
    };
    if (!setupRateResult.found) missingComponents.push('SCHEDULE');

    // 6. Rework Cost Lookup
    const reworkRateResult = await this.lookupRate(tenantId, CostRateType.REWORK_HOUR);
    const reworkHours = customContext?.reworkHours ?? factors.reworkHours;
    const reworkComponent: CostComponent = {
      componentId: `COST-REW-${ruleId}`,
      category: 'REWORK',
      subCategory: 'Part Rectification & Deburring',
      description: `Potential post-mold rectification & bench deburring for ${ruleId}`,
      quantity: reworkHours,
      unit: 'HOUR',
      rate: reworkRateResult.rateValue,
      rateSource: reworkRateResult.source,
      rateTimestamp: reworkRateResult.effectiveDate ? reworkRateResult.effectiveDate.toISOString() : null,
      calculatedCost: reworkRateResult.found && reworkRateResult.rateValue !== null
        ? Number((reworkHours * reworkRateResult.rateValue).toFixed(2))
        : null,
      currency: reworkRateResult.currency,
      status: reworkRateResult.found ? CostStatus.ESTIMATED : CostStatus.UNAVAILABLE,
      calculationMethod: 'REWORK_HOURS * REWORK_RATE',
      confidence: reworkRateResult.found ? 0.80 : 0.0,
      assumptions: [
        `Estimated bench polishing & fitment effort (${reworkHours} hrs)`,
        reworkRateResult.found ? `Rework rate from ${reworkRateResult.source}` : 'Rework rate not configured',
      ],
    };
    if (!reworkRateResult.found) missingComponents.push('REWORK');

    // Aggregation of 3-point range
    const components = [
      materialComponent,
      machiningComponent,
      toolingComponent,
      qualityComponent,
      scheduleComponent,
      reworkComponent,
    ];

    const availableCosts = components
      .map((c) => c.calculatedCost)
      .filter((cost): cost is number => cost !== null);

    let expectedTotal: number | null = null;
    let lowTotal: number | null = null;
    let highTotal: number | null = null;

    if (availableCosts.length > 0) {
      expectedTotal = Number(availableCosts.reduce((sum, c) => sum + c, 0).toFixed(2));
      lowTotal = Number((expectedTotal * 0.85).toFixed(2));
      highTotal = Number((expectedTotal * 1.25).toFixed(2));
    }

    const defaultCurrency = matRateResult.currency || machineRateResult.currency || 'INR';

    return {
      material: [materialComponent],
      machining: [machiningComponent],
      tooling: [toolingComponent],
      quality: [qualityComponent],
      schedule: [scheduleComponent],
      rework: [reworkComponent],
      total: {
        low: lowTotal,
        expected: expectedTotal,
        high: highTotal,
        currency: defaultCurrency,
      },
      costRangeModel: 'THREE_POINT',
      missingComponents,
    };
  }

  /**
   * Create a new cost configuration rate.
   */
  async createCostConfiguration(
    dto: CreateCostConfigurationDto,
    tenantId: string,
    user?: any,
  ): Promise<EngineeringCostConfiguration> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const entity = this.costConfigRepo.create({
      tenantId,
      rateType: dto.rateType,
      rateName: dto.rateName,
      workCenterId: dto.workCenterId || null,
      machineId: dto.machineId || null,
      materialId: dto.materialId || null,
      operationId: dto.operationId || null,
      rateValue: dto.rateValue,
      currency: dto.currency || 'INR',
      uom: dto.uom || 'HOUR',
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      source: dto.source || 'MANUAL_ENTRY',
      sourceReference: dto.sourceReference || null,
      status: dto.status || CostConfigurationStatus.ACTIVE,
      notes: dto.notes || null,
      metadata: dto.metadata || null,
    });

    const saved = await this.costConfigRepo.save(entity);

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'COST_CONFIGURATION_CREATED',
      entityType: 'ENGINEERING_COST_CONFIGURATION',
      entityId: saved.id,
      metadata: {
        rateType: saved.rateType,
        rateName: saved.rateName,
        rateValue: saved.rateValue,
        currency: saved.currency,
      },
    });

    return saved;
  }

  /**
   * Query cost configurations with tenant filtering.
   */
  async getCostConfigurations(
    query: QueryCostConfigurationsDto,
    tenantId: string,
  ): Promise<{ data: EngineeringCostConfiguration[]; total: number }> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const qb = this.costConfigRepo.createQueryBuilder('config')
      .where('config.tenant_id = :tenantId', { tenantId });

    if (query.rateType) {
      qb.andWhere('config.rate_type = :rateType', { rateType: query.rateType });
    }
    if (query.status) {
      qb.andWhere('config.status = :status', { status: query.status });
    }
    if (query.workCenterId) {
      qb.andWhere('config.work_center_id = :workCenterId', { workCenterId: query.workCenterId });
    }
    if (query.machineId) {
      qb.andWhere('config.machine_id = :machineId', { machineId: query.machineId });
    }
    if (query.materialId) {
      qb.andWhere('config.material_id = :materialId', { materialId: query.materialId });
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('config.created_at', 'DESC');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Get a single cost configuration by ID.
   */
  async getCostConfigurationById(
    id: string,
    tenantId: string,
  ): Promise<EngineeringCostConfiguration> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const config = await this.costConfigRepo.findOne({
      where: { id, tenantId },
    });

    if (!config) {
      throw new NotFoundException(`Cost configuration '${id}' not found.`);
    }

    return config;
  }

  /**
   * Update an existing cost configuration.
   */
  async updateCostConfiguration(
    id: string,
    dto: UpdateCostConfigurationDto,
    tenantId: string,
    user?: any,
  ): Promise<EngineeringCostConfiguration> {
    const config = await this.getCostConfigurationById(id, tenantId);

    if (dto.rateName !== undefined) config.rateName = dto.rateName;
    if (dto.rateValue !== undefined) config.rateValue = dto.rateValue;
    if (dto.currency !== undefined) config.currency = dto.currency;
    if (dto.uom !== undefined) config.uom = dto.uom;
    if (dto.effectiveFrom !== undefined) config.effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    if (dto.effectiveTo !== undefined) config.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (dto.source !== undefined) config.source = dto.source;
    if (dto.sourceReference !== undefined) config.sourceReference = dto.sourceReference;
    if (dto.status !== undefined) config.status = dto.status;
    if (dto.notes !== undefined) config.notes = dto.notes;
    if (dto.metadata !== undefined) config.metadata = dto.metadata;

    const updated = await this.costConfigRepo.save(config);

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'COST_CONFIGURATION_UPDATED',
      entityType: 'ENGINEERING_COST_CONFIGURATION',
      entityId: updated.id,
      metadata: {
        rateType: updated.rateType,
        rateValue: updated.rateValue,
        status: updated.status,
      },
    });

    return updated;
  }

  /**
   * Delete a cost configuration.
   */
  async deleteCostConfiguration(
    id: string,
    tenantId: string,
    user?: any,
  ): Promise<void> {
    const config = await this.getCostConfigurationById(id, tenantId);
    await this.costConfigRepo.remove(config);

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'COST_CONFIGURATION_DELETED',
      entityType: 'ENGINEERING_COST_CONFIGURATION',
      entityId: id,
    });
  }
}
