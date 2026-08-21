import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringLibraryController } from './engineering-library.controller';
import { EngineeringLibraryService } from '../services/engineering-library.service';
import { EngineeringLibraryScannerService } from '../services/engineering-library-scanner.service';
import { KnowledgeIngestionBatchService } from '../services/knowledge-ingestion-batch.service';
import { MekbIngestionService } from '../services/mekb-ingestion.service';
import { DocumentIngestionService } from '../services/document-ingestion.service';
import { KnowledgeIndexingBatchService } from '../services/knowledge-indexing-batch.service';
import { EngineeringEmbeddingService } from '../embeddings/engineering-embedding.service';
import { EngineeringRetrievalService } from '../retrieval/engineering-retrieval.service';

const makeService = () => ({
  search: jest.fn().mockResolvedValue({ results: [] }),
  listProjects: jest.fn().mockResolvedValue([]),
  getProject: jest.fn().mockResolvedValue({ id: 'p1' }),
  listDocuments: jest.fn().mockResolvedValue([]),
  getDocument: jest.fn().mockResolvedValue({ id: 'd1' }),
  getDashboardWidgets: jest.fn().mockResolvedValue({ totalProjects: 0, totalDocuments: 0, status: 'ok' }),
  synchronize: jest.fn().mockResolvedValue({ syncedAt: '2026-01-01T00:00:00.000Z', projectCount: 0, documentCount: 0, status: 'synchronized' }),
  getSyncStatus: jest.fn().mockReturnValue({ syncedAt: null, projectCount: 0, documentCount: 0, status: 'never_synced' }),
});

const makeScanner = () => ({
  scanLibrary: jest.fn().mockResolvedValue({
    scanBatchId: 'scan-test-123',
    totalFiles: 10,
    eligibleFiles: 6,
    excludedFiles: 4,
    duplicateGroups: [],
    revisionCandidateGroups: [],
    scanErrors: [],
  }),
  getLastManifest: jest.fn().mockReturnValue({
    scanBatchId: 'scan-test-123',
    scanTimestamp: '2026-08-20T12:00:00.000Z',
    totalFiles: 10,
    eligibleFiles: 6,
  }),
  generateScanReportMarkdown: jest.fn().mockReturnValue('# M7 Scan Report'),
  resolveLibraryPath: jest.fn().mockReturnValue('D:\\Mitra3.0\\MitraEngineeringLibrary'),
});

const makeBatchService = () => ({
  executeIngestionBatch: jest.fn().mockResolvedValue({
    id: 'batch-123',
    status: 'COMPLETED',
    recordsCreated: 3138,
    recordsUpdated: 0,
    skipped: 0,
    failed: 0,
    startedAt: new Date(),
    completedAt: new Date(),
  }),
  getLatestBatchStatus: jest.fn().mockResolvedValue({ id: 'batch-123', status: 'COMPLETED' }),
  listBatches: jest.fn().mockResolvedValue([{ id: 'batch-123', status: 'COMPLETED' }]),
  getBatch: jest.fn().mockResolvedValue({ id: 'batch-123', status: 'COMPLETED' }),
});

const makeIndexingService = () => ({
  runIndexingPipeline: jest.fn().mockResolvedValue({
    tenantId: 'tenant-1',
    catalogEntriesCount: 3474,
    normalizedRecordsCount: 3474,
    chunksCreated: 3474,
    chunksUpdated: 0,
    chunksSkipped: 0,
    embeddedCount: 3474,
    embeddingSkipped: 0,
    embeddingFailed: 0,
    totalActiveChunks: 3474,
    durationMs: 1200,
  }),
  getIndexingStatus: jest.fn().mockResolvedValue({
    tenantId: 'tenant-1',
    totalChunks: 3474,
    embeddedChunks: 3474,
    pendingChunks: 0,
    failedChunks: 0,
    isFullyIndexed: true,
  }),
  getChunkById: jest.fn().mockResolvedValue({ id: 'chunk-123', chunkText: 'Normalized chunk text' }),
  retryFailedChunks: jest.fn().mockResolvedValue({ embeddedCount: 0, failedCount: 0 }),
});

const makeEmbeddingService = () => ({
  embedPendingChunks: jest.fn().mockResolvedValue({
    totalPending: 10,
    embeddedCount: 10,
    skippedCount: 0,
    failedCount: 0,
    durationMs: 500,
    dimension: 768,
    model: 'nomic-embed-text',
  }),
});

const makeRetrievalService = () => ({
  retrieve: jest.fn().mockResolvedValue({
    query: 'BM454 BOM insert',
    normalizedQuery: 'BM454 BOM insert',
    extractedFilters: { projectNumber: 'BM454' },
    results: [
      {
        chunkId: 'c1',
        score: 0.95,
        projectNumber: 'BM454',
        chunkText: 'BOM part insert',
        provenance: { sourceFile: 'mekb.sqlite' },
      },
    ],
    telemetry: {
      totalLatencyMs: 15,
      degradedMode: false,
    },
  }),
});

import { EngineeringPhi3GroundingService } from '../grounding/engineering-phi3-grounding.service';

const makeGroundingService = () => ({
  ask: jest.fn().mockResolvedValue({
    query: 'What is BM454 material?',
    answer: 'BM454 material is ALUMINIUM [REF-1].',
    grounded: true,
    confidence: 'HIGH',
    insufficientEvidence: false,
    citations: [{ ref: 'REF-1', chunkId: 'c1', projectNumber: 'BM454' }],
    telemetry: { totalLatencyMs: 25, modelUsed: 'phi3' },
  }),
});

describe('EngineeringLibraryController', () => {
  let controller: EngineeringLibraryController;
  let service: ReturnType<typeof makeService>;
  let scanner: ReturnType<typeof makeScanner>;
  let batchService: ReturnType<typeof makeBatchService>;
  let indexingService: ReturnType<typeof makeIndexingService>;
  let embeddingService: ReturnType<typeof makeEmbeddingService>;
  let retrievalService: ReturnType<typeof makeRetrievalService>;
  let groundingService: ReturnType<typeof makeGroundingService>;

  beforeEach(async () => {
    service = makeService();
    scanner = makeScanner();
    batchService = makeBatchService();
    indexingService = makeIndexingService();
    embeddingService = makeEmbeddingService();
    retrievalService = makeRetrievalService();
    groundingService = makeGroundingService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngineeringLibraryController],
      providers: [
        { provide: EngineeringLibraryService, useValue: service },
        { provide: EngineeringLibraryScannerService, useValue: scanner },
        { provide: KnowledgeIngestionBatchService, useValue: batchService },
        { provide: MekbIngestionService, useValue: {} },
        { provide: DocumentIngestionService, useValue: {} },
        { provide: KnowledgeIndexingBatchService, useValue: indexingService },
        { provide: EngineeringEmbeddingService, useValue: embeddingService },
        { provide: EngineeringRetrievalService, useValue: retrievalService },
        { provide: EngineeringPhi3GroundingService, useValue: groundingService },
      ],
    }).compile();

    controller = module.get<EngineeringLibraryController>(EngineeringLibraryController);
  });

  it('should list EKL projects', async () => {
    await controller.listProjects();
    expect(service.listProjects).toHaveBeenCalled();
  });

  it('should get EKL project by id', async () => {
    const result = await controller.getProject('p1');
    expect(service.getProject).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ id: 'p1' });
  });

  it('should list EKL documents', async () => {
    await controller.listDocuments();
    expect(service.listDocuments).toHaveBeenCalled();
  });

  it('should get EKL document by id', async () => {
    const result = await controller.getDocument('d1');
    expect(service.getDocument).toHaveBeenCalledWith('d1');
    expect(result).toEqual({ id: 'd1' });
  });

  it('should return dashboard widgets', async () => {
    const result = await controller.getDashboardWidgets();
    expect(service.getDashboardWidgets).toHaveBeenCalled();
    expect(result).toEqual({ totalProjects: 0, totalDocuments: 0, status: 'ok' });
  });

  it('should invoke synchronization', async () => {
    const result = await controller.synchronize();
    expect(service.synchronize).toHaveBeenCalled();
    expect(result.status).toBe('synchronized');
  });

  it('should return sync status', async () => {
    const result = await controller.syncStatus();
    expect(service.getSyncStatus).toHaveBeenCalled();
    expect(result.status).toBe('never_synced');
  });

  it('should trigger library scan', async () => {
    const result = await controller.triggerScan({ libraryPath: 'D:\\Test' });
    expect(scanner.scanLibrary).toHaveBeenCalledWith({ libraryPath: 'D:\\Test', computeHashesForEligibleOnly: undefined });
    expect(result.message).toContain('completed successfully');
    expect(result.scanBatchId).toBe('scan-test-123');
  });

  it('should return manifest', async () => {
    const result = await controller.getManifest();
    expect(scanner.getLastManifest).toHaveBeenCalled();
    expect((result as any).scanBatchId).toBe('scan-test-123');
  });

  it('should return markdown scan report', async () => {
    const result = await controller.getScanReport();
    expect(scanner.getLastManifest).toHaveBeenCalled();
    expect(scanner.generateScanReportMarkdown).toHaveBeenCalled();
    expect(result.report).toBe('# M7 Scan Report');
  });

  it('should return scanner status', async () => {
    const result = await controller.getScannerStatus();
    expect(scanner.getLastManifest).toHaveBeenCalled();
    expect(scanner.resolveLibraryPath).toHaveBeenCalled();
    expect(result.configuredPath).toBe('D:\\Mitra3.0\\MitraEngineeringLibrary');
    expect(result.hasLastScan).toBe(true);
  });

  it('should start ingestion batch', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.startIngestion(req, { ingestDatabase: true, ingestDocuments: true });
    expect(batchService.executeIngestionBatch).toHaveBeenCalledWith('tenant-1', {
      libraryPath: undefined,
      scanBatchId: undefined,
      ingestDatabase: true,
      ingestDocuments: true,
    });
    expect(result.batchId).toBe('batch-123');
    expect(result.status).toBe('COMPLETED');
    expect(result.recordsCreated).toBe(3138);
  });

  it('should return ingestion status', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.getIngestionStatus(req);
    expect(batchService.getLatestBatchStatus).toHaveBeenCalledWith('tenant-1');
    expect((result as any).id).toBe('batch-123');
  });

  it('should list ingestion batches', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.listBatches(req, 10);
    expect(batchService.listBatches).toHaveBeenCalledWith('tenant-1', 10);
    expect(result.length).toBe(1);
  });

  it('should get batch by ID', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.getBatchById(req, 'batch-123');
    expect(batchService.getBatch).toHaveBeenCalledWith('tenant-1', 'batch-123');
    expect(result.id).toBe('batch-123');
  });

  // --- M7.2 Indexing Endpoint Tests ---

  it('should trigger index preparation pipeline', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.prepareIndex(req, { embedImmediately: true });
    expect(indexingService.runIndexingPipeline).toHaveBeenCalledWith('tenant-1', {
      embedImmediately: true,
      batchSize: undefined,
    });
    expect(result.chunksCreated).toBe(3474);
    expect(result.embeddedCount).toBe(3474);
  });

  it('should trigger embedding batch', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.embedPending(req, { batchSize: 50 });
    expect(embeddingService.embedPendingChunks).toHaveBeenCalledWith('tenant-1', {
      batchSize: 50,
      maxChunks: undefined,
      forceReembed: undefined,
    });
    expect(result.embeddedCount).toBe(10);
    expect(result.dimension).toBe(768);
  });

  it('should return index status', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.getIndexStatus(req);
    expect(indexingService.getIndexingStatus).toHaveBeenCalledWith('tenant-1');
    expect(result.totalChunks).toBe(3474);
    expect(result.isFullyIndexed).toBe(true);
  });

  it('should get chunk by ID', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.getChunk(req, 'chunk-123');
    expect(indexingService.getChunkById).toHaveBeenCalledWith('tenant-1', 'chunk-123');
    expect(result.id).toBe('chunk-123');
  });

  it('should retry failed chunks', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.retryFailed(req);
    expect(indexingService.retryFailedChunks).toHaveBeenCalledWith('tenant-1');
    expect(result.message).toContain('Retried failed knowledge chunks');
  });

  // --- M7.3 Retrieval Endpoint Tests ---

  it('should execute hybrid knowledge retrieval via POST /ekl/search', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.retrieveKnowledge(req, { query: 'BM454 BOM insert', topK: 5 });
    expect(retrievalService.retrieve).toHaveBeenCalledWith('tenant-1', { query: 'BM454 BOM insert', topK: 5 });
    expect(result.query).toBe('BM454 BOM insert');
    expect(result.results.length).toBe(1);
    expect(result.results[0].projectNumber).toBe('BM454');
  });

  it('should execute debug retrieval via POST /ekl/search/debug', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.retrieveDebugKnowledge(req, { query: 'BM454 BOM insert', topK: 5 });
    expect(retrievalService.retrieve).toHaveBeenCalledWith('tenant-1', {
      query: 'BM454 BOM insert',
      topK: 5,
      includeDebug: true,
    });
    expect(result.results[0].projectNumber).toBe('BM454');
  });

  // --- M7.4 Grounding Endpoint Tests ---

  it('should execute grounded question answering via POST /ekl/ask', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.askEngineeringQuestion(req, { query: 'What is BM454 material?', topK: 5 });
    expect(groundingService.ask).toHaveBeenCalledWith('tenant-1', { query: 'What is BM454 material?', topK: 5 });
    expect(result.grounded).toBe(true);
    expect(result.citations.length).toBe(1);
    expect(result.answer).toContain('ALUMINIUM');
  });

  it('should execute debug grounded question answering via POST /ekl/ask/debug', async () => {
    const req = { user: { tenantId: 'tenant-1' }, headers: {} };
    const result = await controller.askDebugEngineeringQuestion(req, { query: 'What is BM454 material?', topK: 5 });
    expect(groundingService.ask).toHaveBeenCalledWith('tenant-1', { query: 'What is BM454 material?', topK: 5 });
    expect(result.grounded).toBe(true);
    expect(result.citations.length).toBe(1);
  });
});
