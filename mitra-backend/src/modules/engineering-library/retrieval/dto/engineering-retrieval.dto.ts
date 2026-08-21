import { AuthorityStatus } from '../../types/engineering-library-scan.types';

export interface EngineeringRetrievalFilters {
  projectNumber?: string;
  projectPrefix?: string;
  customer?: string;
  machine?: string;
  material?: string;
  entityType?: string;
  chunkType?: string;
  authorityStatus?: AuthorityStatus;
  revision?: string;
}

export interface EngineeringRetrievalRequestDto {
  query: string;
  topK?: number;
  filters?: EngineeringRetrievalFilters;
  includeDebug?: boolean;
  minScore?: number;
}

export interface EngineeringChunkProvenance {
  sourceId: string | null;
  sourceType: string;
  relativePath: string | null;
  sourceFile: string | null;
  sourceSheet: string | null;
  sourceRow: number | null;
  sourcePage: number | null;
}

export interface EngineeringRetrievalResultDto {
  chunkId: string;
  score: number;
  lexicalScore?: number;
  vectorScore?: number;
  fusionScore?: number;
  rerankScore?: number;
  entityType: string;
  entityId: string;
  chunkType: string;
  title: string;
  projectNumber: string | null;
  projectPrefix: string | null;
  customer: string | null;
  machine: string | null;
  material: string | null;
  revision: string | null;
  authorityStatus: AuthorityStatus;
  chunkText: string;
  provenance: EngineeringChunkProvenance;
  highlights?: string[];
  structuredMetadata?: Record<string, any> | null;
}

export interface RetrievalTelemetryDto {
  lexicalLatencyMs: number;
  vectorLatencyMs: number;
  fusionLatencyMs: number;
  rerankLatencyMs: number;
  totalLatencyMs: number;
  lexicalCandidatesCount: number;
  vectorCandidatesCount: number;
  fusedCandidatesCount: number;
  finalCount: number;
  degradedMode: boolean;
  degradedReason?: string;
}

export interface EngineeringRetrievalResponseDto {
  query: string;
  normalizedQuery: string;
  extractedFilters: EngineeringRetrievalFilters;
  results: EngineeringRetrievalResultDto[];
  telemetry: RetrievalTelemetryDto;
}
