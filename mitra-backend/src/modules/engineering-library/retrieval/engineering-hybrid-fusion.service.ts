import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { LexicalCandidate } from './engineering-lexical-search.service';
import { VectorCandidate } from './engineering-vector-search.service';

export interface GraphCandidate {
  chunk: KnowledgeChunk;
  graphScore: number;
  relationType?: string;
  hopDistance?: number;
}

export interface FusedCandidate {
  chunk: KnowledgeChunk;
  fusionScore: number;
  lexicalScore: number;
  vectorScore: number;
  graphScore?: number;
  lexicalRank: number | null;
  vectorRank: number | null;
  graphRank?: number | null;
  matchedTokens: string[];
}


export interface FusionOptions {
  rrfK?: number;
  lexicalWeight?: number;
  vectorWeight?: number;
  graphWeight?: number;
  topK?: number;
}

@Injectable()
export class EngineeringHybridFusionService {
  private readonly logger = new Logger(EngineeringHybridFusionService.name);
  private readonly defaultRrfK = 60;

  /**
   * Fuse lexical, vector, and optional graph lineage candidates using Reciprocal Rank Fusion (RRF).
   */
  fuseCandidates(
    lexicalCandidates: LexicalCandidate[],
    vectorCandidates: VectorCandidate[],
    graphOrOptions?: GraphCandidate[] | FusionOptions,
    optionsArg?: FusionOptions,
  ): FusedCandidate[] {
    const graphCandidates: GraphCandidate[] = Array.isArray(graphOrOptions) ? graphOrOptions : [];
    const options: FusionOptions = Array.isArray(graphOrOptions)
      ? optionsArg || {}
      : graphOrOptions || {};

    const k = options.rrfK || this.defaultRrfK;
    const wLex = options.lexicalWeight ?? 1.0;
    const wVec = options.vectorWeight ?? 1.0;
    const wGraph = options.graphWeight ?? 0.8;

    const candidateMap = new Map<string, FusedCandidate>();


    // 1. Process Lexical Candidates
    lexicalCandidates.forEach((lex, idx) => {
      const rank = idx + 1;
      const chunkId = lex.chunk.id;
      candidateMap.set(chunkId, {
        chunk: lex.chunk,
        fusionScore: wLex / (k + rank),
        lexicalScore: lex.lexicalScore,
        vectorScore: 0,
        graphScore: 0,
        lexicalRank: rank,
        vectorRank: null,
        graphRank: null,
        matchedTokens: lex.matchedTokens || [],
      });
    });

    // 2. Process Vector Candidates & Merge
    vectorCandidates.forEach((vec, idx) => {
      const rank = idx + 1;
      const chunkId = vec.chunk.id;
      const rrfContribution = wVec / (k + rank);

      if (candidateMap.has(chunkId)) {
        const existing = candidateMap.get(chunkId)!;
        existing.fusionScore += rrfContribution;
        existing.vectorScore = vec.vectorScore;
        existing.vectorRank = rank;
      } else {
        candidateMap.set(chunkId, {
          chunk: vec.chunk,
          fusionScore: rrfContribution,
          lexicalScore: 0,
          vectorScore: vec.vectorScore,
          graphScore: 0,
          lexicalRank: null,
          vectorRank: rank,
          graphRank: null,
          matchedTokens: [],
        });
      }
    });

    // 3. Process Graph Candidates & Merge (GraphRAG Multi-Hop Augmentation)
    graphCandidates.forEach((grp, idx) => {
      const rank = idx + 1;
      const chunkId = grp.chunk.id;
      const rrfContribution = wGraph / (k + rank);

      if (candidateMap.has(chunkId)) {
        const existing = candidateMap.get(chunkId)!;
        existing.fusionScore += rrfContribution;
        existing.graphScore = grp.graphScore;
        existing.graphRank = rank;
      } else {
        candidateMap.set(chunkId, {
          chunk: grp.chunk,
          fusionScore: rrfContribution,
          lexicalScore: 0,
          vectorScore: 0,
          graphScore: grp.graphScore,
          lexicalRank: null,
          vectorRank: null,
          graphRank: rank,
          matchedTokens: [],
        });
      }
    });

    const fusedList = Array.from(candidateMap.values());
    if (fusedList.length === 0) return [];

    // Min-Max normalize fusion scores to [0, 1]
    const maxScore = Math.max(...fusedList.map((c) => c.fusionScore));
    const minScore = Math.min(...fusedList.map((c) => c.fusionScore));
    const scoreRange = maxScore - minScore;

    for (const item of fusedList) {
      if (scoreRange > 0.0001) {
        item.fusionScore = Math.round(((item.fusionScore - minScore) / scoreRange) * 1000) / 1000;
      } else {
        item.fusionScore = 1.0;
      }
    }

    // Sort descending by fusion score
    fusedList.sort((a, b) => b.fusionScore - a.fusionScore);

    return options.topK ? fusedList.slice(0, options.topK) : fusedList;
  }
}
