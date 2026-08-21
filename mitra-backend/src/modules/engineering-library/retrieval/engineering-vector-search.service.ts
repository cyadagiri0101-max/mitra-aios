import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EmbeddingService } from '../../ai/services/embedding.service';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { EngineeringRetrievalFilters } from './dto/engineering-retrieval.dto';

export interface VectorCandidate {
  chunk: KnowledgeChunk;
  vectorScore: number;
}

@Injectable()
export class EngineeringVectorSearchService {
  private readonly logger = new Logger(EngineeringVectorSearchService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  /**
   * Search knowledge chunks using vector embeddings and cosine similarity.
   */
  async searchVector(
    tenantId: string,
    query: string,
    filters?: EngineeringRetrievalFilters,
    limit = 50,
  ): Promise<{ candidates: VectorCandidate[]; degraded: boolean; error?: string }> {
    if (!query || query.trim().length === 0) {
      return { candidates: [], degraded: false };
    }

    try {
      const queryVector = await this.embeddingService.generateEmbedding(query);
      if (!queryVector || queryVector.length === 0) {
        return { candidates: [], degraded: true, error: 'Vector embedding provider unavailable' };
      }

      // Check vector dimension
      if (queryVector.length !== 768) {
        this.logger.warn(`Query vector dimension is ${queryVector.length}, expected 768`);
      }

      const vectorString = `[${queryVector.join(',')}]`;
      const params: any[] = [vectorString, tenantId, limit * 2];

      let filterClause = '';
      if (filters?.projectNumber) {
        params.push(`%${filters.projectNumber}%`);
        filterClause += ` AND c.project_number ILIKE $${params.length}`;
      }
      if (filters?.entityType) {
        params.push(filters.entityType);
        filterClause += ` AND c.entity_type = $${params.length}`;
      }
      if (filters?.chunkType) {
        params.push(filters.chunkType);
        filterClause += ` AND c.chunk_type = $${params.length}`;
      }
      if (filters?.authorityStatus) {
        params.push(filters.authorityStatus);
        filterClause += ` AND c.authority_status = $${params.length}`;
      }
      if (filters?.machine) {
        params.push(`%${filters.machine}%`);
        filterClause += ` AND c.machine ILIKE $${params.length}`;
      }
      if (filters?.material) {
        params.push(`%${filters.material}%`);
        filterClause += ` AND c.material ILIKE $${params.length}`;
      }

      // Perform pgvector cosine distance search joined to knowledge_chunks
      const sql = `
        SELECT
          c.*,
          1 - (e.embedding::vector <=> $1::vector) AS similarity
        FROM knowledge_chunks c
        INNER JOIN knowledge_embeddings e ON e.entity_id = c.id
        WHERE c.tenant_id = $2
          AND c.deleted_at IS NULL
          AND e.embedding IS NOT NULL
          ${filterClause}
        ORDER BY e.embedding::vector <=> $1::vector
        LIMIT $3
      `;

      let rawRows: any[] = [];
      try {
        rawRows = await this.em.query(sql, params);
      } catch (dbErr: any) {
        this.logger.warn(`Direct pgvector query failed (${dbErr.message}), falling back to text trigram matching`);
        // Trigram fallback on knowledge_chunks
        const trigramSql = `
          SELECT c.*, similarity(c.chunk_text, $1) as similarity
          FROM knowledge_chunks c
          WHERE c.tenant_id = $2 AND c.deleted_at IS NULL
          ORDER BY similarity DESC LIMIT $3
        `;
        rawRows = await this.em.query(trigramSql, [query, tenantId, limit]);
      }

      const candidates: VectorCandidate[] = rawRows.map((r) => {
        const rawSim = Number(r.similarity) || 0;
        const normalizedSim = Math.max(0, Math.min(1.0, Math.round(rawSim * 1000) / 1000));
        const chunk = Object.assign(new KnowledgeChunk(), r);
        return {
          chunk,
          vectorScore: normalizedSim,
        };
      });

      return {
        candidates: candidates.slice(0, limit),
        degraded: false,
      };
    } catch (err: any) {
      this.logger.error(`Vector retrieval failed: ${err.message}`);
      return {
        candidates: [],
        degraded: true,
        error: err.message,
      };
    }
  }
}
