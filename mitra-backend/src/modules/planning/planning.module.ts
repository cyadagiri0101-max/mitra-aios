import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessPlan } from './entities/processplan.entity';
import { ProcessRouting } from './entities/processrouting.entity';
import { ProcessStep } from './entities/processstep.entity';
import { ResourceAllocation } from './entities/resourceallocation.entity';
import { ProcessPlanService } from './services/processplan.service';
import { ProcessPlanController } from './controllers/processplan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessPlan, ProcessRouting, ProcessStep, ResourceAllocation])],
  controllers: [ProcessPlanController],
  providers: [ProcessPlanService],
  exports: [ProcessPlanService, TypeOrmModule],
})
export class PlanningModule {}
