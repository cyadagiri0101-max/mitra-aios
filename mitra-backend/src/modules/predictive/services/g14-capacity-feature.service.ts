import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, MoreThan } from 'typeorm';
import { createHash } from 'crypto';
import { MachineMaster, MachineStatus } from '../../machine/entities/machinemaster.entity';
import { MachineBooking, BookingStatus } from '../../machine/entities/machinebooking.entity';
import { WorkOrder, WorkOrderStatus } from '../../manufacturing/entities/workorder.entity';
import { G14CapacitySnapshot } from '../entities/g14-capacity-snapshot.entity';
import { AuditService } from '../../audit/services/audit.service';
import {
  ExtractCapacityFeaturesDto,
  G14CapacityFeatureVector,
  G14CapacityFeatureMetadata,
  G14CapacityPredictionTarget,
} from '../dto/g14-capacity.dto';

export const G14_CURRENT_CAPACITY_VERSION = 'G14_CAPACITY_V1';

@Injectable()
export class G14CapacityFeatureService {
  private readonly logger = new Logger(G14CapacityFeatureService.name);

  constructor(
    @InjectRepository(MachineMaster)
    private readonly machineRepository: Repository<MachineMaster>,
    @InjectRepository(MachineBooking)
    private readonly bookingRepository: Repository<MachineBooking>,
    @InjectRepository(WorkOrder)
    private readonly workOrderRepository: Repository<WorkOrder>,
    @InjectRepository(G14CapacitySnapshot)
    private readonly snapshotRepository: Repository<G14CapacitySnapshot>,
    private readonly auditService: AuditService,
  ) {}

  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for capacity feature extraction');
    }
    return tenantId;
  }

  /**
   * Extracts historical machine capacity features and produces a 15-D normalized vector.
   */
  async extractMachineCapacityFeatures(
    dto: ExtractCapacityFeaturesDto,
    tenantId: string,
  ): Promise<{
    featureVector: G14CapacityFeatureVector;
    featureMetadata: G14CapacityFeatureMetadata;
    groundTruthTarget?: G14CapacityPredictionTarget | null;
    sourceRecordsHash: string;
    snapshot?: G14CapacitySnapshot;
  }> {
    const scopeTenant = this.requireTenant(tenantId);
    const cutoff = dto.predictionCutoff ? new Date(dto.predictionCutoff) : new Date();
    const horizonDays = dto.forecastHorizonDays || 30;
    const featureVersion = dto.featureVersion || G14_CURRENT_CAPACITY_VERSION;

    if (featureVersion !== G14_CURRENT_CAPACITY_VERSION) {
      throw new BadRequestException(
        `Unsupported capacity feature version: ${featureVersion}. Supported version: ${G14_CURRENT_CAPACITY_VERSION}`,
      );
    }

    // 1. Fetch Machine
    const machine = await this.machineRepository.findOne({
      where: { id: dto.machineId, tenantId: scopeTenant, deletedAt: IsNull() },
    });

    if (!machine) {
      throw new NotFoundException(
        `Machine ${dto.machineId} not found for current tenant.`,
      );
    }

    // 2. Fetch Bookings on or before cutoff
    const bookings = await this.bookingRepository.find({
      where: {
        tenantId: scopeTenant,
        machineId: machine.id,
        createdAt: LessThanOrEqual(cutoff),
        deletedAt: IsNull(),
      },
    });

    const futureExcludedBookings = await this.bookingRepository.count({
      where: {
        tenantId: scopeTenant,
        machineId: machine.id,
        createdAt: MoreThan(cutoff),
        deletedAt: IsNull(),
      },
    });

    // 3. Fetch Work Orders on or before cutoff
    const workOrders = await this.workOrderRepository.find({
      where: {
        tenantId: scopeTenant,
        createdAt: LessThanOrEqual(cutoff),
        deletedAt: IsNull(),
      },
    });

    const futureExcludedWorkOrders = await this.workOrderRepository.count({
      where: {
        tenantId: scopeTenant,
        createdAt: MoreThan(cutoff),
        deletedAt: IsNull(),
      },
    });

    // 4. Calculate Available Capacity in Horizon Window
    const dailyStandardHours = 8.0;
    const availableMachineHours = machine.status === MachineStatus.ACTIVE
      ? horizonDays * dailyStandardHours
      : 0.0;

    // 5. Aggregate Booked Demand
    let bookedDemandHours = 0;
    let activeBookingsCount = 0;
    const activeProjectIds = new Set<string>();

    for (const b of bookings) {
      if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.IN_USE) {
        bookedDemandHours += Number(b.bookedHours || 0);
        activeBookingsCount++;
        if (b.projectId) {
          activeProjectIds.add(b.projectId);
        }
      }
    }

    // 6. Aggregate Work Order Load
    let scheduledWorkOrderHours = 0;
    let queueDepthWorkOrders = 0;
    let overdueWorkOrdersCount = 0;
    let nearTermDueLoadHours = 0;
    const sevenDaysFromCutoff = new Date(cutoff.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const wo of workOrders) {
      if (
        wo.status === WorkOrderStatus.RELEASED ||
        wo.status === WorkOrderStatus.IN_PROGRESS ||
        wo.status === WorkOrderStatus.ON_HOLD
      ) {
        const estHours = Number(wo.estimatedHours || wo.plannedQty || 10) * 0.5;
        scheduledWorkOrderHours += estHours;
        queueDepthWorkOrders++;

        if (wo.plannedEndDate && new Date(wo.plannedEndDate) < cutoff) {
          overdueWorkOrdersCount++;
        }

        if (
          wo.plannedEndDate &&
          new Date(wo.plannedEndDate) >= cutoff &&
          new Date(wo.plannedEndDate) <= sevenDaysFromCutoff
        ) {
          nearTermDueLoadHours += estHours;
        }

        if (wo.projectId) {
          activeProjectIds.add(wo.projectId);
        }
      }
    }

    const totalDemandHours = Number((bookedDemandHours + scheduledWorkOrderHours).toFixed(2));
    const capacityUtilizationRatio =
      availableMachineHours > 0
        ? Number((totalDemandHours / availableMachineHours).toFixed(4))
        : 1.0;
    const historicalDeficitHours = Number(
      Math.max(0, totalDemandHours - availableMachineHours).toFixed(2),
    );

    const maintenanceDowntimeHours =
      machine.status === MachineStatus.UNDER_MAINTENANCE ? horizonDays * dailyStandardHours : 0;
    const costPerHourRate = Number(machine.costPerHour || 50.0);
    const isActive = machine.status === MachineStatus.ACTIVE;
    const concurrentProjectCount = activeProjectIds.size;

    // 7. Construct 15-D Normalized Dense Vector
    const denseVector: number[] = [
      Number((availableMachineHours / 240.0).toFixed(4)), // 0: Available hours / standard 30d
      Number((bookedDemandHours / 100.0).toFixed(4)), // 1: Booked hours normalized
      Number((scheduledWorkOrderHours / 100.0).toFixed(4)), // 2: WO hours normalized
      Number((totalDemandHours / 200.0).toFixed(4)), // 3: Total demand normalized
      Number(Math.min(3.0, capacityUtilizationRatio).toFixed(4)), // 4: Utilization ratio clamped
      Number((historicalDeficitHours / 50.0).toFixed(4)), // 5: Deficit hours
      Number(queueDepthWorkOrders), // 6: Queue depth
      Number(overdueWorkOrdersCount), // 7: Overdue count
      Number(activeBookingsCount), // 8: Active bookings
      Number((maintenanceDowntimeHours / 50.0).toFixed(4)), // 9: Downtime hours
      Number((costPerHourRate / 100.0).toFixed(4)), // 10: Cost rate
      isActive ? 1.0 : 0.0, // 11: Active flag
      Number((nearTermDueLoadHours / 50.0).toFixed(4)), // 12: Near term load
      Number(concurrentProjectCount), // 13: Competing projects
      Number((horizonDays / 30.0).toFixed(4)), // 14: Horizon ratio
    ];

    const featureVector: G14CapacityFeatureVector = {
      machine: {
        availableMachineHours,
        bookedDemandHours,
        scheduledWorkOrderHours,
        totalDemandHours,
        capacityUtilizationRatio,
        historicalDeficitHours,
        queueDepthWorkOrders,
        overdueWorkOrdersCount,
        activeBookingsCount,
        maintenanceDowntimeHours,
        costPerHourRate,
        isActive,
        nearTermDueLoadHours,
        concurrentProjectCount,
        forecastHorizonDays: horizonDays,
      },
      denseVector,
    };

    const featureMetadata: G14CapacityFeatureMetadata = {
      extractedAt: new Date().toISOString(),
      predictionCutoff: cutoff.toISOString(),
      forecastHorizonDays: horizonDays,
      featureVersion,
      sourceCounts: {
        bookingsCount: bookings.length,
        workOrdersCount: workOrders.length,
        futureExcludedBookings,
        futureExcludedWorkOrders,
      },
      dataQuality: {
        hasMaintenanceRecord: machine.lastMaintenanceDate !== null,
        isOperating: isActive,
        hasZeroAvailableHours: availableMachineHours === 0,
      },
    };

    // 8. Ground Truth Target Computation (if requested for training)
    let groundTruthTarget: G14CapacityPredictionTarget | null = null;
    if (dto.computeGroundTruthTarget) {
      const actualDemandHours = totalDemandHours;
      const capacityDeficitHours = Math.max(0, actualDemandHours - availableMachineHours);
      const isOverloaded = capacityDeficitHours > 0;
      const actualUtilizationRatio =
        availableMachineHours > 0 ? actualDemandHours / availableMachineHours : 1.0;

      groundTruthTarget = {
        capacityDeficitHours: Number(capacityDeficitHours.toFixed(2)),
        isOverloaded,
        actualUtilizationRatio: Number(actualUtilizationRatio.toFixed(4)),
        actualDemandHours: Number(actualDemandHours.toFixed(2)),
      };
    }

    // 9. Provenance Digest
    const sortedBookingIds = bookings.map((b) => b.id).sort().join(',');
    const sortedWorkOrderIds = workOrders.map((w) => w.id).sort().join(',');
    const sourceRecordsHash = createHash('sha256')
      .update(`${machine.id}|${sortedBookingIds}|${sortedWorkOrderIds}|${cutoff.toISOString()}`)
      .digest('hex');

    // 10. Persist Snapshot if requested
    let snapshot: G14CapacitySnapshot | undefined;
    if (dto.persistSnapshot) {
      snapshot = await this.snapshotRepository.save({
        tenantId: scopeTenant,
        machineId: machine.id,
        predictionCutoff: cutoff,
        forecastHorizonDays: horizonDays,
        featureVersion,
        featureVector,
        featureMetadata,
        groundTruthTarget,
        sourceRecordsHash,
      });

      await this.auditService.log({
        action: 'G14_CAPACITY_SNAPSHOT_EXTRACTED',
        entityType: 'MachineMaster',
        entityId: machine.id,
        tenantId: scopeTenant,
        metadata: {
          cutoff: cutoff.toISOString(),
          horizonDays,
          sourceRecordsHash,
        },
      });
    }

    return {
      featureVector,
      featureMetadata,
      groundTruthTarget,
      sourceRecordsHash,
      snapshot,
    };
  }
}
