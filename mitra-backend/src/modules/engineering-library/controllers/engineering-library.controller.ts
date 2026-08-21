import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { EngineeringLibraryService } from '../services/engineering-library.service';
import { EngineeringLibraryScannerService } from '../services/engineering-library-scanner.service';
import { KnowledgeIngestionBatchService } from '../services/knowledge-ingestion-batch.service';
import { MekbIngestionService } from '../services/mekb-ingestion.service';
import { DocumentIngestionService } from '../services/document-ingestion.service';
import { KnowledgeIndexingBatchService } from '../services/knowledge-indexing-batch.service';
import { EngineeringEmbeddingService } from '../embeddings/engineering-embedding.service';
import { EngineeringRetrievalService } from '../retrieval/engineering-retrieval.service';
import { EngineeringRetrievalRequestDto } from '../retrieval/dto/engineering-retrieval.dto';
import { EngineeringPhi3GroundingService } from '../grounding/engineering-phi3-grounding.service';
import { EngineeringAskRequestDto } from '../grounding/dto/engineering-grounding.dto';

@ApiTags('engineering-library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ekl')
export class EngineeringLibraryController {
  constructor(
    private readonly service: EngineeringLibraryService,
    private readonly scanner: EngineeringLibraryScannerService,
    private readonly batchService: KnowledgeIngestionBatchService,
    private readonly mekbIngestion: MekbIngestionService,
    private readonly documentIngestion: DocumentIngestionService,
    private readonly indexingService: KnowledgeIndexingBatchService,
    private readonly embeddingService: EngineeringEmbeddingService,
    private readonly retrievalService: EngineeringRetrievalService,
    private readonly groundingService: EngineeringPhi3GroundingService,
  ) {}

  @Get('projects')
  async listProjects() {
    return this.service.listProjects();
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string) {
    return this.service.getProject(id);
  }

  @Get('documents')
  async listDocuments() {
    return this.service.listDocuments();
  }

  @Get('documents/:id')
  async getDocument(@Param('id') id: string) {
    return this.service.getDocument(id);
  }

  @Get('dashboard/widgets')
  async getDashboardWidgets() {
    return this.service.getDashboardWidgets();
  }

  @Post('sync')
  async synchronize() {
    return this.service.synchronize();
  }

  @Get('sync/status')
  async syncStatus() {
    return this.service.getSyncStatus();
  }

  // --- M7.0 Scanner Endpoints ---

  @Post('scan')
  async triggerScan(@Body() body?: { libraryPath?: string; computeHashesForEligibleOnly?: boolean }) {
    const manifest = await this.scanner.scanLibrary({
      libraryPath: body?.libraryPath,
      computeHashesForEligibleOnly: body?.computeHashesForEligibleOnly,
    });
    return {
      message: 'Engineering Library scan completed successfully (read-only)',
      scanBatchId: manifest.scanBatchId,
      totalFiles: manifest.totalFiles,
      eligibleFiles: manifest.eligibleFiles,
      excludedFiles: manifest.excludedFiles,
      duplicateGroupsCount: manifest.duplicateGroups.length,
      revisionGroupsCount: manifest.revisionCandidateGroups.length,
      errorsCount: manifest.scanErrors.length,
    };
  }

  @Get('manifest')
  async getManifest() {
    const manifest = this.scanner.getLastManifest();
    return manifest ?? { message: 'No scan has been performed yet in this session.' };
  }

  @Get('scan-report')
  async getScanReport() {
    const manifest = this.scanner.getLastManifest();
    if (!manifest) {
      return { report: 'No scan performed yet. Call POST /ekl/scan first.' };
    }
    return { report: this.scanner.generateScanReportMarkdown(manifest) };
  }

  @Get('scan/status')
  async getScannerStatus() {
    const manifest = this.scanner.getLastManifest();
    return {
      configuredPath: this.scanner.resolveLibraryPath(),
      hasLastScan: manifest !== null,
      lastScanBatchId: manifest?.scanBatchId ?? null,
      lastScanTimestamp: manifest?.scanTimestamp ?? null,
      totalFiles: manifest?.totalFiles ?? 0,
      eligibleFiles: manifest?.eligibleFiles ?? 0,
    };
  }

  // --- M7.1 Ingestion Endpoints ---

  @Post('ingestion/start')
  async startIngestion(
    @Request() req: any,
    @Body() body?: {
      libraryPath?: string;
      scanBatchId?: string;
      ingestDatabase?: boolean;
      ingestDocuments?: boolean;
    },
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    const batch = await this.batchService.executeIngestionBatch(tenantId, {
      libraryPath: body?.libraryPath,
      scanBatchId: body?.scanBatchId,
      ingestDatabase: body?.ingestDatabase,
      ingestDocuments: body?.ingestDocuments,
    });
    return {
      message: 'Engineering Knowledge Library ingestion completed',
      batchId: batch.id,
      status: batch.status,
      recordsCreated: batch.recordsCreated,
      recordsUpdated: batch.recordsUpdated,
      recordsSkipped: batch.skipped,
      failed: batch.failed,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
    };
  }

  @Get('ingestion/status')
  async getIngestionStatus(@Request() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    const latest = await this.batchService.getLatestBatchStatus(tenantId);
    return latest ?? { status: 'NO_BATCHES_FOUND' };
  }

  @Get('ingestion/batches')
  async listBatches(@Request() req: any, @Query('limit') limit?: number) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.batchService.listBatches(tenantId, limit ? Number(limit) : 20);
  }

  @Get('ingestion/batches/:id')
  async getBatchById(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.batchService.getBatch(tenantId, id);
  }

  // --- M7.2 Normalization, Chunking & Embedding Endpoints ---

  @Post('index/prepare')
  async prepareIndex(
    @Request() req: any,
    @Body() body?: {
      embedImmediately?: boolean;
      batchSize?: number;
    },
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    const summary = await this.indexingService.runIndexingPipeline(tenantId, {
      embedImmediately: body?.embedImmediately,
      batchSize: body?.batchSize,
    });
    return {
      message: 'Engineering normalization, chunking, and semantic indexing pipeline executed',
      ...summary,
    };
  }

  @Post('index/embed')
  async embedPending(
    @Request() req: any,
    @Body() body?: {
      batchSize?: number;
      maxChunks?: number;
      forceReembed?: boolean;
    },
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    const result = await this.embeddingService.embedPendingChunks(tenantId, {
      batchSize: body?.batchSize,
      maxChunks: body?.maxChunks,
      forceReembed: body?.forceReembed,
    });
    return {
      message: 'Semantic vector embedding batch executed',
      ...result,
    };
  }

  @Get('index/status')
  async getIndexStatus(@Request() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.indexingService.getIndexingStatus(tenantId);
  }

  @Get('index/chunks/:id')
  async getChunk(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.indexingService.getChunkById(tenantId, id);
  }

  @Post('index/retry-failed')
  async retryFailed(@Request() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    const result = await this.indexingService.retryFailedChunks(tenantId);
    return {
      message: 'Retried failed knowledge chunks',
      ...result,
    };
  }

  // --- M7.3 Hybrid Engineering Retrieval Endpoints ---

  @Post('search')
  async retrieveKnowledge(@Request() req: any, @Body() body: EngineeringRetrievalRequestDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.retrievalService.retrieve(tenantId, body);
  }

  @Post('search/debug')
  async retrieveDebugKnowledge(@Request() req: any, @Body() body: EngineeringRetrievalRequestDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.retrievalService.retrieve(tenantId, { ...body, includeDebug: true });
  }

  // --- M7.4 Phi-3 Grounding & Citation Endpoints ---

  @Post('ask')
  async askEngineeringQuestion(@Request() req: any, @Body() body: EngineeringAskRequestDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.groundingService.ask(tenantId, body);
  }

  @Post('ask/debug')
  async askDebugEngineeringQuestion(@Request() req: any, @Body() body: EngineeringAskRequestDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant';
    return this.groundingService.ask(tenantId, body);
  }
}
