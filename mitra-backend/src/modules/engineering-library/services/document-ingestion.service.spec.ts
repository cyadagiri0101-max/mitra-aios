import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DocumentIngestionService } from './document-ingestion.service';
import { EngineeringLibraryScannerService } from './engineering-library-scanner.service';
import { KnowledgeSource } from '../entities/knowledge-source.entity';
import { KnowledgeCatalogEntry } from '../../knowledge/entities/knowledge-catalog.entity';
import { AuthorityStatus, EngineeringAssetClassification } from '../types/engineering-library-scan.types';

describe('DocumentIngestionService (M7.1 Technical Document Ingestion)', () => {
  let service: DocumentIngestionService;
  let tempDir: string;

  let mockSources: KnowledgeSource[] = [];
  let mockCatalog: KnowledgeCatalogEntry[] = [];

  const mockSourceRepo = {
    create: jest.fn((dto) => ({ id: `src-${Math.random().toString(36).substring(2, 9)}`, ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockSources.findIndex((s) => s.id === entity.id);
      if (idx >= 0) {
        mockSources[idx] = entity;
      } else {
        mockSources.push(entity);
      }
      return entity;
    }),
    findOne: jest.fn(async ({ where }) => {
      return mockSources.find((s) => {
        return Object.entries(where).every(([k, v]) => (s as any)[k] === v);
      }) || null;
    }),
  };

  const mockCatalogRepo = {
    create: jest.fn((dto) => ({ id: `cat-${Math.random().toString(36).substring(2, 9)}`, ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockCatalog.findIndex((c) => c.entityId === entity.entityId && c.tenantId === entity.tenantId);
      if (idx >= 0) {
        mockCatalog[idx] = entity;
      } else {
        mockCatalog.push(entity);
      }
      return entity;
    }),
    findOne: jest.fn(async ({ where }) => {
      return mockCatalog.find((c) => {
        return Object.entries(where).every(([k, v]) => (c as any)[k] === v);
      }) || null;
    }),
  };

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mitra-m7-doc-test-'));
    fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'docs', 'EngineeringDataDictionary.md'),
      '# Engineering Data Dictionary\nComprehensive dictionary for mold specifications.\n',
    );
    fs.writeFileSync(path.join(tempDir, 'PL.xlsx'), 'MOCK_EXCEL_PL');
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  beforeEach(async () => {
    mockSources = [];
    mockCatalog = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentIngestionService,
        EngineeringLibraryScannerService,
        { provide: getRepositoryToken(KnowledgeSource), useValue: mockSourceRepo },
        { provide: getRepositoryToken(KnowledgeCatalogEntry), useValue: mockCatalogRepo },
        { provide: DataSource, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'MITRA_ENGINEERING_LIBRARY_PATH') return tempDir;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentIngestionService>(DocumentIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('ingests technical documents and master workbooks from scan', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const result = await service.ingestTechnicalDocuments(tenantId, {
      libraryPath: tempDir,
    });

    expect(result).toBeDefined();
    expect(result.created).toBeGreaterThanOrEqual(2);
    expect(mockSources.length).toBeGreaterThanOrEqual(2);
    expect(mockCatalog.length).toBeGreaterThanOrEqual(2);

    const dataDict = mockCatalog.find((c) => c.title.includes('Engineering Data Dictionary'));
    expect(dataDict).toBeDefined();
    expect(dataDict?.sourceDomain).toBe('DOCUMENT');
  });

  it('is idempotent on repeated execution', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';

    const run1 = await service.ingestTechnicalDocuments(tenantId, { libraryPath: tempDir });
    expect(run1.created).toBeGreaterThanOrEqual(2);

    const run2 = await service.ingestTechnicalDocuments(tenantId, { libraryPath: tempDir });
    expect(run2.created).toBe(0);
    expect(run2.skipped).toBe(run1.created);
  });
});
