import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowModule } from '../workflow/workflow.module';
import { AuditModule } from '../audit/audit.module';
import { PlatformModule } from '../platform/platform.module';
import { ManufacturingModule } from '../manufacturing/manufacturing.module';
import { QualityModule } from '../quality/quality.module';
import { ProjectModule } from '../project/project.module';
import { EcrEcoModule } from '../ecr-eco/ecr-eco.module';
import { EngineeringChangeRequest } from '../ecr-eco/entities/engineeringchangerequest.entity';
import { EngineeringChangeOrder } from '../ecr-eco/entities/engineeringchangeorder.entity';
import { EngineeringChangeNotice } from '../ecr-eco/entities/engineering-change-notice.entity';
import { EngineeringChangeImpact } from '../ecr-eco/entities/engineering-change-impact.entity';
import { EngineeringDrawing } from './entities/engineering-drawing.entity';
import { EngineeringDrawingRevision } from './entities/engineering-drawing-revision.entity';
import { EngineeringBom } from './entities/engineering-bom.entity';
import { EngineeringBomItem } from './entities/engineering-bom-item.entity';
import { EngineeringBomRevision } from './entities/engineering-bom-revision.entity';
import { EngineeringRouting } from './entities/engineering-routing.entity';
import { EngineeringOperation } from './entities/engineering-operation.entity';
import { EngineeringWorkCenter } from './entities/engineering-work-center.entity';
import { EngineeringMaterial } from './entities/engineering-material.entity';
import { EngineeringComponent } from './entities/engineering-component.entity';
import { EngineeringComponentAlternate } from './entities/engineering-component-alternate.entity';
import { EngineeringReviewRequest } from './entities/engineering-review-request.entity';
import { EngineeringReviewComment } from './entities/engineering-review-comment.entity';
import { EngineeringDocument } from './entities/engineering-document.entity';
import { EngineeringDocumentVersion } from './entities/engineering-document-version.entity';
import { EngineeringAiHook } from './entities/engineering-ai-hook.entity';
import { EngineeringBomSubstitution } from './entities/engineering-bom-substitution.entity';
import { EngineeringRoutingRevision } from './entities/engineering-routing-revision.entity';
import { EngineeringReviewAssignment } from './entities/engineering-review-assignment.entity';
import { EngineeringUomConversion } from './entities/engineering-uom-conversion.entity';
import { EngineeringTraceEdge } from './entities/engineering-trace-edge.entity';
import { EngineeringEventBus } from './services/engineering-event-bus.service';
import { EngineeringAiHooksService } from './services/engineering-ai-hooks.service';
import { EngineeringChangeService } from '../ecr-eco/services/engineering-change.service';
import { EngineeringChangeController } from '../ecr-eco/controllers/engineering-change.controller';
import { EngineeringDrawingService } from './services/engineering-drawing.service';
import { EngineeringBomService } from './services/engineering-bom.service';
import { EngineeringProcessPlanningService } from './services/engineering-process-planning.service';
import { EngineeringMaterialService } from './services/engineering-material.service';
import { EngineeringComponentService } from './services/engineering-component.service';
import { EngineeringReviewService } from './services/engineering-review.service';
import { EngineeringDocumentService } from './services/engineering-document.service';
import { EngineeringTraceabilityService } from './services/engineering-traceability.service';
import { EngineeringDashboardService } from './services/engineering-dashboard.service';
import { EngineeringWorkflowService } from './services/engineering-workflow.service';
import { EngineeringUomConversionService } from './services/engineering-uom-conversion.service';
import { EngineeringOutboxRelayService } from './services/engineering-outbox-relay.service';
import { EngineeringOutboxRelayScheduler } from './services/engineering-outbox-relay-scheduler.service';
import { EngineeringDrawingController } from './controllers/engineering-drawing.controller';
import { EngineeringBomController } from './controllers/engineering-bom.controller';
import { EngineeringProcessPlanningController } from './controllers/engineering-process-planning.controller';
import { EngineeringMaterialController } from './controllers/engineering-material.controller';
import { EngineeringComponentController } from './controllers/engineering-component.controller';
import { EngineeringReviewController } from './controllers/engineering-review.controller';
import { EngineeringDocumentController } from './controllers/engineering-document.controller';
import { EngineeringTraceabilityController } from './controllers/engineering-traceability.controller';
import { EngineeringDashboardController } from './controllers/engineering-dashboard.controller';
import { EngineeringAiHooksController } from './controllers/engineering-ai-hooks.controller';
import { EngineeringWorkflowController } from './controllers/engineering-workflow.controller';
import { EngineeringUomController } from './controllers/engineering-uom.controller';
import { EngineeringOutboxController } from './controllers/engineering-outbox.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EngineeringDrawing,
      EngineeringDrawingRevision,
      EngineeringBom,
      EngineeringBomItem,
      EngineeringBomRevision,
      EngineeringRouting,
      EngineeringOperation,
      EngineeringWorkCenter,
      EngineeringMaterial,
      EngineeringComponent,
      EngineeringComponentAlternate,
      EngineeringReviewRequest,
      EngineeringReviewComment,
      EngineeringDocument,
      EngineeringDocumentVersion,
      EngineeringAiHook,
      EngineeringBomSubstitution,
      EngineeringRoutingRevision,
      EngineeringReviewAssignment,
      EngineeringUomConversion,
      EngineeringTraceEdge,
      EngineeringChangeRequest,
      EngineeringChangeOrder,
      EngineeringChangeNotice,
      EngineeringChangeImpact,
    ]),
    WorkflowModule,
    AuditModule,
    PlatformModule,
    ManufacturingModule,
    QualityModule,
    ProjectModule,
    EcrEcoModule,
  ],
  controllers: [
    EngineeringDrawingController,
    EngineeringBomController,
    EngineeringProcessPlanningController,
    EngineeringMaterialController,
    EngineeringComponentController,
    EngineeringReviewController,
    EngineeringDocumentController,
    EngineeringTraceabilityController,
    EngineeringDashboardController,
    EngineeringAiHooksController,
    EngineeringWorkflowController,
    EngineeringChangeController,
    EngineeringUomController,
    EngineeringOutboxController,
  ],
  providers: [
    EngineeringEventBus,
    EngineeringAiHooksService,
    EngineeringChangeService,
    EngineeringDrawingService,
    EngineeringBomService,
    EngineeringProcessPlanningService,
    EngineeringMaterialService,
    EngineeringComponentService,
    EngineeringReviewService,
    EngineeringDocumentService,
    EngineeringTraceabilityService,
    EngineeringDashboardService,
    EngineeringWorkflowService,
    EngineeringUomConversionService,
    EngineeringOutboxRelayService,
    EngineeringOutboxRelayScheduler,
  ],
  exports: [
    EngineeringEventBus,
    EngineeringAiHooksService,
    EngineeringDrawingService,
    EngineeringBomService,
    EngineeringProcessPlanningService,
    EngineeringMaterialService,
    EngineeringComponentService,
    EngineeringReviewService,
    EngineeringDocumentService,
    EngineeringTraceabilityService,
    EngineeringDashboardService,
    EngineeringWorkflowService,
    EngineeringUomConversionService,
    EngineeringOutboxRelayService,
  ],
})
export class EngineeringModule {}
