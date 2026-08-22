import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import {
  EkosGraphEdge,
  EkosRelationType,
  EkosProvenanceType,
} from '../entities/ekos-graph-edge.entity';
import {
  RegisterNodeDto,
  RecordEdgeDto,
  LineageQueryDto,
  LineageDirection,
  LineageGraphResult,
  ImpactAnalysisQueryDto,
  ImpactAnalysisResult,
} from '../dto/ekos-graph.dto';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class EkosGraphService {
  private readonly logger = new Logger(EkosGraphService.name);

  constructor(
    @InjectRepository(EkosGraphNode)
    private readonly nodeRepo: Repository<EkosGraphNode>,
    @InjectRepository(EkosGraphEdge)
    private readonly edgeRepo: Repository<EkosGraphEdge>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Register or idempotently update an entity node in the canonical EKOS graph.
   */
  async registerNode(
    dto: RegisterNodeDto,
    tenantId: string,
    user?: any,
  ): Promise<EkosGraphNode> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const revision = dto.entityRevision || null;
    let node = await this.nodeRepo.findOne({
      where: {
        tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        entityRevision: revision === null ? undefined : revision,
      },
    });

    if (node) {
      node.label = dto.label;
      node.projectId = dto.projectId || node.projectId;
      node.metadata = { ...node.metadata, ...(dto.metadata || {}) };
      node.provenanceSource = dto.provenanceSource || node.provenanceSource;
      node.provenanceHash = dto.provenanceHash || node.provenanceHash;
      node = await this.nodeRepo.save(node);
    } else {
      node = this.nodeRepo.create({
        tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        entityRevision: dto.entityRevision,
        projectId: dto.projectId,
        label: dto.label,
        metadata: dto.metadata || {},
        provenanceSource: dto.provenanceSource || 'SYSTEM',
        provenanceHash: dto.provenanceHash,
      });
      node = await this.nodeRepo.save(node);

      await this.auditService.log({
        tenantId,
        userId: user?.id,
        action: 'EKOS_LINEAGE_NODE_REGISTERED',
        entityType: 'EKOS_NODE',
        entityId: node.id,
        metadata: {
          targetEntityType: node.entityType,
          targetEntityId: node.entityId,
          revision: node.entityRevision,
          projectId: node.projectId,
        },
      });
    }

    return node;
  }

  /**
   * Record or idempotently update a semantic relationship edge.
   */
  async recordEdge(
    dto: RecordEdgeDto,
    tenantId: string,
    user?: any,
  ): Promise<EkosGraphEdge> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    // Ensure source and target nodes exist in the graph
    const sourceNode = await this.findOrCreateNode(
      dto.sourceEntityType,
      dto.sourceEntityId,
      dto.sourceEntityRevision,
      dto.projectId,
      tenantId,
    );

    const targetNode = await this.findOrCreateNode(
      dto.targetEntityType,
      dto.targetEntityId,
      dto.targetEntityRevision,
      dto.projectId,
      tenantId,
    );

    // Prevent cross-tenant edge linkage
    if (sourceNode.tenantId !== tenantId || targetNode.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant graph edge creation is strictly prohibited.');
    }

    // Check for existing active edge
    let edge = await this.edgeRepo.findOne({
      where: {
        tenantId,
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        relationType: dto.relationType,
        isSuperseded: false,
      },
    });

    if (edge) {
      edge.confidence = dto.confidence ?? edge.confidence;
      edge.properties = { ...edge.properties, ...(dto.properties || {}) };
      edge.provenanceType = dto.provenanceType || edge.provenanceType;
      edge.projectId = dto.projectId || edge.projectId;
      edge = await this.edgeRepo.save(edge);
    } else {
      edge = this.edgeRepo.create({
        tenantId,
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        relationType: dto.relationType,
        provenanceType: dto.provenanceType || EkosProvenanceType.TRANSACTIONAL_EVENT,
        projectId: dto.projectId || sourceNode.projectId || targetNode.projectId,
        confidence: dto.confidence ?? 1.0,
        properties: dto.properties || {},
      });
      edge = await this.edgeRepo.save(edge);

      await this.auditService.log({
        tenantId,
        userId: user?.id,
        action: 'EKOS_LINEAGE_EDGE_RECORDED',
        entityType: 'EKOS_EDGE',
        entityId: edge.id,
        metadata: {
          relationType: edge.relationType,
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          provenanceType: edge.provenanceType,
        },
      });
    }

    return edge;
  }

  /**
   * Traverse the graph from a root entity to extract upstream and/or downstream lineage.
   */
  async getLineage(
    entityType: string,
    entityId: string,
    queryDto: LineageQueryDto,
    tenantId: string,
  ): Promise<LineageGraphResult> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const startTime = Date.now();
    const maxDepth = Math.min(queryDto.maxDepth || 5, 10);
    const direction = queryDto.direction || LineageDirection.BIDIRECTIONAL;
    const includeSuperseded = queryDto.includeSuperseded || false;

    const rootNode = await this.nodeRepo.findOne({
      where: {
        tenantId,
        entityType,
        entityId,
      },
    });

    if (!rootNode) {
      throw new NotFoundException(`Graph node for ${entityType}/${entityId} not found in tenant.`);
    }

    const visitedNodeIds = new Set<string>([rootNode.id]);
    const collectedNodes = new Map<string, EkosGraphNode>([[rootNode.id, rootNode]]);
    const collectedEdges = new Map<string, EkosGraphEdge>();

    let currentLevelNodeIds = [rootNode.id];
    let depth = 0;

    while (currentLevelNodeIds.length > 0 && depth < maxDepth) {
      depth++;
      const nextLevelNodeIds: string[] = [];

      // Query outgoing edges (downstream)
      if (direction === LineageDirection.DOWNSTREAM || direction === LineageDirection.BIDIRECTIONAL) {
        const outgoing = await this.edgeRepo.find({
          where: {
            tenantId,
            sourceNodeId: In(currentLevelNodeIds),
            ...(includeSuperseded ? {} : { isSuperseded: false }),
            ...(queryDto.projectId ? { projectId: queryDto.projectId } : {}),
            ...(queryDto.relationTypes && queryDto.relationTypes.length > 0
              ? { relationType: In(queryDto.relationTypes) }
              : {}),
          },
          relations: ['targetNode'],
        });

        for (const edge of outgoing) {
          collectedEdges.set(edge.id, edge);
          if (edge.targetNode && !visitedNodeIds.has(edge.targetNode.id)) {
            visitedNodeIds.add(edge.targetNode.id);
            collectedNodes.set(edge.targetNode.id, edge.targetNode);
            nextLevelNodeIds.push(edge.targetNode.id);
          }
        }
      }

      // Query incoming edges (upstream)
      if (direction === LineageDirection.UPSTREAM || direction === LineageDirection.BIDIRECTIONAL) {
        const incoming = await this.edgeRepo.find({
          where: {
            tenantId,
            targetNodeId: In(currentLevelNodeIds),
            ...(includeSuperseded ? {} : { isSuperseded: false }),
            ...(queryDto.projectId ? { projectId: queryDto.projectId } : {}),
            ...(queryDto.relationTypes && queryDto.relationTypes.length > 0
              ? { relationType: In(queryDto.relationTypes) }
              : {}),
          },
          relations: ['sourceNode'],
        });

        for (const edge of incoming) {
          collectedEdges.set(edge.id, edge);
          if (edge.sourceNode && !visitedNodeIds.has(edge.sourceNode.id)) {
            visitedNodeIds.add(edge.sourceNode.id);
            collectedNodes.set(edge.sourceNode.id, edge.sourceNode);
            nextLevelNodeIds.push(edge.sourceNode.id);
          }
        }
      }

      currentLevelNodeIds = nextLevelNodeIds;
    }

    const traversalTimeMs = Date.now() - startTime;

    return {
      rootNodeId: rootNode.id,
      nodes: Array.from(collectedNodes.values()).map((n) => ({
        id: n.id,
        entityType: n.entityType,
        entityId: n.entityId,
        entityRevision: n.entityRevision,
        projectId: n.projectId,
        label: n.label,
        metadata: n.metadata,
        provenanceSource: n.provenanceSource,
        isSuperseded: n.isSuperseded,
      })),
      edges: Array.from(collectedEdges.values()).map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        relationType: e.relationType,
        provenanceType: e.provenanceType,
        projectId: e.projectId,
        confidence: Number(e.confidence),
        properties: e.properties,
        isSuperseded: e.isSuperseded,
      })),
      metrics: {
        traversalTimeMs,
        nodeCount: collectedNodes.size,
        edgeCount: collectedEdges.size,
        depthReached: depth,
      },
    };
  }

  /**
   * Evaluate blast-radius impact analysis when an entity is modified or changed.
   */
  async analyzeImpact(
    entityType: string,
    entityId: string,
    queryDto: ImpactAnalysisQueryDto,
    tenantId: string,
  ): Promise<ImpactAnalysisResult> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const lineage = await this.getLineage(
      entityType,
      entityId,
      {
        direction: LineageDirection.DOWNSTREAM,
        maxDepth: queryDto.maxDepth || 5,
        projectId: queryDto.projectId,
        includeSuperseded: false,
      },
      tenantId,
    );

    const rootNode = lineage.nodes.find((n) => n.entityType === entityType && n.entityId === entityId);
    const impactedNodes = lineage.nodes.filter((n) => n.id !== lineage.rootNodeId);

    const impactByDepth: ImpactAnalysisResult['impactByDepth'] = [];
    const criticalImpacts: ImpactAnalysisResult['criticalImpacts'] = [];

    for (const node of impactedNodes) {
      if (
        node.entityType === EkosEntityType.WORK_ORDER ||
        node.entityType === EkosEntityType.MILESTONE ||
        node.entityType === EkosEntityType.NCR
      ) {
        criticalImpacts.push({
          entityType: node.entityType,
          entityId: node.entityId,
          label: node.label,
          impactReason: `Downstream operational dependency: ${node.entityType} '${node.label}' may require re-validation.`,
        });
      }
    }

    const blastRadiusScore = Math.min(100, impactedNodes.length * 15 + criticalImpacts.length * 20);

    return {
      sourceEntity: {
        entityType: rootNode ? rootNode.entityType : entityType,
        entityId: rootNode ? rootNode.entityId : entityId,
        label: rootNode ? rootNode.label : `${entityType} ${entityId}`,
      },
      impactedEntitiesCount: impactedNodes.length,
      blastRadiusScore,
      impactByDepth,
      criticalImpacts,
    };
  }

  private async findOrCreateNode(
    entityType: string,
    entityId: string,
    entityRevision: string | undefined,
    projectId: string | undefined,
    tenantId: string,
  ): Promise<EkosGraphNode> {
    const revision = entityRevision || null;
    let node = await this.nodeRepo.findOne({
      where: {
        tenantId,
        entityType,
        entityId,
        entityRevision: revision === null ? undefined : revision,
      },
    });

    if (!node) {
      node = this.nodeRepo.create({
        tenantId,
        entityType,
        entityId,
        entityRevision,
        projectId,
        label: `${entityType}:${entityRevision ? `${entityId}@${entityRevision}` : entityId}`,
        metadata: {},
        provenanceSource: 'SYSTEM_EVENT',
      });
      node = await this.nodeRepo.save(node);
    }

    return node;
  }
}
