import { Injectable, Logger } from '@nestjs/common';
import { RerankedCandidate } from './engineering-reranker.service';

@Injectable()
export class EngineeringDiversityService {
  private readonly logger = new Logger(EngineeringDiversityService.name);

  /**
   * Filter and diversify candidates to avoid returning redundant duplicate chunks.
   */
  diversifyResults(candidates: RerankedCandidate[], maxPerEntity = 3, topK = 10): RerankedCandidate[] {
    const seenHashes = new Set<string>();
    const entityCounts = new Map<string, number>();
    const diversified: RerankedCandidate[] = [];

    for (const cand of candidates) {
      const hash = cand.chunk.contentHash;
      const entityKey = `${cand.chunk.entityType}:${cand.chunk.entityId}`;

      // 1. Skip exact duplicate content
      if (seenHashes.has(hash)) {
        continue;
      }

      // 2. Limit dominance of a single entity
      const count = entityCounts.get(entityKey) || 0;
      if (count >= maxPerEntity) {
        continue;
      }

      seenHashes.add(hash);
      entityCounts.set(entityKey, count + 1);
      diversified.push(cand);

      if (diversified.length >= topK) {
        break;
      }
    }

    return diversified;
  }
}
