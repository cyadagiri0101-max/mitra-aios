import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EkosGraphNode } from './entities/ekos-graph-node.entity';
import { EkosGraphEdge } from './entities/ekos-graph-edge.entity';
import { CompliancePackage } from './entities/compliance-package.entity';
import { KnowledgeArticle } from '../knowledge/entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../knowledge/entities/knowledge-article-evidence.entity';
import { G14LevelingRecommendation } from '../predictive/entities/g14-leveling-recommendation.entity';
import { EkosGraphService } from './services/ekos-graph.service';
import { EkosReconciliationService } from './services/ekos-reconciliation.service';
import { EkosKnowledgeLineageService } from './services/ekos-knowledge-lineage.service';
import { CompliancePackageService } from './services/compliance-package.service';
import { EkosIntelligenceService } from './services/ekos-intelligence.service';
import { EkosGraphController } from './controllers/ekos-graph.controller';
import { EkosKnowledgeLineageController } from './controllers/ekos-knowledge-lineage.controller';
import { CompliancePackageController } from './controllers/compliance-package.controller';
import { EkosIntelligenceController } from './controllers/ekos-intelligence.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EkosGraphNode,
      EkosGraphEdge,
      CompliancePackage,
      KnowledgeArticle,
      KnowledgeArticleEvidence,
      G14LevelingRecommendation,
    ]),
    AuditModule,
  ],
  controllers: [
    EkosGraphController,
    EkosKnowledgeLineageController,
    CompliancePackageController,
    EkosIntelligenceController,
  ],
  providers: [
    EkosGraphService,
    EkosReconciliationService,
    EkosKnowledgeLineageService,
    CompliancePackageService,
    EkosIntelligenceService,
  ],
  exports: [
    EkosGraphService,
    EkosReconciliationService,
    EkosKnowledgeLineageService,
    CompliancePackageService,
    EkosIntelligenceService,
    TypeOrmModule,
  ],
})
export class EkosModule {}
