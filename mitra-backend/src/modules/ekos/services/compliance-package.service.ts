import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  CompliancePackage,
  ComplianceFramework,
  PackageCompletenessStatus,
} from '../entities/compliance-package.entity';
import { EkosGraphNode, EkosEntityType } from '../entities/ekos-graph-node.entity';
import { EkosGraphEdge } from '../entities/ekos-graph-edge.entity';
import { EkosGraphService } from './ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  GenerateCompliancePackageDto,
  ComplianceGapItem,
  PackageExportResult,
} from '../dto/compliance-package.dto';
import { LineageDirection } from '../dto/ekos-graph.dto';

@Injectable()
export class CompliancePackageService {
  private readonly logger = new Logger(CompliancePackageService.name);

  constructor(
    @InjectRepository(CompliancePackage)
    private readonly packageRepo: Repository<CompliancePackage>,
    @InjectRepository(EkosGraphNode)
    private readonly nodeRepo: Repository<EkosGraphNode>,
    @InjectRepository(EkosGraphEdge)
    private readonly edgeRepo: Repository<EkosGraphEdge>,
    private readonly graphService: EkosGraphService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate an audit-ready, tamper-evident compliance evidence package.
   */
  async generatePackage(
    dto: GenerateCompliancePackageDto,
    tenantId: string,
    user?: any,
  ): Promise<CompliancePackage> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    // 1. Traverse project lineage graph up to depth 5
    const lineage = await this.graphService.getLineage(
      EkosEntityType.PROJECT,
      dto.projectId,
      { direction: LineageDirection.DOWNSTREAM, maxDepth: 5 },
      tenantId,
    );

    // 2. Format evidence manifest with provenance classification
    const evidenceManifest = lineage.nodes.map((node) => ({
      entityType: node.entityType,
      entityId: node.entityId,
      entityRevision: node.entityRevision || null,
      label: node.label,
      provenanceSource: node.provenanceSource,
      isSuperseded: node.isSuperseded,
      metadata: node.metadata,
      isAiInferred: node.entityType === EkosEntityType.LEVELING_RECOMMENDATION,
    }));

    const nodeMap = new Map(lineage.nodes.map((n) => [n.id, n]));

    const lineageManifest = lineage.edges.map((edge) => {
      const srcNode = nodeMap.get(edge.sourceNodeId);
      const tgtNode = nodeMap.get(edge.targetNodeId);
      return {
        sourceEntityType: srcNode?.entityType || 'UNKNOWN',
        sourceEntityId: srcNode?.entityId || edge.sourceNodeId,
        targetEntityType: tgtNode?.entityType || 'UNKNOWN',
        targetEntityId: tgtNode?.entityId || edge.targetNodeId,
        relationType: edge.relationType,
        provenanceType: edge.provenanceType,
        confidence: Number(edge.confidence),
        isSuperseded: edge.isSuperseded,
      };
    });

    // 3. Completeness & Gap Assessment
    const gaps: ComplianceGapItem[] = [];
    const entityTypesPresent = new Set(lineage.nodes.map((n) => n.entityType));

    if (!entityTypesPresent.has(EkosEntityType.DRAWING)) {
      gaps.push({
        entityType: 'DRAWING',
        expectedRelation: 'PROJECT -> DRAWING',
        severity: 'WARNING',
        description: 'No engineering drawings or revisions found linked to project.',
      });
    }

    if (!entityTypesPresent.has(EkosEntityType.WORK_ORDER)) {
      gaps.push({
        entityType: 'WORK_ORDER',
        expectedRelation: 'DRAWING -> WORK_ORDER',
        severity: 'WARNING',
        description: 'No manufacturing work orders found linked to project.',
      });
    }

    const completenessStatus =
      gaps.length === 0
        ? PackageCompletenessStatus.COMPLETE
        : PackageCompletenessStatus.PARTIAL;

    // 4. Cryptographic SHA-256 package hash over canonical representation
    const canonicalPayload = JSON.stringify({
      tenantId,
      projectId: dto.projectId,
      framework: dto.framework || ComplianceFramework.ISO_9001,
      evidence: evidenceManifest,
      lineage: lineageManifest,
    });

    const packageHash = crypto
      .createHash('sha256')
      .update(canonicalPayload)
      .digest('hex');

    // 5. Version incrementation for package
    const latestPkg = await this.packageRepo.findOne({
      where: { tenantId, projectId: dto.projectId },
      order: { version: 'DESC' },
    });
    const version = latestPkg ? latestPkg.version + 1 : 1;

    const pkg = this.packageRepo.create({
      tenantId,
      projectId: dto.projectId,
      framework: dto.framework || ComplianceFramework.ISO_9001,
      scope: dto.scope || 'FULL_PROJECT_TRACEABILITY',
      version,
      completenessStatus,
      packageHash,
      generatorVersion: 'MITRA_EKOS_COMPLIANCE_v5.0',
      evidenceManifest,
      lineageManifest,
      auditManifest: [
        {
          action: 'COMPLIANCE_PACKAGE_GENERATED',
          timestamp: new Date(),
          userId: user?.id,
        },
      ],
      gapsAndWarnings: gaps,
      createdByUserId: user?.id || null,
    });

    const saved = await this.packageRepo.save(pkg);

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'COMPLIANCE_PACKAGE_GENERATED',
      entityType: 'COMPLIANCE_PACKAGE',
      entityId: saved.id,
      metadata: {
        projectId: saved.projectId,
        framework: saved.framework,
        version: saved.version,
        packageHash: saved.packageHash,
        completenessStatus: saved.completenessStatus,
        evidenceCount: evidenceManifest.length,
      },
    });

    return saved;
  }

  /**
   * Retrieve compliance package by ID.
   */
  async getPackageById(id: string, tenantId: string): Promise<CompliancePackage> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const pkg = await this.packageRepo.findOne({
      where: { id, tenantId },
    });

    if (!pkg) {
      throw new NotFoundException(`Compliance Package '${id}' not found in tenant.`);
    }

    return pkg;
  }

  /**
   * Export structured audit-ready package manifest.
   */
  async exportPackage(id: string, tenantId: string): Promise<PackageExportResult> {
    const pkg = await this.getPackageById(id, tenantId);

    return {
      packageId: pkg.id,
      projectId: pkg.projectId,
      framework: pkg.framework,
      packageHash: pkg.packageHash,
      version: pkg.version,
      completenessStatus: pkg.completenessStatus,
      generatedAt: pkg.createdAt,
      generatorVersion: pkg.generatorVersion,
      manifest: {
        evidenceCount: pkg.evidenceManifest.length,
        lineageEdgeCount: pkg.lineageManifest.length,
        auditEventCount: pkg.auditManifest.length,
        gapsCount: pkg.gapsAndWarnings.length,
      },
      evidenceItems: pkg.evidenceManifest,
      lineageEdges: pkg.lineageManifest,
      auditTrail: pkg.auditManifest,
      gapsAndWarnings: pkg.gapsAndWarnings as ComplianceGapItem[],
    };
  }

  /**
   * Verify package cryptographic integrity (Zero-tampering check).
   */
  async verifyPackageIntegrity(
    id: string,
    tenantId: string,
  ): Promise<{ isTamperFree: boolean; packageHash: string; computedHash: string }> {
    const pkg = await this.getPackageById(id, tenantId);

    const canonicalPayload = JSON.stringify({
      tenantId: pkg.tenantId,
      projectId: pkg.projectId,
      framework: pkg.framework,
      evidence: pkg.evidenceManifest,
      lineage: pkg.lineageManifest,
    });

    const computedHash = crypto
      .createHash('sha256')
      .update(canonicalPayload)
      .digest('hex');

    return {
      isTamperFree: computedHash === pkg.packageHash,
      packageHash: pkg.packageHash,
      computedHash,
    };
  }
}
