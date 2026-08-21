import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { KnowledgeIngestionBatchService } from './knowledge-ingestion-batch.service';
import { MekbIngestionService } from './mekb-ingestion.service';
import { DocumentIngestionService } from './document-ingestion.service';
import { EngineeringLibraryScannerService } from './engineering-library-scanner.service';
import { KnowledgeIngestionBatch, IngestionBatchStatus } from '../entities/knowledge-ingestion-batch.entity';
import { KnowledgeIngestionItem, IngestionItemStatus } from '../entities/knowledge-ingestion-item.entity';

describe('KnowledgeIngestionBatchService (M7.1 Ingestion Batch Orchestrator)', () => {
  let service: KnowledgeIngestionBatchService;

  let mockBatches: KnowledgeIngestionBatch[] = [];
  let mockItems: KnowledgeIngestionItem[] = [];

  const mockBatchRepo = {
    create: jest.fn((dto) => ({ id: `batch-${Math.random().toString(36).substring(2, 9)}`, ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockBatches.findIndex((b) => b.id === entity.id);
      if (idx >= 0) {
        mockBatches[idx] = entity;
      } else {
        mockBatches.push(entity);
      }
      return entity;
    }),
    find: jest.fn(async ({ where }) => {
      return mockBatches.filter((b) => b.tenantId === where.tenantId);
    }),
    findOne: jest.fn(async ({ where }) => {
      return mockBatches.find((b) => {
        return Object.entries(where).every(([k, v]) => (b as any)[k] === v);
      }) || null;
    }),
  };

  const mockItemRepo = {
    create: jest.fn((dto) => ({ id: `item-${Math.random().toString(36).substring(2, 9)}`, ...dto })),
    save: jest.fn(async (entity) => {
      const idx = mockItems.findIndex((i) => i.id === entity.id);
      if (idx >= 0) {
        mockItems[idx] = entity;
      } else {
        mockItems.push(entity);
      }
      return entity;
    }),
  };

  const mockMekbIngestion = {
    ingestMekbDatabase: jest.fn().mockResolvedValue({
      sourceId: 'src-db-1',
      totalTables: 24,
      totalRowsRead: 3089,
      recordsCreated: 3089,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
    }),
  };

  const mockDocIngestion = {
    ingestTechnicalDocuments: jest.fn().mockResolvedValue({
      totalEligible: 49,
      created: 49,
      updated: 0,
      skipped: 0,
      failed: 0,
    }),
  };

  const mockScanner = {};

  beforeEach(async () => {
    mockBatches = [];
    mockItems = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeIngestionBatchService,
        { provide: getRepositoryToken(KnowledgeIngestionBatch), useValue: mockBatchRepo },
        { provide: getRepositoryToken(KnowledgeIngestionItem), useValue: mockItemRepo },
        { provide: DataSource, useValue: {} },
        { provide: MekbIngestionService, useValue: mockMekbIngestion },
        { provide: DocumentIngestionService, useValue: mockDocIngestion },
        { provide: EngineeringLibraryScannerService, useValue: mockScanner },
      ],
    }).compile();

    service = module.get<KnowledgeIngestionBatchService>(KnowledgeIngestionBatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('orchestrates end-to-end ingestion batch and creates item records', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const batch = await service.executeIngestionBatch(tenantId);

    expect(batch).toBeDefined();
    expect(batch.status).toBe(IngestionBatchStatus.COMPLETED);
    expect(batch.recordsCreated).toBe(3089 + 49);
    expect(mockMekbIngestion.ingestMekbDatabase).toHaveBeenCalledWith(tenantId, { scanBatchId: undefined });
    expect(mockDocIngestion.ingestTechnicalDocuments).toHaveBeenCalledWith(tenantId, { libraryPath: undefined, scanBatchId: undefined });

    expect(mockItems.length).toBe(2);
    expect(mockItems.every((i) => i.status === IngestionItemStatus.SUCCESS)).toBe(true);
  });

  it('retrieves latest batch status and lists batches for tenant', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    await service.executeIngestionBatch(tenantId);

    const list = await service.listBatches(tenantId);
    expect(list.length).toBe(1);

    const latest = await service.getLatestBatchStatus(tenantId);
    expect(latest).toBeDefined();
    expect(latest?.status).toBe(IngestionBatchStatus.COMPLETED);
  });
});
