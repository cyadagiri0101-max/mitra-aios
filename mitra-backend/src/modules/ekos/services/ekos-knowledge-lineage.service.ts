import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import {
  EkosGraphEdge,
  EkosRelationType,
  EkosProvenanceType,
} from '../entities/ekos-graph-edge.entity';
import { KnowledgeArticle } from '../../knowledge/entities/knowledgearticle.entity';
import { KnowledgeArticleEvidence } from '../../knowledge/entities/knowledge-article-evidence.entity';
import { G14LevelingRecommendation } from '../../predictive/entities/g14-leveling-recommendation.entity';
import { EkosGraphService } from './ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  LinkKnowledgeToEntityDto,
  KnowledgeArticleLineageResult,
  EntityKnowledgeLineageResult,
  RecommendationProvenanceResult,
} from '../dto/ekos-knowledge-lineage.dto';

@Injectable()
export class EkosKnowledgeLineageService {
  private readonly logger = new Logger(EkosKnowledgeLineageService.name);

  constructor(
    @InjectRepository(EkosGraphNode)
    private readonly nodeRepo: Repository<EkosGraphNode>,
    @InjectRepository(EkosGraphEdge)
    private readonly edgeRepo: Repository<EkosGraphEdge>,
    @InjectRepository(KnowledgeArticle)
    private readonly articleRepo: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeArticleEvidence)
    private readonly evidenceRepo: Repository<KnowledgeArticleEvidence>,
    @InjectRepository(G14LevelingRecommendation)
    private readonly recommendationRepo: Repository<G14LevelingRecommendation>,
    private readonly graphService: EkosGraphService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Trace complete lineage for a G12 Knowledge Article (upstream sources, evidence, and downstream usages).
   */
  async getKnowledgeArticleLineage(
    articleId: string,
    tenantId: string,
  ): Promise<KnowledgeArticleLineageResult> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const article = await this.articleRepo.findOne({
      where: { id: articleId, tenantId },
    });

    if (!article) {
      throw new NotFoundException(`Knowledge Article '${articleId}' not found in tenant.`);
    }

    // Ensure article node exists in EKOS
    const articleNode = await this.graphService.registerNode(
      {
        entityType: EkosEntityType.KNOWLEDGE_ARTICLE,
        entityId: article.id,
        label: article.title,
        metadata: { status: article.status, categoryId: article.categoryId },
        provenanceSource: 'G12_KNOWLEDGE_GOVERNANCE',
      },
      tenantId,
    );

    // Find incoming edges (entities that this article cites or is derived from)
    const incomingEdges = await this.edgeRepo.find({
      where: {
        tenantId,
        targetNodeId: articleNode.id,
      },
      relations: ['sourceNode'],
    });

    // Find outgoing edges (downstream citations or predictions that reference this article)
    const outgoingEdges = await this.edgeRepo.find({
      where: {
        tenantId,
        sourceNodeId: articleNode.id,
      },
      relations: ['targetNode'],
    });

    // Supporting G12/G13 evidence records
    const evidenceList = await this.evidenceRepo.find({
      where: { articleId, tenantId },
    });

    return {
      article: {
        id: article.id,
        label: article.title,
        entityRevision: articleNode.entityRevision,
        isSuperseded: articleNode.isSuperseded,
        projectId: articleNode.projectId,
        metadata: articleNode.metadata,
      },
      upstreamSources: incomingEdges.map((e) => ({
        nodeId: e.sourceNode.id,
        entityType: e.sourceNode.entityType,
        entityId: e.sourceNode.entityId,
        entityRevision: e.sourceNode.entityRevision,
        label: e.sourceNode.label,
        relationType: e.relationType,
        provenanceType: e.provenanceType,
        confidence: Number(e.confidence),
        isSuperseded: e.isSuperseded,
      })),
      supportingEvidence: evidenceList.map((ev) => ({
        evidenceId: ev.id,
        chunkId: ev.chunkId,
        sourceFile: ev.sourceFile || undefined,
        authorityStatus: ev.authorityStatus || undefined,
        citationLabel: ev.citationLabel,
      })),
      downstreamUsages: outgoingEdges.map((e) => ({
        nodeId: e.targetNode.id,
        entityType: e.targetNode.entityType,
        entityId: e.targetNode.entityId,
        label: e.targetNode.label,
        relationType: e.relationType,
        provenanceType: e.provenanceType,
      })),
    };
  }

  /**
   * Find all knowledge articles linked to a specific domain entity (e.g. NCR, Trial, Drawing).
   */
  async getEntityKnowledgeLineage(
    entityType: string,
    entityId: string,
    tenantId: string,
  ): Promise<EntityKnowledgeLineageResult> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const entityNode = await this.nodeRepo.findOne({
      where: { tenantId, entityType, entityId },
    });

    if (!entityNode) {
      return {
        entity: { entityType, entityId, label: `${entityType} ${entityId}` },
        knowledgeArticlesCount: 0,
        knowledgeArticles: [],
        evidenceCount: 0,
      };
    }

    // Edges where entity is source and target is a knowledge article
    const knowledgeEdges = await this.edgeRepo.find({
      where: {
        tenantId,
        sourceNodeId: entityNode.id,
      },
      relations: ['targetNode'],
    });

    const articles = knowledgeEdges
      .filter((e) => e.targetNode.entityType === EkosEntityType.KNOWLEDGE_ARTICLE)
      .map((e) => ({
        articleId: e.targetNode.entityId,
        label: e.targetNode.label,
        relationType: e.relationType,
        provenanceType: e.provenanceType,
        isSuperseded: e.isSuperseded,
        validFrom: e.validFrom,
        validTo: e.validTo,
      }));

    return {
      entity: {
        entityType: entityNode.entityType,
        entityId: entityNode.entityId,
        entityRevision: entityNode.entityRevision,
        label: entityNode.label,
      },
      knowledgeArticlesCount: articles.length,
      knowledgeArticles: articles,
      evidenceCount: articles.length,
    };
  }

  /**
   * Trace upstream provenance of a G14 Leveling Recommendation.
   */
  async getRecommendationProvenance(
    recommendationId: string,
    tenantId: string,
  ): Promise<RecommendationProvenanceResult> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const rec = await this.recommendationRepo.findOne({
      where: { id: recommendationId, tenantId },
    });

    if (!rec) {
      throw new NotFoundException(`G14 Recommendation '${recommendationId}' not found in tenant.`);
    }

    // Ensure recommendation node exists in EKOS
    const recNode = await this.graphService.registerNode(
      {
        entityType: EkosEntityType.LEVELING_RECOMMENDATION,
        entityId: rec.id,
        projectId: rec.projectId || undefined,
        label: `G14 Leveling: ${rec.recommendationType} (${rec.riskTier})`,
        metadata: {
          status: rec.status,
          riskTier: rec.riskTier,
          modelVersion: rec.modelVersion,
        },
        provenanceSource: 'G14_PREDICTIVE_INTELLIGENCE',
      },
      tenantId,
    );

    // Query upstream incoming edges (Project, Machine, Capacity Snapshot)
    const incomingEdges = await this.edgeRepo.find({
      where: {
        tenantId,
        targetNodeId: recNode.id,
      },
      relations: ['sourceNode'],
    });

    return {
      recommendation: {
        id: rec.id,
        recommendationType: rec.recommendationType,
        status: rec.status,
        riskTier: rec.riskTier,
        modelVersion: rec.modelVersion,
        projectId: rec.projectId || undefined,
        machineId: rec.machineId || undefined,
        milestoneId: rec.milestoneId || undefined,
      },
      upstreamEvidence: incomingEdges.map((e) => ({
        nodeId: e.sourceNode.id,
        entityType: e.sourceNode.entityType,
        entityId: e.sourceNode.entityId,
        label: e.sourceNode.label,
        relationType: e.relationType,
        provenanceType: e.provenanceType,
        confidence: Number(e.confidence),
      })),
      isAiInferred: true,
      humanReviewRequired: true,
    };
  }

  /**
   * Explicitly link a knowledge article to an authoritative domain entity (e.g. NCR -> CITED_BY -> Article).
   */
  async linkKnowledgeToSourceEntity(
    dto: LinkKnowledgeToEntityDto,
    tenantId: string,
    user?: any,
  ): Promise<EkosGraphEdge> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const article = await this.articleRepo.findOne({
      where: { id: dto.articleId, tenantId },
    });

    if (!article) {
      throw new NotFoundException(`Knowledge Article '${dto.articleId}' not found.`);
    }

    const edge = await this.graphService.recordEdge(
      {
        sourceEntityType: dto.targetEntityType,
        sourceEntityId: dto.targetEntityId,
        sourceEntityRevision: dto.targetEntityRevision,
        targetEntityType: EkosEntityType.KNOWLEDGE_ARTICLE,
        targetEntityId: dto.articleId,
        relationType: dto.relationType,
        provenanceType: dto.provenanceType || EkosProvenanceType.EXPLICIT_HUMAN,
        projectId: dto.projectId,
        confidence: dto.confidence ?? 1.0,
        properties: dto.properties || {},
      },
      tenantId,
      user,
    );

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'EKOS_KNOWLEDGE_LINKED',
      entityType: 'EKOS_KNOWLEDGE_LINK',
      entityId: edge.id,
      metadata: {
        articleId: dto.articleId,
        targetEntityType: dto.targetEntityType,
        targetEntityId: dto.targetEntityId,
        relationType: dto.relationType,
        provenanceType: edge.provenanceType,
      },
    });

    return edge;
  }
}
