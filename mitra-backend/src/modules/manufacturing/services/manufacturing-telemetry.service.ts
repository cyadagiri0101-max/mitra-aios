import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ManufacturingSignal,
  ManufacturingSignalType,
  SignalQualityStatus,
} from '../entities/manufacturing-signal.entity';
import {
  ManufacturingObservation,
  ObservationSeverity,
} from '../entities/manufacturing-observation.entity';
import { WorkOrder } from '../entities/workorder.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { EkosEntityType } from '../../ekos/entities/ekos-graph-node.entity';
import {
  EkosRelationType,
  EkosProvenanceType,
} from '../../ekos/entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';
import {
  IngestSignalDto,
  BatchIngestSignalDto,
  CreateObservationDto,
  IngestionResult,
} from '../dto/manufacturing-telemetry.dto';

@Injectable()
export class ManufacturingTelemetryService {
  private readonly logger = new Logger(ManufacturingTelemetryService.name);

  constructor(
    @InjectRepository(ManufacturingSignal)
    private readonly signalRepo: Repository<ManufacturingSignal>,
    @InjectRepository(ManufacturingObservation)
    private readonly observationRepo: Repository<ManufacturingObservation>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly ekosGraphService: EkosGraphService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Ingest and normalize a manufacturing telemetry signal with data-quality governance.
   */
  async ingestSignal(
    dto: IngestSignalDto,
    tenantId: string,
  ): Promise<ManufacturingSignal> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const eventTime = new Date(dto.eventTimestamp);
    if (isNaN(eventTime.getTime())) {
      throw new ForbiddenException('Invalid event timestamp format.');
    }

    // Quality check: range validation
    let status = SignalQualityStatus.VALID;
    if (dto.value < 0 && dto.signalType !== ManufacturingSignalType.TEMPERATURE) {
      status = SignalQualityStatus.INVALID;
    } else if (dto.signalType === ManufacturingSignalType.RPM && dto.value > 60000) {
      status = SignalQualityStatus.OUT_OF_RANGE;
    } else if (dto.signalType === ManufacturingSignalType.TEMPERATURE && dto.value > 1500) {
      status = SignalQualityStatus.OUT_OF_RANGE;
    }

    // Late event check: > 7 days in the past
    const now = Date.now();
    if (now - eventTime.getTime() > 7 * 24 * 60 * 60 * 1000) {
      status = SignalQualityStatus.LATE;
    }

    // Idempotency check: duplicate event with same sourceId, signalType, and eventTimestamp
    const existing = await this.signalRepo.findOne({
      where: {
        tenantId,
        sourceId: dto.sourceId,
        signalType: dto.signalType,
        eventTimestamp: eventTime,
      },
    });

    if (existing) {
      this.logger.debug(`Duplicate signal detected for source ${dto.sourceId} at ${dto.eventTimestamp}`);
      return existing;
    }

    // Correlate project if work order is provided
    let projectId = dto.projectId;
    if (!projectId && dto.workOrderId) {
      const wo = await this.workOrderRepo.findOne({
        where: { id: dto.workOrderId, tenantId },
      });
      if (wo) {
        projectId = wo.projectId || undefined;
      }
    }

    const signal = this.signalRepo.create({
      tenantId,
      sourceId: dto.sourceId,
      sourceType: dto.sourceType,
      signalType: dto.signalType,
      value: dto.value,
      unit: dto.unit,
      machineId: dto.machineId || null,
      workOrderId: dto.workOrderId || null,
      operationId: dto.operationId || null,
      projectId: projectId || null,
      status,
      eventTimestamp: eventTime,
      correlationId: dto.correlationId || null,
      rawPayload: dto.rawPayload || {},
    });

    const saved = await this.signalRepo.save(signal);

    await this.auditService.log({
      tenantId,
      action: 'MANUFACTURING_TELEMETRY_INGESTED',
      entityType: 'MANUFACTURING_SIGNAL',
      entityId: saved.id,
      metadata: {
        signalType: saved.signalType,
        value: saved.value,
        unit: saved.unit,
        machineId: saved.machineId,
        status: saved.status,
      },
    });

    return saved;
  }

  /**
   * Batch ingest manufacturing signals.
   */
  async batchIngest(
    dto: BatchIngestSignalDto,
    tenantId: string,
  ): Promise<IngestionResult> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    let acceptedCount = 0;
    let rejectedCount = 0;
    let quarantinedCount = 0;
    const results: { id: string; status: string; correlationId?: string }[] = [];

    for (const signalDto of dto.signals) {
      try {
        const saved = await this.ingestSignal(signalDto, tenantId);
        if (saved.status === SignalQualityStatus.VALID) {
          acceptedCount++;
        } else if (
          saved.status === SignalQualityStatus.INVALID ||
          saved.status === SignalQualityStatus.OUT_OF_RANGE
        ) {
          quarantinedCount++;
        } else {
          rejectedCount++;
        }
        results.push({
          id: saved.id,
          status: saved.status,
          correlationId: saved.correlationId || undefined,
        });
      } catch (err) {
        rejectedCount++;
      }
    }

    return {
      acceptedCount,
      rejectedCount,
      quarantinedCount,
      signals: results,
    };
  }

  /**
   * Record a manufacturing operator observation with EKOS lineage integration.
   */
  async createObservation(
    dto: CreateObservationDto,
    tenantId: string,
    user?: any,
  ): Promise<ManufacturingObservation> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const obs = this.observationRepo.create({
      tenantId,
      observationType: dto.observationType,
      source: dto.source || 'OPERATOR',
      machineId: dto.machineId || null,
      workOrderId: dto.workOrderId || null,
      operationId: dto.operationId || null,
      projectId: dto.projectId || null,
      trialId: dto.trialId || null,
      severity: dto.severity || ObservationSeverity.MEDIUM,
      title: dto.title,
      description: dto.description || null,
      metrics: dto.metrics || {},
      createdByUserId: user?.id || null,
    });

    const saved = await this.observationRepo.save(obs);

    // Project observation into EKOS Lineage Graph
    try {
      const obsNode = await this.ekosGraphService.registerNode(
        {
          entityType: EkosEntityType.TRIAL_OBSERVATION,
          entityId: saved.id,
          projectId: saved.projectId || undefined,
          label: `Obs: ${saved.title} (${saved.severity})`,
          metadata: {
            observationType: saved.observationType,
            severity: saved.severity,
            source: saved.source,
          },
          provenanceSource: 'SHOP_FLOOR_FEEDBACK',
        },
        tenantId,
      );

      // Link to machine if present
      if (saved.machineId) {
        await this.ekosGraphService.recordEdge(
          {
            sourceEntityType: EkosEntityType.TRIAL_OBSERVATION,
            sourceEntityId: saved.id,
            targetEntityType: EkosEntityType.MACHINE,
            targetEntityId: saved.machineId,
            relationType: EkosRelationType.OBSERVED_IN,
            provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
            projectId: saved.projectId || undefined,
          },
          tenantId,
          user,
        );
      }

      // Link to work order if present
      if (saved.workOrderId) {
        await this.ekosGraphService.recordEdge(
          {
            sourceEntityType: EkosEntityType.TRIAL_OBSERVATION,
            sourceEntityId: saved.id,
            targetEntityType: EkosEntityType.WORK_ORDER,
            targetEntityId: saved.workOrderId,
            relationType: EkosRelationType.OBSERVED_IN,
            provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
            projectId: saved.projectId || undefined,
          },
          tenantId,
          user,
        );
      }
    } catch (graphErr: any) {
      this.logger.warn(`EKOS projection failed for observation ${saved.id}: ${graphErr?.message || graphErr}`);
    }

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'MANUFACTURING_OBSERVATION_RECORDED',
      entityType: 'MANUFACTURING_OBSERVATION',
      entityId: saved.id,
      metadata: {
        title: saved.title,
        severity: saved.severity,
        machineId: saved.machineId,
        workOrderId: saved.workOrderId,
      },
    });

    return saved;
  }

  /**
   * Get recent signals by machine ID with multi-tenant isolation.
   */
  async getSignalsByMachine(
    machineId: string,
    tenantId: string,
    limit = 50,
  ): Promise<ManufacturingSignal[]> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    return this.signalRepo.find({
      where: { machineId, tenantId },
      order: { eventTimestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get feedback & observations by Work Order ID.
   */
  async getFeedbackByWorkOrder(
    workOrderId: string,
    tenantId: string,
  ): Promise<{ signals: ManufacturingSignal[]; observations: ManufacturingObservation[] }> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const signals = await this.signalRepo.find({
      where: { workOrderId, tenantId },
      order: { eventTimestamp: 'DESC' },
      take: 100,
    });

    const observations = await this.observationRepo.find({
      where: { workOrderId, tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return { signals, observations };
  }
}
