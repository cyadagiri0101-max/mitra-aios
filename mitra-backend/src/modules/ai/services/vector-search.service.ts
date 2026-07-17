import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EmbeddingService } from './embedding.service';
import { EmbeddingEntityType } from '../entities/knowledge-embedding.entity';

export interface SearchResult {
  entityType:  EmbeddingEntityType;
  entityId:    string;
  contentText: string;
  similarity:  number;
  metadata:    Record<string, any> | null;
}

export interface TrialIntelligenceResult {
  currentIssue:       string;
  similarTrials:      SimilarTrial[];
  insights:           string[];
  recommendedActions: string[];
}

export interface SimilarTrial {
  trialId:       string;
  similarity:    number;
  trialDate:     string | null;
  result:        string | null;
  observations:  string;
  projectId:     string | null;
  projectNumber?: string | null;
  productName?:   string | null;
  actions:       string[];
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    private readonly embedding: EmbeddingService,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  // ── Semantic Knowledge Search ─────────────────────────────────────────────

  /**
   * Find the most semantically similar entities to a query string.
   * Falls back to pg_trgm trigram text search when pgvector is unavailable.
   */
  async search(
    query:    string,
    tenantId: string,
    types?:   EmbeddingEntityType[],
    topK = 5,
  ): Promise<SearchResult[]> {
    const queryVector = await this.embedding.generateEmbedding(query);
    if (queryVector) {
      return this.vectorSearch(queryVector, tenantId, types, topK);
    }
    return this.textSearch(query, tenantId, types, topK);
  }

  // ── Trial Intelligence ────────────────────────────────────────────────────

  /**
   * Given a described mold defect / trial issue, find similar historical
   * trial observations and synthesise actionable recommendations.
   */
  async trialIntelligence(
    issue:    string,
    tenantId: string,
  ): Promise<TrialIntelligenceResult> {
    const similar  = await this.search(issue, tenantId, [EmbeddingEntityType.TRIAL], 8);
    const trialIds = similar.map(s => s.entityId);

    let details: any[] = [];
    if (trialIds.length > 0) {
      try {
        details = await this.em
          .createQueryBuilder()
          .select([
            't.id                        AS "id"',
            't.trial_date::text          AS "trialDate"',
            't.result                    AS "result"',
            't.observations              AS "observations"',
            't.corrective_actions        AS "correctiveActions"',
            't.good_parts                AS "goodParts"',
            't.rejected_parts            AS "rejectedParts"',
            't.mold_temperature_c        AS "moldTemperatureC"',
            't.injection_pressure_bar    AS "injectionPressureBar"',
            't.cycle_time_seconds        AS "cycleTimeSeconds"',
            'p.project_number            AS "projectNumber"',
            'p.product_name              AS "productName"',
          ])
          .from('trial_observations', 't')
          .leftJoin('projects', 'p', 'p.id = t.project_id')
          .where('t.id IN (:...ids)', { ids: trialIds })
          .andWhere('t.tenant_id = :tenantId', { tenantId })
          .getRawMany();
      } catch (err: any) {
        this.logger.warn(`trialIntelligence query failed: ${err.message}`);
      }
    }

    const trials: SimilarTrial[] = details.map((d: any) => {
      const match = similar.find(s => s.entityId === d.id);
      return {
        trialId:       d.id,
        similarity:    match?.similarity ?? 0,
        trialDate:     d.trialDate,
        result:        d.result,
        observations:  d.observations ?? '',
        projectId:     d.project_id ?? null,
        projectNumber: d.projectNumber ?? null,
        productName:   d.productName ?? null,
        actions:       d.correctiveActions
          ? d.correctiveActions.split('\n').filter(Boolean)
          : [],
      };
    }).sort((a, b) => b.similarity - a.similarity);

    return {
      currentIssue:       issue,
      similarTrials:      trials,
      insights:           this.extractInsights(trials),
      recommendedActions: this.synthesiseActions(trials),
    };
  }

  // ── CAPA Intelligence ─────────────────────────────────────────────────────

  /**
   * Find similar historical CAPAs, surfacing root causes and proven fixes.
   * Table: capa_verifications
   */
  async capaIntelligence(
    issue:    string,
    tenantId: string,
  ): Promise<{ issue: string; similarCapas: any[]; topRootCauses: string[]; provenFixes: string[] }> {
    const similar = await this.search(issue, tenantId, [EmbeddingEntityType.CAPA], 6);
    const ids     = similar.map(s => s.entityId);

    let capas: any[] = [];
    if (ids.length > 0) {
      try {
        capas = await this.em
          .createQueryBuilder()
          .select([
            'c.id                    AS "id"',
            'c.capa_number           AS "capaNumber"',
            'c.problem_description   AS "title"',
            'c.root_cause            AS "rootCause"',
            'c.corrective_action     AS "correctiveAction"',
            'c.preventive_action     AS "preventiveAction"',
            'c.status                AS "status"',
          ])
          .from('capa_verifications', 'c')
          .where('c.id IN (:...ids)', { ids })
          .andWhere('c.tenant_id = :tenantId', { tenantId })
          .getRawMany();
      } catch (err: any) {
        this.logger.warn(`capaIntelligence query failed: ${err.message}`);
      }
    }

    return {
      issue,
      similarCapas:  capas,
      topRootCauses: this.topStrings(capas.map((c: any) => c.rootCause).filter(Boolean), 3),
      provenFixes:   this.topStrings(capas.map((c: any) => c.correctiveAction).filter(Boolean), 3),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async vectorSearch(
    vector:   number[],
    tenantId: string,
    types?:   EmbeddingEntityType[],
    topK = 5,
  ): Promise<SearchResult[]> {
    // pgvector requires the <=> operator which TypeORM's QueryBuilder doesn't support natively.
    // We use a parameterized query to avoid any injection risk — the vector string is
    // passed as a $N parameter and cast inside SQL (never interpolated into the query string).
    try {
      const params: any[] = [`[${vector.join(',')}]`, tenantId, topK];
      let typeClause = '';
      if (types && types.length > 0) {
        params.push(types);
        typeClause = `AND entity_type = ANY($${params.length}::text[])`;
      }

      const rows: any[] = await this.em.query(
        `SELECT
           entity_type, entity_id, content_text, metadata,
           1 - (embedding::vector <=> $1::vector) AS similarity
         FROM knowledge_embeddings
         WHERE tenant_id    = $2
           AND deleted_at   IS NULL
           AND embedding    IS NOT NULL
           ${typeClause}
         ORDER BY embedding::vector <=> $1::vector
         LIMIT $3`,
        params,
      );
      return this.mapSearchResults(rows);
    } catch (err: any) {
      this.logger.warn(`Vector search failed, falling back to text search: ${err.message}`);
      return this.textSearch('', tenantId, types, topK);
    }
  }

  private async textSearch(
    query:    string,
    tenantId: string,
    types?:   EmbeddingEntityType[],
    topK = 5,
  ): Promise<SearchResult[]> {
    try {
      const params: any[] = [query || ' ', tenantId, topK];
      let typeClause = '';
      if (types && types.length > 0) {
        params.push(types);
        typeClause = `AND entity_type = ANY($${params.length}::text[])`;
      }

      const rows: any[] = await this.em.query(
        `SELECT entity_type, entity_id, content_text, metadata,
                similarity(content_text, $1) AS similarity
         FROM knowledge_embeddings
         WHERE tenant_id   = $2
           AND deleted_at  IS NULL
           AND content_text % $1
           ${typeClause}
         ORDER BY similarity DESC
         LIMIT $3`,
        params,
      );
      return this.mapSearchResults(rows);
    } catch {
      return [];
    }
  }

  private mapSearchResults(rows: any[]): SearchResult[] {
    return rows.map(r => ({
      entityType:  r.entity_type as EmbeddingEntityType,
      entityId:    r.entity_id,
      contentText: r.content_text,
      similarity:  Math.round((r.similarity ?? 0) * 1000) / 1000,
      metadata:    r.metadata,
    }));
  }

  private extractInsights(trials: SimilarTrial[]): string[] {
    const insights: string[] = [];
    const failed = trials.filter(t => t.result?.includes('FAIL') || t.result?.includes('REJECT'));
    const passed = trials.filter(t => t.result?.includes('PASS') || t.result === 'OK');

    if (failed.length > 0)
      insights.push(`${failed.length} similar trial(s) previously resulted in rejection.`);
    if (passed.length > 0)
      insights.push(`${passed.length} similar issue(s) were resolved successfully.`);

    const obs = trials.map(t => t.observations).join(' ').toLowerCase();
    if (obs.includes('flash'))      insights.push('Flash defects common in similar trials — check clamping force.');
    if (obs.includes('sink mark'))  insights.push('Sink marks in similar trials — review packing pressure and cooling time.');
    if (obs.includes('weld line'))  insights.push('Weld lines present — consider gate position and melt temperature.');
    if (obs.includes('short shot')) insights.push('Short shots in similar trials — check injection speed and material drying.');

    return insights.length > 0 ? insights : ['No clear pattern from historical trials.'];
  }

  private synthesiseActions(trials: SimilarTrial[]): string[] {
    return this.topStrings(trials.flatMap(t => t.actions).filter(Boolean), 5);
  }

  private topStrings(strings: string[], n: number): string[] {
    const freq = new Map<string, number>();
    strings.forEach(s => {
      const key = s.trim().slice(0, 200);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    });
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([s]) => s);
  }
}
