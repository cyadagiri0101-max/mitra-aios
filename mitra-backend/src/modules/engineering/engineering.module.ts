import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowModule } from '../workflow/workflow.module';
import { AuditModule } from '../audit/audit.module';
import { PlatformModule } from '../platform/platform.module';
import { ManufacturingModule } from '../manufacturing/manufacturing.module';
import { QualityModule } from '../quality/quality.module';
import { ProjectModule } from '../project/project.module';
import { EcrEcoModule } from '../ecr-eco/ecr-eco.module';
import { EkosModule } from '../ekos/ekos.module';
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
import { GeometricFeature } from './entities/geometric-feature.entity';
import { DfmFinding } from './entities/dfm-finding.entity';
import { HistoricalDefectCorrelation } from './entities/historical-defect-correlation.entity';
import { EngineeringReasoningResult } from './entities/engineering-reasoning-result.entity';
import { EngineeringCostConfiguration } from './entities/engineering-cost-configuration.entity';
import { DesignWorkPackage } from './entities/design-work-package.entity';
import { DesignWorkloadTemplate } from './entities/design-workload-template.entity';
import { DesignEngineerProfile } from './entities/design-team-capacity.entity';
import { ToolProvingCycle } from './entities/tool-proving-cycle.entity';
import { ToolModificationWorkload } from './entities/tool-modification-workload.entity';
import { DesignProjectComplexity } from './entities/design-project-complexity.entity';
import { DesignChecklist } from './entities/design-checklist.entity';
import { DesignChecklistItem } from './entities/design-checklist-item.entity';
import { DesignDependency } from './entities/design-dependency.entity';
import { DesignBlocker } from './entities/design-blocker.entity';
import { DesignHistoricalWorkload } from './entities/design-historical-workload.entity';
import { DesignReplanRequest } from './entities/design-replan-request.entity';
import { DesignComponent } from './entities/design-component.entity';
import { DesignComponentRevision } from './entities/design-component-revision.entity';
import { DesignComponentDeliverable } from './entities/design-component-deliverable.entity';
import { TrackingSheet } from './entities/tracking-sheet.entity';
import { TrackingSheetRevision } from './entities/tracking-sheet-revision.entity';
import { TrackingSheetRow } from './entities/tracking-sheet-row.entity';
import { TrackingSheetReconciliation } from './entities/tracking-sheet-reconciliation.entity';
import { EngineeringTradeoffStudy } from './entities/engineering-tradeoff-study.entity';
import { DigitalThreadGeometryAsset } from './entities/digital-thread-geometry-asset.entity';
import { DesignLifecycleService } from './services/design-lifecycle.service';
import { DesignCapacityService } from './services/design-capacity.service';
import { ToolProvingService } from './services/tool-proving.service';
import { DesignPlanningDeliveryService } from './services/design-planning-delivery.service';
import { DesignComponentOperationsService } from './services/design-component-operations.service';
import { TrackingSheetCopilotService } from './services/tracking-sheet-copilot.service';
import { EngineeringTradeoffSynthesisService } from './services/engineering-tradeoff-synthesis.service';
import { DigitalThreadGeometryService } from './services/digital-thread-geometry.service';
import { DesignLifecycleController } from './controllers/design-lifecycle.controller';
import { ToolProvingController } from './controllers/tool-proving.controller';
import { DesignPlanningDeliveryController } from './controllers/design-planning-delivery.controller';
import { DesignComponentOperationsController } from './controllers/design-component-operations.controller';
import { TrackingSheetCopilotController } from './controllers/tracking-sheet-copilot.controller';
import { EngineeringTradeoffController } from './controllers/engineering-tradeoff.controller';
import { DigitalThreadGeometryController } from './controllers/digital-thread-geometry.controller';
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
import { GeometricFeatureService } from './services/geometric-feature.service';
import { DfmRuleEngineService } from './services/dfm-rule-engine.service';
import { HistoricalDefectCorrelationService } from './services/historical-defect-correlation.service';
import { EngineeringCostSynthesisService } from './services/engineering-cost-synthesis.service';
import { EngineeringReasoningEngineService } from './services/engineering-reasoning-engine.service';
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
import { EngineeringReleaseService } from './services/engineering-release.service';
import { EngineeringReleaseController } from './controllers/engineering-release.controller';
import { GeometryDfmController } from './controllers/geometry-dfm.controller';
import { EngineeringReasoningController } from './controllers/engineering-reasoning.controller';

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
      GeometricFeature,
      DfmFinding,
      HistoricalDefectCorrelation,
      EngineeringReasoningResult,
      EngineeringCostConfiguration,
      DesignWorkPackage,
      DesignWorkloadTemplate,
      DesignEngineerProfile,
      ToolProvingCycle,
      ToolModificationWorkload,
      DesignProjectComplexity,
      DesignChecklist,
      DesignChecklistItem,
      DesignDependency,
      DesignBlocker,
      DesignHistoricalWorkload,
      DesignReplanRequest,
      DesignComponent,
      DesignComponentRevision,
      DesignComponentDeliverable,
      TrackingSheet,
      TrackingSheetRevision,
      TrackingSheetRow,
      TrackingSheetReconciliation,
      EngineeringTradeoffStudy,
      DigitalThreadGeometryAsset,
    ]),
    WorkflowModule,
    AuditModule,
    PlatformModule,
    ManufacturingModule,
    QualityModule,
    ProjectModule,
    EcrEcoModule,
    forwardRef(() => EkosModule),
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
    EngineeringReleaseController,
    GeometryDfmController,
    EngineeringReasoningController,
    DesignLifecycleController,
    ToolProvingController,
    DesignPlanningDeliveryController,
    DesignComponentOperationsController,
    TrackingSheetCopilotController,
    EngineeringTradeoffController,
    DigitalThreadGeometryController,
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
    EngineeringReleaseService,
    GeometricFeatureService,
    DfmRuleEngineService,
    HistoricalDefectCorrelationService,
    EngineeringReasoningEngineService,
    EngineeringCostSynthesisService,
    DesignLifecycleService,
    DesignCapacityService,
    ToolProvingService,
    DesignPlanningDeliveryService,
    DesignComponentOperationsService,
    TrackingSheetCopilotService,
    EngineeringTradeoffSynthesisService,
    DigitalThreadGeometryService,
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
    EngineeringReleaseService,
    GeometricFeatureService,
    DfmRuleEngineService,
    HistoricalDefectCorrelationService,
    EngineeringCostSynthesisService,
    EngineeringReasoningEngineService,
    DesignLifecycleService,
    DesignCapacityService,
    ToolProvingService,
    DesignPlanningDeliveryService,
    DesignComponentOperationsService,
    TrackingSheetCopilotService,
    EngineeringTradeoffSynthesisService,
    DigitalThreadGeometryService,
  ],
})
export class EngineeringModule {}
