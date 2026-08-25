import { CadFeatureKnowledgeService } from './cad-feature-knowledge.service';
import { GeometricFeature, GeometricFeatureType, ExtractionStatus } from '../../engineering/entities/geometric-feature.entity';

describe('CadFeatureKnowledgeService (S4.2)', () => {
  let service: CadFeatureKnowledgeService;
  let mockChunkerService: any;

  beforeEach(() => {
    mockChunkerService = {
      chunkAndPersist: jest.fn().mockResolvedValue({
        totalProcessed: 2,
        chunksCreated: 2,
        chunksUpdated: 0,
        chunksSkipped: 0,
        chunksFailed: 0,
        durationMs: 12,
      }),
    };
    service = new CadFeatureKnowledgeService(mockChunkerService);
  });

  it('should transform bounding box and wall thickness geometric features into canonical knowledge records', () => {
    const features: GeometricFeature[] = [
      {
        id: 'feat-1',
        tenantId: 't-1',
        projectId: 'BM289',
        drawingId: 'DWG-001',
        drawingRevision: 'RevA',
        featureType: GeometricFeatureType.PART_BOUNDING_BOX,
        geometryReference: 'BBOX_01',
        measurements: { length: 120, width: 80, height: 45, volume: 432000 },
        unit: 'mm',
        normalizedUnit: 'mm',
        conversionFactor: 1.0,
        tolerance: 0.05,
        extractionMethod: 'CAD_PARSER',
        extractionStatus: ExtractionStatus.VALID,
        sourceHash: 'sha-123',
        confidence: 0.95,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'feat-2',
        tenantId: 't-1',
        projectId: 'BM289',
        drawingId: 'DWG-001',
        drawingRevision: 'RevA',
        featureType: GeometricFeatureType.WALL_THICKNESS,
        geometryReference: 'WALL_NOMINAL',
        measurements: { minWallThickness: 1.2, maxWallThickness: 3.0, nominal: 2.1 },
        unit: 'mm',
        normalizedUnit: 'mm',
        conversionFactor: 1.0,
        tolerance: 0.1,
        extractionMethod: 'CAD_PARSER',
        extractionStatus: ExtractionStatus.VALID,
        sourceHash: 'sha-456',
        confidence: 0.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const records = service.transformFeaturesToKnowledgeRecords(features, {
      customer: 'Veedol',
      machine: 'SEB101 FN',
      material: 'P20 Steel',
    });

    expect(records.length).toBe(2);
    expect(records[0].entityType).toBe('CAD_GEOMETRIC_FEATURE');
    expect(records[0].chunkType).toBe('CAD_PART_BOUNDING_BOX');
    expect(records[0].projectNumber).toBe('BM289');
    expect(records[0].customer).toBe('Veedol');
    expect(records[0].normalizedText).toContain('Length=120mm');
    expect(records[0].structuredMetadata.volume).toBe(432000);

    expect(records[1].chunkType).toBe('CAD_WALL_THICKNESS');
    expect(records[1].normalizedText).toContain('Min=1.2mm');
    expect(records[1].structuredMetadata.nominal).toBe(2.1);
  });

  it('should call chunkerService.chunkAndPersist with transformed records', async () => {
    const features: GeometricFeature[] = [
      {
        id: 'feat-1',
        tenantId: 't-1',
        projectId: 'BM331',
        drawingId: 'DWG-002',
        drawingRevision: 'RevB',
        featureType: GeometricFeatureType.HOLE,
        geometryReference: 'EJECTOR_01',
        measurements: { holeDiameter: 4.0, holeDepth: 35.0, depthToDiaRatio: 8.75 },
        unit: 'mm',
        normalizedUnit: 'mm',
        conversionFactor: 1.0,
        tolerance: null,
        extractionMethod: 'CAD_PARSER',
        extractionStatus: ExtractionStatus.VALID,
        sourceHash: 'sha-789',
        confidence: 0.99,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];


    const result = await service.ingestGeometricFeatures('t-1', features, { projectNumber: 'BM331' });
    expect(mockChunkerService.chunkAndPersist).toHaveBeenCalled();
    expect(result.chunksCreated).toBe(2);
  });
});
