import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from './entities/workorder.entity';
import { Operation } from './entities/operation.entity';
import { OperationLog } from './entities/operationlog.entity';
import { ProductionBatch } from './entities/productionbatch.entity';
import { MaterialIssue } from './entities/materialissue.entity';
import { JobCard } from './entities/jobcard.entity';
import { InspectionCheckpoint } from './entities/inspection-checkpoint.entity';
import { MaterialReservation } from './entities/material-reservation.entity';
import { ManufacturingSignal } from './entities/manufacturing-signal.entity';
import { ManufacturingObservation } from './entities/manufacturing-observation.entity';
import { OperationalRecommendation } from './entities/operational-recommendation.entity';
import { WorkOrderService } from './services/workorder.service';
import { WorkOrderEngineService } from './services/work-order-engine.service';
import { ShopFloorService } from './services/shop-floor.service';
import { SchedulingService } from './services/scheduling.service';
import { MaterialManagementService } from './services/material-management.service';
import { InspectionService } from './services/inspection.service';
import { ProductionTrackingService } from './services/production-tracking.service';
import { ManufacturingTelemetryService } from './services/manufacturing-telemetry.service';
import { OperationalClosedLoopService } from './services/operational-closed-loop.service';
import { WorkOrderController } from './controllers/workorder.controller';
import { JobCardController } from './controllers/jobcard.controller';
import { SchedulingController } from './controllers/scheduling.controller';
import { MaterialManagementController } from './controllers/material-management.controller';
import { InspectionController } from './controllers/inspection.controller';
import { ProductionTrackingController } from './controllers/production-tracking.controller';
import { ManufacturingTelemetryController } from './controllers/manufacturing-telemetry.controller';
import { WorkflowModule } from '../workflow/workflow.module';
import { PlatformModule } from '../platform/platform.module';
import { QualityModule } from '../quality/quality.module';
import { MachineModule } from '../machine/machine.module';
import { EkosModule } from '../ekos/ekos.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder,
      Operation,
      OperationLog,
      ProductionBatch,
      MaterialIssue,
      JobCard,
      InspectionCheckpoint,
      MaterialReservation,
      ManufacturingSignal,
      ManufacturingObservation,
      OperationalRecommendation,
    ]),
    WorkflowModule,
    PlatformModule,
    QualityModule,
    MachineModule,
    EkosModule,
    AuditModule,
  ],
  controllers: [
    WorkOrderController,
    JobCardController,
    SchedulingController,
    MaterialManagementController,
    InspectionController,
    ProductionTrackingController,
    ManufacturingTelemetryController,
  ],
  providers: [
    WorkOrderService,
    WorkOrderEngineService,
    ShopFloorService,
    SchedulingService,
    MaterialManagementService,
    InspectionService,
    ProductionTrackingService,
    ManufacturingTelemetryService,
    OperationalClosedLoopService,
  ],
  exports: [
    WorkOrderService,
    WorkOrderEngineService,
    ShopFloorService,
    SchedulingService,
    MaterialManagementService,
    InspectionService,
    ProductionTrackingService,
    ManufacturingTelemetryService,
    OperationalClosedLoopService,
    TypeOrmModule,
  ],
})
export class ManufacturingModule {}
