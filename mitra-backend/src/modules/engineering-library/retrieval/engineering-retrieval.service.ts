import { Injectable, Logger } from '@nestjs/common';
import {
  EngineeringRetrievalRequestDto,
  EngineeringRetrievalResponseDto,
  EngineeringRetrievalResultDto,
  RetrievalTelemetryDto,
} from './dto/engineering-retrieval.dto';
import { EngineeringQueryNormalizerService } from './engineering-query-normalizer.service';
import { EngineeringSynonymService } from './engineering-synonym.service';
import { EngineeringLexicalSearchService } from './engineering-lexical-search.service';
import { EngineeringVectorSearchService } from './engineering-vector-search.service';
import { EngineeringHybridFusionService } from './engineering-hybrid-fusion.service';
import { EngineeringRerankerService } from './engineering-reranker.service';
import { EngineeringDiversityService } from './engineering-diversity.service';

@Injectable()
export class EngineeringRetrievalService {
  private readonly logger = new Logger(EngineeringRetrievalService.name);

  constructor(
    private readonly queryNormalizer: EngineeringQueryNormalizerService,
    private readonly synonymService: EngineeringSynonymService,
    private readonly lexicalSearch: EngineeringLexicalSearchService,
    private readonly vectorSearch: EngineeringVectorSearchService,
    private readonly hybridFusion: EngineeringHybridFusionService,
    private readonly reranker: EngineeringRerankerService,
    private readonly diversityService: EngineeringDiversityService,
  ) {}

  /**
   * Execute production hybrid engineering retrieval.
   */
  async retrieve(tenantId: string, request: EngineeringRetrievalRequestDto): Promise<EngineeringRetrievalResponseDto> {
    const totalStartTime = Date.now();
    const topK = Math.min(50, Math.max(1, request.topK || 10));

    // 1. Query Normalization & Filter Extraction
    const { normalizedQuery, searchTokens, extractedFilters } = this.queryNormalizer.normalizeQuery(
      request.query,
      request.filters,
    );

    // 2. Controlled Synonym Expansion
    const expandedTokens = this.synonymService.expandQueryTerms(searchTokens);

    // 3. Parallel Lexical & Vector Candidate Retrieval
    let lexicalStartTime = Date.now();
    const lexicalCandidates = await this.lexicalSearch.searchLexical(tenantId, expandedTokens, extractedFilters, topK * 3);
    const lexicalLatencyMs = Date.now() - lexicalStartTime;

    let vectorStartTime = Date.now();
    const vectorResult = await this.vectorSearch.searchVector(tenantId, normalizedQuery, extractedFilters, topK * 3);
    const vectorLatencyMs = Date.now() - vectorStartTime;

    // 4. Query-Type-Aware Adaptive Reciprocal Rank Fusion (RRF)
    const hasIdentifier = !!(extractedFilters.projectNumber || extractedFilters.machine || extractedFilters.material || extractedFilters.revision);
    const lexicalWeight = hasIdentifier ? 2.5 : extractedFilters.entityType ? 2.0 : 1.2;
    const vectorWeight = hasIdentifier ? 0.6 : extractedFilters.entityType ? 1.0 : 1.5;

    const fusionStartTime = Date.now();
    const fusedCandidates = this.hybridFusion.fuseCandidates(lexicalCandidates, vectorResult.candidates, {
      topK: topK * 2,
      lexicalWeight,
      vectorWeight,
    });
    const fusionLatencyMs = Date.now() - fusionStartTime;

    // 5. Engineering Feature Reranking
    const rerankStartTime = Date.now();
    const rerankedCandidates = this.reranker.rerank(fusedCandidates, normalizedQuery, extractedFilters);
    const rerankLatencyMs = Date.now() - rerankStartTime;

    // 6. Diversity & Deduplication Filtering
    const finalCandidates = this.diversityService.diversifyResults(rerankedCandidates, 3, topK);

    // Filter by minScore if specified
    const minScore = request.minScore ?? 0.05;
    const filteredFinal = finalCandidates.filter((c) => c.finalScore >= minScore);

    const totalLatencyMs = Date.now() - totalStartTime;

    // 7. Assemble Structured Results with Complete Provenance
    const results: EngineeringRetrievalResultDto[] = filteredFinal.map((c) => {
      const chunk = c.chunk;
      return {
        chunkId: chunk.id,
        score: c.finalScore,
        lexicalScore: c.lexicalScore,
        vectorScore: c.vectorScore,
        fusionScore: c.fusionScore,
        rerankScore: c.rerankScore,
        entityType: chunk.entityType,
        entityId: chunk.entityId,
        chunkType: chunk.chunkType,
        title: `${chunk.entityType} ${chunk.projectNumber ? '[' + chunk.projectNumber + ']' : ''}`.trim(),
        projectNumber: chunk.projectNumber,
        projectPrefix: chunk.projectPrefix,
        customer: chunk.customer,
        machine: chunk.machine,
        material: chunk.material,
        revision: chunk.revision,
        authorityStatus: chunk.authorityStatus,
        chunkText: chunk.chunkText,
        provenance: {
          sourceId: chunk.sourceId,
          sourceType: chunk.sourceType,
          relativePath: chunk.relativePath,
          sourceFile: chunk.sourceFile,
          sourceSheet: chunk.sourceSheet,
          sourceRow: chunk.sourceRow,
          sourcePage: chunk.sourcePage,
        },
        structuredMetadata: request.includeDebug ? chunk.structuredMetadata : null,
      };
    });

    const telemetry: RetrievalTelemetryDto = {
      lexicalLatencyMs,
      vectorLatencyMs,
      fusionLatencyMs,
      rerankLatencyMs,
      totalLatencyMs,
      lexicalCandidatesCount: lexicalCandidates.length,
      vectorCandidatesCount: vectorResult.candidates.length,
      fusedCandidatesCount: fusedCandidates.length,
      finalCount: results.length,
      degradedMode: vectorResult.degraded,
      degradedReason: vectorResult.error,
    };

    return {
      query: request.query,
      normalizedQuery,
      extractedFilters,
      results,
      telemetry,
    };
  }
}
