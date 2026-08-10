import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMilestone } from './entities/projectmilestone.entity';
import { ProjectBudget } from './entities/projectbudget.entity';
import { ProjectResource } from './entities/projectresource.entity';
import { MilestoneTemplate } from './entities/milestone-template.entity';
import { MilestoneTemplateItem } from './entities/milestone-template-item.entity';
import { ProjectTask } from './entities/projecttask.entity';
import { TaskDependency } from './entities/taskdependency.entity';
import { TaskComment } from './entities/taskcomment.entity';
import { TaskAttachment } from './entities/taskattachment.entity';
import { Department } from './entities/department.entity';
import { ProjectTeam } from './entities/projectteam.entity';
import { ProjectTeamMember } from './entities/projectteammember.entity';
import { ProjectRisk } from './entities/projectrisk.entity';
import { ProjectFolder } from './entities/projectfolder.entity';
import { ProjectDocument } from './entities/projectdocument.entity';
import { ProjectDocumentVersion } from './entities/projectdocumentversion.entity';
import { ProjectActivityLog } from './entities/projectactivitylog.entity';

import { ProjectService } from './services/project.service';
import { MilestoneService } from './services/milestone.service';
import { TaskService } from './services/task.service';
import { TeamService } from './services/team.service';
import { RiskService } from './services/risk.service';
import { ProjectDocumentService } from './services/project-document.service';
import { TimelineService } from './services/timeline.service';
import { ProjectActivityService } from './services/project-activity.service';
import { ProjectFactoryService } from './services/project-factory.service';
import { ProjectWorkflowService } from './services/project-workflow.service';
import { DomainEventBus } from './services/domain-event-bus.service';
import { AiProjectionService } from './services/ai-projection.service';

import { ProjectController } from './controllers/project.controller';
import { MilestoneController } from './controllers/milestone.controller';
import { TaskController } from './controllers/task.controller';
import { TeamController } from './controllers/team.controller';
import { RiskController } from './controllers/risk.controller';
import { ProjectDocumentController } from './controllers/project-document.controller';
import { TimelineController } from './controllers/timeline.controller';
import { AiProjectionController } from './controllers/ai-projection.controller';

import { WorkflowModule } from '../workflow/workflow.module';
import { AuditModule } from '../audit/audit.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project, ProjectMilestone, ProjectBudget, ProjectResource,
      MilestoneTemplate, MilestoneTemplateItem,
      ProjectTask, TaskDependency, TaskComment, TaskAttachment,
      Department, ProjectTeam, ProjectTeamMember, ProjectRisk,
      ProjectFolder, ProjectDocument, ProjectDocumentVersion, ProjectActivityLog,
    ]),
    WorkflowModule,
    AuditModule,
    PlatformModule,
  ],
  controllers: [
    ProjectController,
    MilestoneController,
    TaskController,
    TeamController,
    RiskController,
    ProjectDocumentController,
    TimelineController,
    AiProjectionController,
  ],
  providers: [
    DomainEventBus,
    ProjectFactoryService,
    ProjectWorkflowService,
    ProjectService,
    MilestoneService,
    TaskService,
    TeamService,
    RiskService,
    ProjectDocumentService,
    TimelineService,
    ProjectActivityService,
    AiProjectionService,
  ],
  exports: [
    ProjectService,
    ProjectFactoryService,
    ProjectWorkflowService,
    DomainEventBus,
    TypeOrmModule,
  ],
})
export class ProjectModule {}
