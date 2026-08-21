import { AuthorityStatus } from '../../types/engineering-library-scan.types';
import { EngineeringChunkProvenance, EngineeringRetrievalFilters } from '../../retrieval/dto/engineering-retrieval.dto';

export interface EngineeringAskRequestDto {
  query: string;
  topK?: number;
  filters?: EngineeringRetrievalFilters;
  includeHistorical?: boolean;
  maxContextChars?: number;
}

export interface EngineeringCitationDto {
  ref: string; // e.g. "REF-1"
  chunkId: string;
  entityType: string;
  entityId: string;
  title: string;
  projectNumber: string | null;
  authorityStatus: AuthorityStatus;
  provenance: EngineeringChunkProvenance;
  snippet: string;
  isValid: boolean;
}

export interface GroundingTelemetryDto {
  retrievalLatencyMs: number;
  contextBuilderLatencyMs: number;
  llmInferenceLatencyMs: number;
  citationValidationLatencyMs: number;
  totalLatencyMs: number;
  contextChunksCount: number;
  contextCharsCount: number;
  modelUsed: string;
  isLiveInference: boolean;
  hallucinatedCitationsDetected: number;
}

export interface EngineeringAskResponseDto {
  query: string;
  answer: string;
  grounded: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'REFUSAL';
  insufficientEvidence: boolean;
  citations: EngineeringCitationDto[];
  telemetry: GroundingTelemetryDto;
}
