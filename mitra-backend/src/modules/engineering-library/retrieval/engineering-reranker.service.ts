import { Injectable, Logger } from '@nestjs/common';
import { AuthorityStatus } from '../types/engineering-library-scan.types';
import { FusedCandidate } from './engineering-hybrid-fusion.service';
import { EngineeringRetrievalFilters } from './dto/engineering-retrieval.dto';

export interface RerankedCandidate extends FusedCandidate {
  rerankScore: number;
  finalScore: number;
  boostBreakdown: {
    projectBoost: number;
    partBoost: number;
    machineBoost: number;
    materialBoost: number;
    phraseBoost: number;
    authorityFactor: number;
  };
}

@Injectable()
export class EngineeringRerankerService {
  private readonly logger = new Logger(EngineeringRerankerService.name);

  /**
   * Re-rank fused candidates using deterministic engineering domain features.
   */
  rerank(
    fusedCandidates: FusedCandidate[],
    normalizedQuery: string,
    extractedFilters: EngineeringRetrievalFilters,
  ): RerankedCandidate[] {
    const lowerQuery = normalizedQuery.toLowerCase().trim();
    const queryTokens = lowerQuery.split(' ').filter((t) => t.length > 0);

    const rerankedList: RerankedCandidate[] = [];

    for (const cand of fusedCandidates) {
      const chunk = cand.chunk;
      const lowerChunkText = chunk.chunkText.toLowerCase();

      let projectBoost = 0;
      let partBoost = 0;
      let machineBoost = 0;
      let materialBoost = 0;
      let phraseBoost = 0;

      // 1. Exact Project Number Match Boost (+0.35)
      if (extractedFilters.projectNumber && chunk.projectNumber) {
        if (chunk.projectNumber.toLowerCase() === extractedFilters.projectNumber.toLowerCase()) {
          projectBoost = 0.35;
        } else if (chunk.projectNumber.toLowerCase().includes(extractedFilters.projectNumber.toLowerCase())) {
          projectBoost = 0.2;
        }
      } else if (chunk.projectNumber && lowerQuery.includes(chunk.projectNumber.toLowerCase())) {
        projectBoost = 0.35;
      }

      // 2. Exact Part Description / BOM Match Boost (+0.30)
      if (chunk.chunkType === 'BOM_TABLE' || chunk.entityType === 'BOM_PART') {
        const bomPartTitle = chunk.structuredMetadata?.description || chunk.structuredMetadata?.item_name || '';
        if (bomPartTitle && lowerQuery.includes(String(bomPartTitle).toLowerCase())) {
          partBoost = 0.3;
        } else if (queryTokens.some((t) => lowerChunkText.includes(t) && t.length > 3)) {
          partBoost = 0.15;
        }
      }

      // 3. Exact Machine / Material Match Boost (+0.25)
      if (extractedFilters.machine && chunk.machine && chunk.machine.toLowerCase().includes(extractedFilters.machine.toLowerCase())) {
        machineBoost = 0.25;
      } else if (chunk.machine && lowerQuery.includes(chunk.machine.toLowerCase())) {
        machineBoost = 0.25;
      }

      if (extractedFilters.material && chunk.material && chunk.material.toLowerCase().includes(extractedFilters.material.toLowerCase())) {
        materialBoost = 0.25;
      } else if (chunk.material && lowerQuery.includes(chunk.material.toLowerCase())) {
        materialBoost = 0.25;
      }

      // 4. Exact Query Phrase in Chunk Text (+0.20)
      if (lowerQuery.length > 5 && lowerChunkText.includes(lowerQuery)) {
        phraseBoost = 0.2;
      }

      // 5. Authority Multiplier Factor
      let authorityFactor = 1.0;
      switch (chunk.authorityStatus) {
        case AuthorityStatus.AUTHORITATIVE_RELEASE:
          authorityFactor = 1.0;
          break;
        case AuthorityStatus.CURRENT_WORKING:
          authorityFactor = 0.95;
          break;
        case AuthorityStatus.HISTORICAL_REFERENCE:
          authorityFactor = 0.8;
          break;
        case AuthorityStatus.SUPERSEDED:
          authorityFactor = 0.3;
          break;
        default:
          authorityFactor = 0.9;
      }

      // Combine base fusion score and domain boosts
      const rawBoosted = cand.fusionScore + projectBoost + partBoost + machineBoost + materialBoost + phraseBoost;
      const finalRerankScore = Math.max(0, Math.min(1.0, Math.round(rawBoosted * authorityFactor * 1000) / 1000));

      rerankedList.push({
        ...cand,
        rerankScore: finalRerankScore,
        finalScore: finalRerankScore,
        boostBreakdown: {
          projectBoost,
          partBoost,
          machineBoost,
          materialBoost,
          phraseBoost,
          authorityFactor,
        },
      });
    }

    // Sort descending by finalScore
    return rerankedList.sort((a, b) => b.finalScore - a.finalScore);
  }
}
