import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { LexicalCandidate } from './engineering-lexical-search.service';
import { VectorCandidate } from './engineering-vector-search.service';

export interface FusedCandidate {
  chunk: KnowledgeChunk;
  fusionScore: number;
  lexicalScore: number;
  vectorScore: number;
  lexicalRank: number | null;
  vectorRank: number | null;
  matchedTokens: string[];
}

@Injectable()
export class EngineeringHybridFusionService {
  private readonly logger = new Logger(EngineeringHybridFusionService.name);
  private readonly defaultRrfK = 60;

  /**
   * Fuse lexical and vector candidates using Reciprocal Rank Fusion (RRF).
   */
  fuseCandidates(
    lexicalCandidates: LexicalCandidate[],
    vectorCandidates: VectorCandidate[],
    options: {
      rrfK?: number;
      lexicalWeight?: number;
      vectorWeight?: number;
      topK?: number;
    } = {},
  ): FusedCandidate[] {
    const k = options.rrfK || this.defaultRrfK;
    const wLex = options.lexicalWeight ?? 1.0;
    const wVec = options.vectorWeight ?? 1.0;

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
        lexicalRank: rank,
        vectorRank: null,
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
          lexicalRank: null,
          vectorRank: rank,
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
