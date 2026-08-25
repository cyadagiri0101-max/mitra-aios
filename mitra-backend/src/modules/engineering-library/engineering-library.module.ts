import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EngineeringLibraryController } from './controllers/engineering-library.controller';
import { EngineeringLibraryService } from './services/engineering-library.service';
import { EngineeringLibraryScannerService } from './services/engineering-library-scanner.service';
import { MekbIngestionService } from './services/mekb-ingestion.service';
import { DocumentIngestionService } from './services/document-ingestion.service';
import { KnowledgeIngestionBatchService } from './services/knowledge-ingestion-batch.service';
import { EngineeringNormalizerService } from './normalization/engineering-normalizer.service';
import { EngineeringChunkerService } from './chunking/engineering-chunker.service';
import { EngineeringEmbeddingService } from './embeddings/engineering-embedding.service';
import { KnowledgeIndexingBatchService } from './services/knowledge-indexing-batch.service';
import { EngineeringQueryNormalizerService } from './retrieval/engineering-query-normalizer.service';
import { EngineeringSynonymService } from './retrieval/engineering-synonym.service';
import { EngineeringLexicalSearchService } from './retrieval/engineering-lexical-search.service';
import { EngineeringVectorSearchService } from './retrieval/engineering-vector-search.service';
import { EngineeringHybridFusionService } from './retrieval/engineering-hybrid-fusion.service';
import { EngineeringRerankerService } from './retrieval/engineering-reranker.service';
import { EngineeringDiversityService } from './retrieval/engineering-diversity.service';
import { EngineeringRetrievalService } from './retrieval/engineering-retrieval.service';
import { EngineeringContextBuilderService } from './grounding/engineering-context-builder.service';
import { EngineeringCitationValidatorService } from './grounding/engineering-citation-validator.service';
import { EngineeringPhi3GroundingService } from './grounding/engineering-phi3-grounding.service';
import { CadFeatureKnowledgeService } from './services/cad-feature-knowledge.service';
import { EngineeringToleranceParserService } from './normalization/engineering-tolerance-parser.service';

import { KnowledgeSource } from './entities/knowledge-source.entity';
import { KnowledgeIngestionBatch } from './entities/knowledge-ingestion-batch.entity';
import { KnowledgeIngestionItem } from './entities/knowledge-ingestion-item.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { KnowledgeCatalogEntry } from '../knowledge/entities/knowledge-catalog.entity';
import { KnowledgeEmbedding } from '../ai/entities/knowledge-embedding.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AiModule),
    TypeOrmModule.forFeature([
      KnowledgeSource,
      KnowledgeIngestionBatch,
      KnowledgeIngestionItem,
      KnowledgeCatalogEntry,
      KnowledgeChunk,
      KnowledgeEmbedding,
    ]),
  ],
  controllers: [EngineeringLibraryController],
  providers: [
    EngineeringLibraryService,
    EngineeringLibraryScannerService,
    MekbIngestionService,
    DocumentIngestionService,
    KnowledgeIngestionBatchService,
    EngineeringNormalizerService,
    EngineeringChunkerService,
    EngineeringEmbeddingService,
    CadFeatureKnowledgeService,
    EngineeringToleranceParserService,
    KnowledgeIndexingBatchService,
    EngineeringQueryNormalizerService,
    EngineeringSynonymService,
    EngineeringLexicalSearchService,
    EngineeringVectorSearchService,
    EngineeringHybridFusionService,
    EngineeringRerankerService,
    EngineeringDiversityService,
    EngineeringRetrievalService,
    EngineeringContextBuilderService,
    EngineeringCitationValidatorService,
    EngineeringPhi3GroundingService,
  ],
  exports: [
    EngineeringLibraryService,
    EngineeringLibraryScannerService,
    MekbIngestionService,
    DocumentIngestionService,
    KnowledgeIngestionBatchService,
    EngineeringNormalizerService,
    EngineeringChunkerService,
    EngineeringEmbeddingService,
    CadFeatureKnowledgeService,
    EngineeringToleranceParserService,
    KnowledgeIndexingBatchService,
    EngineeringQueryNormalizerService,
    EngineeringSynonymService,
    EngineeringLexicalSearchService,
    EngineeringVectorSearchService,
    EngineeringHybridFusionService,
    EngineeringRerankerService,
    EngineeringDiversityService,
    EngineeringRetrievalService,
    EngineeringContextBuilderService,
    EngineeringCitationValidatorService,
    EngineeringPhi3GroundingService,
  ],
})
export class EngineeringLibraryModule {}
