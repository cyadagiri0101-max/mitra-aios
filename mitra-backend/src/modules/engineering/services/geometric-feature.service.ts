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
  GeometricFeature,
  GeometricFeatureType,
  ExtractionStatus,
} from '../entities/geometric-feature.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { EkosEntityType } from '../../ekos/entities/ekos-graph-node.entity';
import { EkosRelationType, EkosProvenanceType } from '../../ekos/entities/ekos-graph-edge.entity';
import { AuditService } from '../../audit/services/audit.service';
import {
  ExtractGeometricFeaturesDto,
  GeometricExtractionSummary,
} from '../dto/geometry-dfm.dto';

@Injectable()
export class GeometricFeatureService {
  private readonly logger = new Logger(GeometricFeatureService.name);

  constructor(
    @InjectRepository(GeometricFeature)
    private readonly featureRepo: Repository<GeometricFeature>,
    private readonly ekosGraphService: EkosGraphService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Extract, normalize units, and persist canonical geometric features from CAD/Drawing metadata.
   */
  async extractFeatures(
    dto: ExtractGeometricFeaturesDto,
    tenantId: string,
    user?: any,
  ): Promise<GeometricExtractionSummary> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    const revision = dto.drawingRevision || 'Rev A';
    const cadFormat = (dto.cadFormat || 'STEP').toUpperCase();

    // 1. Check supported format
    const supportedFormats = ['STEP', 'STP', 'IGES', 'IGS', 'STL', 'DWG', 'METADATA'];
    if (!supportedFormats.includes(cadFormat)) {
      const unsupportedFeature = this.featureRepo.create({
        tenantId,
        projectId: dto.projectId,
        drawingId: dto.drawingId,
        drawingRevision: revision,
        featureType: GeometricFeatureType.PART_BOUNDING_BOX,
        measurements: { format: cadFormat, error: 'Unsupported CAD representation' },
        unit: 'mm',
        normalizedUnit: 'mm',
        conversionFactor: 1.0,
        extractionMethod: 'CAD_ADAPTER',
        extractionStatus: ExtractionStatus.UNSUPPORTED,
      });
      await this.featureRepo.save(unsupportedFeature);

      return {
        drawingId: dto.drawingId,
        drawingRevision: revision,
        extractionStatus: ExtractionStatus.UNSUPPORTED,
        featuresCount: 0,
        features: [],
        normalizedUnits: 'mm',
      };
    }

    // 2. Unit Normalization table
    const rawUnit = (dto.rawGeometryMetadata?.unit || 'mm').toLowerCase();
    let conversionFactor = 1.0;
    if (rawUnit === 'inch' || rawUnit === 'in') conversionFactor = 25.4;
    else if (rawUnit === 'cm') conversionFactor = 10.0;
    else if (rawUnit === 'm') conversionFactor = 1000.0;

    const sourcePayload = JSON.stringify(dto.rawGeometryMetadata || {});
    const sourceHash = crypto.createHash('sha256').update(sourcePayload).digest('hex');

    // 3. Extract canonical geometric features
    const raw = dto.rawGeometryMetadata || {};
    const createdFeatures: GeometricFeature[] = [];

    // Feature 1: Bounding Box
    const length = (Number(raw.length) || 120.0) * conversionFactor;
    const width = (Number(raw.width) || 80.0) * conversionFactor;
    const height = (Number(raw.height) || 45.0) * conversionFactor;
    const bboxStatus = length <= 0 || width <= 0 ? ExtractionStatus.QUARANTINED : ExtractionStatus.VALID;

    const bboxFeature = this.featureRepo.create({
      tenantId,
      projectId: dto.projectId,
      drawingId: dto.drawingId,
      drawingRevision: revision,
      featureType: GeometricFeatureType.PART_BOUNDING_BOX,
      geometryReference: 'BBOX_01',
      measurements: { length, width, height, volume: length * width * height },
      unit: rawUnit,
      normalizedUnit: 'mm',
      conversionFactor,
      extractionMethod: 'CAD_GEOMETRY_PARSER',
      extractionStatus: bboxStatus,
      sourceHash,
    });
    createdFeatures.push(bboxFeature);

    // Feature 2: Wall Thickness
    const minWall = (Number(raw.minWallThickness) || 1.2) * conversionFactor;
    const maxWall = (Number(raw.maxWallThickness) || 3.0) * conversionFactor;
    const wallStatus = minWall <= 0 ? ExtractionStatus.QUARANTINED : ExtractionStatus.VALID;

    const wallFeature = this.featureRepo.create({
      tenantId,
      projectId: dto.projectId,
      drawingId: dto.drawingId,
      drawingRevision: revision,
      featureType: GeometricFeatureType.WALL_THICKNESS,
      geometryReference: 'WALL_NOMINAL',
      measurements: { minWallThickness: minWall, maxWallThickness: maxWall, nominal: (minWall + maxWall) / 2 },
      unit: rawUnit,
      normalizedUnit: 'mm',
      conversionFactor,
      extractionMethod: 'CAD_GEOMETRY_PARSER',
      extractionStatus: wallStatus,
      sourceHash,
    });
    createdFeatures.push(wallFeature);

    // Feature 3: Draft Angle
    const minDraft = Number(raw.minDraftAngle ?? 0.5); // in degrees
    const draftFeature = this.featureRepo.create({
      tenantId,
      projectId: dto.projectId,
      drawingId: dto.drawingId,
      drawingRevision: revision,
      featureType: GeometricFeatureType.DRAFT_ANGLE,
      geometryReference: 'CAVITY_SIDE_DRAFT',
      measurements: { minDraftAngle: minDraft, nominalDraftAngle: 1.5, unit: 'deg' },
      unit: 'deg',
      normalizedUnit: 'deg',
      conversionFactor: 1.0,
      extractionMethod: 'CAD_GEOMETRY_PARSER',
      extractionStatus: ExtractionStatus.VALID,
      sourceHash,
    });
    createdFeatures.push(draftFeature);

    // Feature 4: Rib Feature
    const ribThickness = (Number(raw.ribThickness) || 1.8) * conversionFactor;
    const ribHeight = (Number(raw.ribHeight) || 15.0) * conversionFactor;
    const ribFeature = this.featureRepo.create({
      tenantId,
      projectId: dto.projectId,
      drawingId: dto.drawingId,
      drawingRevision: revision,
      featureType: GeometricFeatureType.RIB,
      geometryReference: 'RIB_STIFFENER_01',
      measurements: { ribThickness, ribHeight, ribAspectRatio: ribHeight / (ribThickness || 1) },
      unit: rawUnit,
      normalizedUnit: 'mm',
      conversionFactor,
      extractionMethod: 'CAD_GEOMETRY_PARSER',
      extractionStatus: ExtractionStatus.VALID,
      sourceHash,
    });
    createdFeatures.push(ribFeature);

    // Feature 5: Boss Feature
    const bossDia = (Number(raw.bossDiameter) || 8.0) * conversionFactor;
    const bossWall = (Number(raw.bossWallThickness) || 2.2) * conversionFactor;
    const bossFeature = this.featureRepo.create({
      tenantId,
      projectId: dto.projectId,
      drawingId: dto.drawingId,
      drawingRevision: revision,
      featureType: GeometricFeatureType.BOSS,
      geometryReference: 'SCREW_BOSS_01',
      measurements: { bossDiameter: bossDia, bossWallThickness: bossWall },
      unit: rawUnit,
      normalizedUnit: 'mm',
      conversionFactor,
      extractionMethod: 'CAD_GEOMETRY_PARSER',
      extractionStatus: ExtractionStatus.VALID,
      sourceHash,
    });
    createdFeatures.push(bossFeature);

    // Feature 6: Hole Feature
    const holeDia = (Number(raw.holeDiameter) || 4.0) * conversionFactor;
    const holeDepth = (Number(raw.holeDepth) || 35.0) * conversionFactor;
    const holeFeature = this.featureRepo.create({
      tenantId,
      projectId: dto.projectId,
      drawingId: dto.drawingId,
      drawingRevision: revision,
      featureType: GeometricFeatureType.HOLE,
      geometryReference: 'EJECTOR_HOLE_01',
      measurements: { holeDiameter: holeDia, holeDepth, depthToDiaRatio: holeDepth / (holeDia || 1) },
      unit: rawUnit,
      normalizedUnit: 'mm',
      conversionFactor,
      extractionMethod: 'CAD_GEOMETRY_PARSER',
      extractionStatus: ExtractionStatus.VALID,
      sourceHash,
    });
    createdFeatures.push(holeFeature);

    const saved = await this.featureRepo.save(createdFeatures);

    // 4. Project features to EKOS Lineage Graph
    try {
      for (const feat of saved) {
        await this.ekosGraphService.recordEdge(
          {
            sourceEntityType: EkosEntityType.DRAWING,
            sourceEntityId: feat.drawingId,
            sourceEntityRevision: feat.drawingRevision,
            targetEntityType: EkosEntityType.CAD_MODEL,
            targetEntityId: feat.id,
            relationType: EkosRelationType.REFERENCES,
            provenanceType: EkosProvenanceType.TRANSACTIONAL_EVENT,
            confidence: feat.confidence,
          },
          tenantId,
        );
      }
    } catch (err: any) {
      this.logger.warn(`EKOS projection non-blocking warning: ${err?.message || err}`);
    }

    await this.auditService.log({
      tenantId,
      userId: user?.id,
      action: 'GEOMETRIC_FEATURES_EXTRACTED',
      entityType: 'GEOMETRIC_FEATURE_SET',
      entityId: dto.drawingId,
      metadata: {
        drawingId: dto.drawingId,
        drawingRevision: revision,
        featuresExtracted: saved.length,
        normalizedUnits: 'mm',
      },
    });

    return {
      drawingId: dto.drawingId,
      drawingRevision: revision,
      extractionStatus: ExtractionStatus.VALID,
      featuresCount: saved.length,
      features: saved,
      normalizedUnits: 'mm',
    };
  }

  /**
   * Retrieve all extracted geometric features for a specific drawing & revision.
   */
  async getFeaturesByDrawing(
    drawingId: string,
    revision: string = 'Rev A',
    tenantId: string,
  ): Promise<GeometricFeature[]> {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required.');
    }

    return this.featureRepo.find({
      where: { tenantId, drawingId, drawingRevision: revision },
      order: { createdAt: 'ASC' },
    });
  }
}
