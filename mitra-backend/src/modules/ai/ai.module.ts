import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OllamaProvider }      from './providers/ollama.provider';
import { OllamaModelProvider } from './providers/ollama-model.provider';
import { MockModelProvider }   from './providers/mock-model.provider';
import { AiContextService }    from './services/ai-context.service';
import { AiService }           from './services/ai.service';
import { EmbeddingService }    from './services/embedding.service';
import { VectorSearchService } from './services/vector-search.service';
import { ModelRouterService }  from './services/model-router.service';
import { PromptTemplateService } from './services/prompt-template.service';
import { PromptRegistryService } from './services/prompt-registry.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { AiSecurityService }   from './services/ai-security.service';
import { AiAuditService }      from './services/ai-audit.service';
import { AiOrchestratorService } from './services/ai-orchestrator.service';
import { ConversationManagerService } from './services/conversation-manager.service';
import { AiDomainCopilotService } from './services/ai-domain-copilot.service';
import { AiCopilotMemoryService } from './services/ai-copilot-memory.service';
import { AiCopilotOrchestratorService } from './services/ai-copilot-orchestrator.service';
import { EnterpriseCopilotService } from './services/enterprise-copilot.service';
import { EnterprisePredictiveIntelligenceService } from './services/enterprise-predictive-intelligence.service';
import { AiController }        from './controllers/ai.controller';

import { AiPlatformController } from './controllers/ai-platform.controller';
import { AiCopilotsController } from './controllers/ai-copilots.controller';
import { KnowledgeEmbedding }  from './entities/knowledge-embedding.entity';
import { AiConversation }      from './entities/ai-conversation.entity';
import { AiMessage }           from './entities/ai-message.entity';
import { AiPromptTemplate }    from './entities/ai-prompt-template.entity';
import { AiAuditLog }          from './entities/ai-audit-log.entity';
import { AiUsageModule }       from '@modules/ai-usage/ai-usage.module';
import { KnowledgeModule }     from '@modules/knowledge/knowledge.module';
import { EngineeringModule }   from '@modules/engineering/engineering.module';
import { PlanningModule }      from '@modules/planning/planning.module';
import { QualityModule }       from '@modules/quality/quality.module';
import { ManufacturingModule } from '@modules/manufacturing/manufacturing.module';
import { ServiceModule }       from '@modules/service/service.module';
import { CommercialModule }    from '@modules/commercial/commercial.module';
import { ProjectModule }       from '@modules/project/project.module';
import { AnalyticsModule }     from '@modules/analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeEmbedding, AiConversation, AiMessage, AiPromptTemplate, AiAuditLog,
    ]),
    AiUsageModule,
    forwardRef(() => KnowledgeModule),
    EngineeringModule,
    PlanningModule,
    QualityModule,
    ManufacturingModule,
    ServiceModule,
    CommercialModule,
    ProjectModule,
    AnalyticsModule,
  ],
  controllers: [AiController, AiPlatformController, AiCopilotsController],
  providers:   [
    OllamaProvider,
    OllamaModelProvider,
    MockModelProvider,
    ModelRouterService,
    AiContextService,
    AiService,
    EmbeddingService,
    VectorSearchService,
    PromptTemplateService,
    PromptRegistryService,
    ToolRegistryService,
    AiSecurityService,
    AiAuditService,
    AiOrchestratorService,
    ConversationManagerService,
    AiDomainCopilotService,
    AiCopilotMemoryService,
    AiCopilotOrchestratorService,
    EnterpriseCopilotService,
    EnterprisePredictiveIntelligenceService,
  ],
  exports: [
    AiService,
    VectorSearchService,
    EmbeddingService,
    PromptTemplateService,
    PromptRegistryService,
    AiCopilotOrchestratorService,
    ModelRouterService,
    EnterprisePredictiveIntelligenceService,
  ],
})
export class AiModule {}
