import {
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EkosGraphNode } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge, EkosRelationType } from '../entities/ekos-graph-edge.entity';
import { GraphIntegrityReport } from '../dto/ekos-graph.dto';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class EkosReconciliationService {
  private readonly logger = new Logger(EkosReconciliationService.name);

  constructor(
    @InjectRepository(EkosGraphNode)
    private readonly nodeRepo: Repository<EkosGraphNode>,
    @InjectRepository(EkosGraphEdge)
    private readonly edgeRepo: Repository<EkosGraphEdge>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Run full graph integrity verification for a tenant.
   */
  async verifyGraphIntegrity(tenantId: string): Promise<GraphIntegrityReport> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const nodes = await this.nodeRepo.find({ where: { tenantId } });
    const edges = await this.edgeRepo.find({ where: { tenantId } });

    const nodeMap = new Map<string, EkosGraphNode>(nodes.map((n) => [n.id, n]));
    const violations: GraphIntegrityReport['violations'] = [];

    let danglingEdgesCount = 0;
    let crossTenantViolationsCount = 0;
    let duplicateEdgesCount = 0;

    const seenEdges = new Set<string>();

    for (const edge of edges) {
      // Check cross-tenant isolation
      if (edge.tenantId !== tenantId) {
        crossTenantViolationsCount++;
        violations.push({
          type: 'CROSS_TENANT_VIOLATION',
          details: `Edge ${edge.id} has foreign tenant ID ${edge.tenantId}`,
          edgeId: edge.id,
        });
      }

      // Check dangling edges
      const sourceExists = nodeMap.has(edge.sourceNodeId);
      const targetExists = nodeMap.has(edge.targetNodeId);

      if (!sourceExists || !targetExists) {
        danglingEdgesCount++;
        violations.push({
          type: 'DANGLING_EDGE',
          details: `Edge ${edge.id} references missing node(s): source=${sourceExists}, target=${targetExists}`,
          edgeId: edge.id,
        });
      }

      // Check duplicate active edges
      const edgeKey = `${edge.sourceNodeId}->${edge.targetNodeId}:${edge.relationType}:${edge.isSuperseded}`;
      if (seenEdges.has(edgeKey)) {
        duplicateEdgesCount++;
        violations.push({
          type: 'DUPLICATE_EDGE',
          details: `Duplicate active edge detected: ${edgeKey}`,
          edgeId: edge.id,
        });
      } else {
        seenEdges.add(edgeKey);
      }
    }

    // Check orphan nodes (nodes with 0 incoming and 0 outgoing edges)
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.sourceNodeId);
      connectedNodeIds.add(edge.targetNodeId);
    }

    let orphanNodesCount = 0;
    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id)) {
        orphanNodesCount++;
        violations.push({
          type: 'ORPHAN_NODE',
          details: `Node ${node.id} (${node.entityType}:${node.label}) has no graph edges`,
          nodeId: node.id,
        });
      }
    }

    // Check for forbidden cyclic loops in DERIVED_FROM relationships (must form a DAG)
    const derivedEdges = edges.filter(
      (e) => e.relationType === EkosRelationType.DERIVED_FROM && !e.isSuperseded,
    );
    const forbiddenCyclesCount = this.detectCycles(derivedEdges, violations);

    const isHealthy =
      danglingEdgesCount === 0 &&
      crossTenantViolationsCount === 0 &&
      duplicateEdgesCount === 0 &&
      forbiddenCyclesCount === 0;

    await this.auditService.log({
      tenantId,
      action: 'EKOS_INTEGRITY_CHECKED',
      entityType: 'EKOS_GRAPH',
      entityId: tenantId,
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        isHealthy,
        violationsCount: violations.length,
      },
    });

    return {
      timestamp: new Date().toISOString(),
      tenantId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      orphanNodesCount,
      danglingEdgesCount,
      duplicateEdgesCount,
      crossTenantViolationsCount,
      forbiddenCyclesCount,
      isHealthy,
      violations,
    };
  }

  private detectCycles(
    edges: EkosGraphEdge[],
    violations: GraphIntegrityReport['violations'],
  ): number {
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adj.has(edge.sourceNodeId)) {
        adj.set(edge.sourceNodeId, []);
      }
      adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    let cycleCount = 0;

    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        } else if (recursionStack.has(neighbor)) {
          cycleCount++;
          violations.push({
            type: 'FORBIDDEN_CYCLE',
            details: `Forbidden cycle in DERIVED_FROM lineage: ${[...path, neighbor].join(' -> ')}`,
            nodeId,
          });
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of Array.from(adj.keys())) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, [nodeId]);
      }
    }

    return cycleCount;
  }
}
