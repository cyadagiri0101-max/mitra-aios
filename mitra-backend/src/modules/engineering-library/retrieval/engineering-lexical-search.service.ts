import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { EngineeringRetrievalFilters, EngineeringRetrievalResultDto } from './dto/engineering-retrieval.dto';

export interface LexicalCandidate {
  chunk: KnowledgeChunk;
  lexicalScore: number;
  matchedTokens: string[];
}

@Injectable()
export class EngineeringLexicalSearchService extends TenantAwareService<KnowledgeChunk> {
  private readonly logger = new Logger(EngineeringLexicalSearchService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    repo: Repository<KnowledgeChunk>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'KnowledgeChunk');
  }

  /**
   * Search knowledge_chunks using PostgreSQL lexical and full-text matching with field weights.
   */
  async searchLexical(
    tenantId: string,
    queryTokens: string[],
    filters?: EngineeringRetrievalFilters,
    limit = 50,
  ): Promise<LexicalCandidate[]> {
    const scopeTenant = this.requireTenant(tenantId);
    if (!queryTokens || queryTokens.length === 0) return [];

    const qb = this.repo.createQueryBuilder('c');
    qb.where('c.tenant_id = :tenantId', { tenantId: scopeTenant });

    // Apply explicit metadata filters if provided
    if (filters?.projectNumber) {
      qb.andWhere('c.project_number ILIKE :proj', { proj: `%${filters.projectNumber}%` });
    }
    if (filters?.entityType) {
      qb.andWhere('c.entity_type = :entType', { entType: filters.entityType });
    }
    if (filters?.chunkType) {
      qb.andWhere('c.chunk_type = :chkType', { chkType: filters.chunkType });
    }
    if (filters?.authorityStatus) {
      qb.andWhere('c.authority_status = :authStatus', { authStatus: filters.authorityStatus });
    }
    if (filters?.customer) {
      qb.andWhere('c.customer ILIKE :cust', { cust: `%${filters.customer}%` });
    }
    if (filters?.machine) {
      qb.andWhere('c.machine ILIKE :mach', { mach: `%${filters.machine}%` });
    }
    if (filters?.material) {
      qb.andWhere('c.material ILIKE :mat', { mat: `%${filters.material}%` });
    }

    // Match query tokens across chunk fields with weighting
    const tokenConditions: string[] = [];
    const parameters: Record<string, any> = {};

    queryTokens.forEach((token, idx) => {
      const pName = `tok_${idx}`;
      parameters[pName] = `%${token}%`;
      tokenConditions.push(
        `(c.chunk_text ILIKE :${pName} OR c.project_number ILIKE :${pName} OR c.customer ILIKE :${pName} OR c.machine ILIKE :${pName} OR c.material ILIKE :${pName})`,
      );
    });

    if (tokenConditions.length > 0) {
      qb.andWhere(`(${tokenConditions.join(' OR ')})`, parameters);
    }

    const chunks = await qb.take(limit * 2).getMany();

    // Calculate weighted lexical score
    const scoredCandidates: LexicalCandidate[] = [];
    for (const chunk of chunks) {
      let rawScore = 0;
      const matchedTokens: string[] = [];
      const lowerText = chunk.chunkText.toLowerCase();

      for (const token of queryTokens) {
        const lowerToken = token.toLowerCase();
        let tokenMatched = false;

        // Weight A (1.5 for project, 1.0 for machine/material, 0.8 for customer)
        if (chunk.projectNumber && chunk.projectNumber.toLowerCase().includes(lowerToken)) {
          rawScore += 1.5;
          tokenMatched = true;
        }
        if (chunk.material && chunk.material.toLowerCase().includes(lowerToken)) {
          rawScore += 1.0;
          tokenMatched = true;
        }
        if (chunk.machine && chunk.machine.toLowerCase().includes(lowerToken)) {
          rawScore += 1.0;
          tokenMatched = true;
        }
        if (chunk.customer && chunk.customer.toLowerCase().includes(lowerToken)) {
          rawScore += 0.8;
          tokenMatched = true;
        }

        // Weight B (0.6): Entity type / Chunk type
        if (chunk.entityType.toLowerCase().includes(lowerToken) || chunk.chunkType.toLowerCase().includes(lowerToken)) {
          rawScore += 0.6;
          tokenMatched = true;
        }

        // Weight C (0.4): Body text match
        if (lowerText.includes(lowerToken)) {
          rawScore += 0.4;
          tokenMatched = true;
        }

        if (tokenMatched) {
          matchedTokens.push(token);
        }
      }

      if (rawScore > 0) {
        // Normalize lexical score to [0, 1] relative to query length
        const maxPossible = Math.max(1, queryTokens.length * 1.5);
        const normalizedLexicalScore = Math.min(1.0, Math.round((rawScore / maxPossible) * 1000) / 1000);
        scoredCandidates.push({
          chunk,
          lexicalScore: normalizedLexicalScore,
          matchedTokens,
        });
      }
    }

    // Sort descending by lexical score
    return scoredCandidates.sort((a, b) => b.lexicalScore - a.lexicalScore).slice(0, limit);
  }
}
