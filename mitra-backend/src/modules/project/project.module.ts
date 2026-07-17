import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMilestone } from './entities/projectmilestone.entity';
import { ProjectBudget } from './entities/projectbudget.entity';
import { ProjectResource } from './entities/projectresource.entity';
import { ProjectService } from './services/project.service';
import { ProjectController } from './controllers/project.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMilestone, ProjectBudget, ProjectResource]),
    WorkflowModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService, TypeOrmModule],
})
export class ProjectModule {}
