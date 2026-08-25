import { Injectable, Logger } from '@nestjs/common';
import { GeometricFeature, GeometricFeatureType } from '../../engineering/entities/geometric-feature.entity';
import { NormalizedEngineeringRecord } from '../normalization/engineering-normalizer.service';
import { EngineeringChunkerService, ChunkingResult } from '../chunking/engineering-chunker.service';
import { AuthorityStatus } from '../types/engineering-library-scan.types';

export interface CadKnowledgeContext {
  projectNumber?: string;
  projectPrefix?: string;
  customer?: string;
  machine?: string;
  material?: string;
  sourceFile?: string;
  drawingId?: string;
  revision?: string;
}

@Injectable()
export class CadFeatureKnowledgeService {
  private readonly logger = new Logger(CadFeatureKnowledgeService.name);

  constructor(private readonly chunkerService: EngineeringChunkerService) {}

  /**
   * Convert canonical GeometricFeature entities into NormalizedEngineeringRecords.
   */
  transformFeaturesToKnowledgeRecords(
    features: GeometricFeature[],
    context: CadKnowledgeContext = {},
  ): NormalizedEngineeringRecord[] {
    return features.map((feat) => {
      const projNum = context.projectNumber || feat.projectId || 'BM_UNKNOWN';
      const rev = context.revision || feat.drawingRevision || 'RevA';
      const m = feat.measurements || {};
      const unit = feat.normalizedUnit || 'mm';

      let featureSummary = '';
      const lines = [
        `=== CAD GEOMETRIC FEATURE SPECIFICATION: ${feat.featureType} ===`,
        `Project Number: ${projNum}`,
        `Drawing ID: ${feat.drawingId || context.drawingId || 'N/A'}`,
        `Revision: ${rev}`,
        `Feature Type: ${feat.featureType}`,
        `Geometry Reference: ${feat.geometryReference || 'N/A'}`,
        `Extraction Status: ${feat.extractionStatus}`,
        `Normalized Unit: ${unit}`,
      ];

      switch (feat.featureType) {
        case GeometricFeatureType.PART_BOUNDING_BOX:
          featureSummary = `Bounding Box: Length=${m.length || 'N/A'}${unit}, Width=${m.width || 'N/A'}${unit}, Height=${m.height || 'N/A'}${unit}, Volume=${m.volume || 'N/A'}${unit}^3`;
          lines.push(featureSummary);
          break;
        case GeometricFeatureType.WALL_THICKNESS:
          featureSummary = `Wall Thickness: Min=${m.minWallThickness || 'N/A'}${unit}, Max=${m.maxWallThickness || 'N/A'}${unit}, Nominal=${m.nominal || 'N/A'}${unit}`;
          lines.push(featureSummary);
          break;
        case GeometricFeatureType.DRAFT_ANGLE:
          featureSummary = `Draft Angle: Min=${m.minDraftAngle || 'N/A'} deg, Nominal=${m.nominalDraftAngle || 'N/A'} deg`;
          lines.push(featureSummary);
          break;
        case GeometricFeatureType.RIB:
          featureSummary = `Rib Geometry: Thickness=${m.ribThickness || 'N/A'}${unit}, Height=${m.ribHeight || 'N/A'}${unit}, Aspect Ratio=${m.ribAspectRatio || 'N/A'}`;
          lines.push(featureSummary);
          break;
        case GeometricFeatureType.BOSS:
          featureSummary = `Screw Boss: Diameter=${m.bossDiameter || 'N/A'}${unit}, Wall Thickness=${m.bossWallThickness || 'N/A'}${unit}`;
          lines.push(featureSummary);
          break;
        case GeometricFeatureType.HOLE:
          featureSummary = `Hole / Ejector Pin: Diameter=${m.holeDiameter || 'N/A'}${unit}, Depth=${m.holeDepth || 'N/A'}${unit}, Depth-to-Dia Ratio=${m.depthToDiaRatio || 'N/A'}`;
          lines.push(featureSummary);
          break;
        default:
          featureSummary = `Measurements: ${JSON.stringify(m)}`;
          lines.push(featureSummary);
          break;
      }

      lines.push(`Provenance: CAD Model / Drawing ${feat.drawingId} (Hash: ${feat.sourceHash || 'N/A'})`);

      return {
        tenantId: feat.tenantId,
        sourceId: null,
        sourceType: 'CAD_GEOMETRY_MODEL',
        entityType: 'CAD_GEOMETRIC_FEATURE',
        entityId: feat.id,
        chunkType: `CAD_${feat.featureType}`,
        title: `CAD Feature [${projNum}]: ${feat.featureType}`,
        projectNumber: projNum,
        projectPrefix: context.projectPrefix || (projNum ? projNum.replace(/[0-9]/g, '') : null),
        customer: context.customer || null,
        machine: context.machine || null,
        material: context.material || null,
        revision: rev,
        authorityStatus: AuthorityStatus.AUTHORITATIVE_RELEASE,
        relativePath: context.sourceFile || `cad/${projNum}_${feat.drawingId}.step`,
        sourceFile: context.sourceFile ? context.sourceFile.split(/[/\\\\]/).pop() || null : `${projNum}.step`,
        sourceSheet: feat.geometryReference || null,
        sourceRow: null,
        sourcePage: null,
        normalizedText: lines.join('\n'),
        structuredMetadata: {
          ...m,
          geometryReference: feat.geometryReference,
          featureType: feat.featureType,
          extractionStatus: feat.extractionStatus,
          unit,
          domain: 'CAD_GEOMETRY_INTELLIGENCE',
        },
      };
    });
  }

  /**
   * Chunk and persist transformed CAD geometric feature records into knowledge base.
   */
  async ingestGeometricFeatures(
    tenantId: string,
    features: GeometricFeature[],
    context: CadKnowledgeContext = {},
  ): Promise<ChunkingResult> {
    const records = this.transformFeaturesToKnowledgeRecords(features, context);
    return this.chunkerService.chunkAndPersist(tenantId, records);
  }
}
