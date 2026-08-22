import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { GeometricFeatureService } from './geometric-feature.service';
import {
  GeometricFeature,
  GeometricFeatureType,
  ExtractionStatus,
} from '../entities/geometric-feature.entity';
import { EkosGraphService } from '../../ekos/services/ekos-graph.service';
import { AuditService } from '../../audit/services/audit.service';

describe('GeometricFeatureService', () => {
  let service: GeometricFeatureService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockProjectId = '22222222-2222-2222-2222-222222222222';
  const mockDrawingId = '33333333-3333-3333-3333-333333333333';

  const mockFeatureRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => {
      if (Array.isArray(dto)) {
        return Promise.resolve(dto.map((d, idx) => ({ id: `feat-${idx}`, ...d })));
      }
      return Promise.resolve({ id: 'feat-0', ...dto });
    }),
    find: jest.fn(),
  };

  const mockEkosService = {
    recordEdge: jest.fn().mockResolvedValue({ id: 'edge-1' }),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeometricFeatureService,
        { provide: getRepositoryToken(GeometricFeature), useValue: mockFeatureRepo },
        { provide: EkosGraphService, useValue: mockEkosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<GeometricFeatureService>(GeometricFeatureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract canonical geometric features and normalize inch to mm', async () => {
    const summary = await service.extractFeatures(
      {
        drawingId: mockDrawingId,
        projectId: mockProjectId,
        drawingRevision: 'Rev B',
        cadFormat: 'STEP',
        rawGeometryMetadata: {
          unit: 'inch',
          minWallThickness: 0.05, // 0.05 in = 1.27 mm
          maxWallThickness: 0.12, // 0.12 in = 3.048 mm
          minDraftAngle: 0.75,
          ribThickness: 0.08,
          ribHeight: 0.5,
          length: 5.0,
          width: 3.0,
          height: 1.5,
        },
      },
      mockTenantId,
      { id: 'engineer-1' },
    );

    expect(summary.extractionStatus).toBe(ExtractionStatus.VALID);
    expect(summary.normalizedUnits).toBe('mm');
    expect(summary.featuresCount).toBe(6);
    expect(mockEkosService.recordEdge).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'GEOMETRIC_FEATURES_EXTRACTED' }),
    );
  });

  it('should quarantine invalid dimensions (e.g. negative wall thickness)', async () => {
    const summary = await service.extractFeatures(
      {
        drawingId: mockDrawingId,
        projectId: mockProjectId,
        cadFormat: 'STEP',
        rawGeometryMetadata: {
          minWallThickness: -1.0,
        },
      },
      mockTenantId,
    );

    const wallFeature = summary.features.find(
      (f) => f.featureType === GeometricFeatureType.WALL_THICKNESS,
    );
    expect(wallFeature?.extractionStatus).toBe(ExtractionStatus.QUARANTINED);
  });

  it('should flag unsupported formats gracefully', async () => {
    const summary = await service.extractFeatures(
      {
        drawingId: mockDrawingId,
        projectId: mockProjectId,
        cadFormat: 'UNKNOWN_BINARY_FORMAT',
      },
      mockTenantId,
    );

    expect(summary.extractionStatus).toBe(ExtractionStatus.UNSUPPORTED);
    expect(summary.featuresCount).toBe(0);
  });
});
