import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowState } from './entities/workflow-state.entity';
import { WorkflowTransition } from './entities/workflow-transition.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowService } from './services/workflow.service';
import { WorkflowController } from './controllers/workflow.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowState, WorkflowTransition, WorkflowInstance])],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService, TypeOrmModule],
})
export class WorkflowModule {}
