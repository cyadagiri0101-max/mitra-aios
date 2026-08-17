import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { EngineeringModule } from '../engineering/engineering.module';
import { CommercialModule } from '../commercial/commercial.module';
import { PlatformModule } from '../platform/platform.module';
import { Tenant } from '../platform/entities/tenant.entity';
import { KnowledgeArticle } from './entities/knowledgearticle.entity';
import { KnowledgeAttachment } from './entities/knowledgeattachment.entity';
import { KnowledgeCategory } from './entities/knowledgecategory.entity';
import { KnowledgeTag } from './entities/knowledgetag.entity';
import { KnowledgeCatalogEntry } from './entities/knowledge-catalog.entity';
import { KnowledgeGraphEdge } from './entities/knowledge-graph-edge.entity';
import { EngineeringDocument } from '../engineering/entities/engineering-document.entity';
import { KnowledgeArticleService } from './services/knowledgearticle.service';
import { KnowledgeArticleController } from './controllers/knowledgearticle.controller';
import { KnowledgeCatalogService } from './services/knowledgecatalog.service';
import { KnowledgeCatalogController } from './controllers/knowledgecatalog.controller';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { KnowledgeSearchController } from './controllers/knowledge-search.controller';
import { KnowledgeIndexingService } from './services/knowledge-indexing.service';
import { KnowledgeReindexSchedulerService } from './services/knowledge-reindex-scheduler.service';
import { KnowledgeContextBuilderService } from './services/knowledge-context-builder.service';
import { KnowledgeGraphService } from './services/knowledge-graph.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeArticle,
      KnowledgeAttachment,
      KnowledgeCategory,
      KnowledgeTag,
      KnowledgeCatalogEntry,
      KnowledgeGraphEdge,
      EngineeringDocument,
      Tenant,
    ]),
    forwardRef(() => AiModule),
    EngineeringModule,
    CommercialModule,
    PlatformModule,
  ],
  controllers: [KnowledgeArticleController, KnowledgeCatalogController, KnowledgeSearchController],
  providers: [
    KnowledgeArticleService,
    KnowledgeCatalogService,
    KnowledgeSearchService,
    KnowledgeIndexingService,
    KnowledgeReindexSchedulerService,
    KnowledgeContextBuilderService,
    KnowledgeGraphService,
  ],
  exports: [
    KnowledgeArticleService,
    KnowledgeCatalogService,
    KnowledgeSearchService,
    KnowledgeContextBuilderService,
    KnowledgeGraphService,
    TypeOrmModule,
  ],
})
export class KnowledgeModule {}
