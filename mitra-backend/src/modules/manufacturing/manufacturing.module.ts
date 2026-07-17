import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from './entities/workorder.entity';
import { Operation } from './entities/operation.entity';
import { OperationLog } from './entities/operationlog.entity';
import { ProductionBatch } from './entities/productionbatch.entity';
import { MaterialIssue } from './entities/materialissue.entity';
import { JobCard } from './entities/jobcard.entity';
import { WorkOrderService } from './services/workorder.service';
import { WorkOrderController } from './controllers/workorder.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, Operation, OperationLog, ProductionBatch, MaterialIssue, JobCard])],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
  exports: [WorkOrderService, TypeOrmModule],
})
export class ManufacturingModule {}
