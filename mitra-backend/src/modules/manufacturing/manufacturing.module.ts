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
import { WorkOrderService } from './services/workorder.service';
import { WorkOrderEngineService } from './services/work-order-engine.service';
import { ShopFloorService } from './services/shop-floor.service';
import { SchedulingService } from './services/scheduling.service';
import { MaterialManagementService } from './services/material-management.service';
import { InspectionService } from './services/inspection.service';
import { ProductionTrackingService } from './services/production-tracking.service';
import { WorkOrderController } from './controllers/workorder.controller';
import { JobCardController } from './controllers/jobcard.controller';
import { SchedulingController } from './controllers/scheduling.controller';
import { MaterialManagementController } from './controllers/material-management.controller';
import { InspectionController } from './controllers/inspection.controller';
import { ProductionTrackingController } from './controllers/production-tracking.controller';
import { WorkflowModule } from '../workflow/workflow.module';
import { PlatformModule } from '../platform/platform.module';
import { QualityModule } from '../quality/quality.module';
import { MachineModule } from '../machine/machine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder, Operation, OperationLog, ProductionBatch, MaterialIssue, JobCard,
      InspectionCheckpoint, MaterialReservation,
    ]),
    WorkflowModule,
    PlatformModule,
    QualityModule,
    MachineModule,
  ],
  controllers: [
    WorkOrderController,
    JobCardController,
    SchedulingController,
    MaterialManagementController,
    InspectionController,
    ProductionTrackingController,
  ],
  providers: [
    WorkOrderService,
    WorkOrderEngineService,
    ShopFloorService,
    SchedulingService,
    MaterialManagementService,
    InspectionService,
    ProductionTrackingService,
  ],
  exports: [WorkOrderService, WorkOrderEngineService, ShopFloorService, SchedulingService, MaterialManagementService, InspectionService, ProductionTrackingService, TypeOrmModule],
})
export class ManufacturingModule {}
