import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { createHash } from 'crypto';
import { OllamaProvider } from '../providers/ollama.provider';
import { KnowledgeEmbedding, EmbeddingEntityType } from '../entities/knowledge-embedding.entity';

export interface EmbedInput {
  entityType: EmbeddingEntityType;
  entityId:   string;
  content:    string;
  tenantId:   string | null;
  metadata?:  Record<string, any>;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  /** Embedding model — Ollama must have this pulled */
  private readonly embedModel = 'nomic-embed-text';

  constructor(
    private readonly ollama: OllamaProvider,
    @InjectRepository(KnowledgeEmbedding)
    private readonly repo: Repository<KnowledgeEmbedding>,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Upsert an embedding for a single entity.
   * If the content hash is unchanged, skip re-embedding (idempotent).
   */
  async upsertEmbedding(input: EmbedInput): Promise<KnowledgeEmbedding> {
    const hash = this.sha256(input.content);

    const existing = await this.repo.findOne({
      where: { entityType: input.entityType, entityId: input.entityId, tenantId: input.tenantId ?? IsNull() },
    });

    if (existing && existing.contentHash === hash) {
      return existing; // Content unchanged — skip expensive re-embed
    }

    const vector = await this.generateEmbedding(input.content);

    const record = existing ?? this.repo.create();
    record.entityType   = input.entityType;
    record.entityId     = input.entityId;
    record.contentHash  = hash;
    record.contentText  = input.content.slice(0, 2000); // cap stored text
    record.modelName    = this.embedModel;
    record.tenantId     = input.tenantId;
    record.metadata     = input.metadata ?? null;

    // Store vector as pgvector literal string
    record.embedding = vector ? `[${vector.join(',')}]` : null;

    return this.repo.save(record);
  }

  /**
   * Batch-index all trials, CAPAs, projects, and knowledge articles
   * for a given tenant. Intended for nightly jobs or first-run indexing.
   */
  async indexTenantData(tenantId: string, em: any): Promise<{ indexed: number; skipped: number; errors: number }> {
    let indexed = 0, skipped = 0, errors = 0;

    // All queries are parameterized ($1 = tenantId) — tenantId is never
    // string-interpolated into SQL to prevent second-order injection.
    const tasks: { type: EmbeddingEntityType; sql: string }[] = [
      {
        type: EmbeddingEntityType.TRIAL,
        sql:  `SELECT id,
                 observations || ' ' || COALESCE(defects_observed::text,'') || ' result:' || result AS content,
                 json_build_object('trial_date', trial_date::text, 'result', result, 'project_id', project_id) AS meta
               FROM trial_observations
               WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.CAPA,
        sql:  `SELECT id,
                 problem_description || ' ' || COALESCE(root_cause,'') || ' ' ||
                 COALESCE(corrective_action,'') || ' ' || COALESCE(preventive_action,'') AS content,
                 json_build_object('capa_number', capa_number, 'status', status, 'capa_type', capa_type) AS meta
               FROM capa_verifications
               WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.PROJECT,
        sql:  `SELECT id,
                 project_number || ' ' || name || ' ' || COALESCE(product_name,'') || ' ' || COALESCE(description,'') AS content,
                 json_build_object('project_number', project_number, 'customer_name', customer_name, 'stage', stage) AS meta
               FROM projects
               WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.KNOWLEDGE,
        sql:  `SELECT id,
                 title || ' ' || COALESCE(summary,'') || ' ' || content AS content,
                 json_build_object('article_type', article_type, 'category_id', category_id) AS meta
               FROM knowledge_articles
               WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'PUBLISHED' LIMIT 500`,
      },
      // Commercial domain (Sprint 3, P1-2) — same full-sync semantics.
      {
        type: EmbeddingEntityType.CUSTOMER,
        sql:  `SELECT id,
                 name || ' ' || COALESCE(code,'') || ' ' || COALESCE(industry,'') AS content,
                 json_build_object('code', code, 'status', status, 'industry', industry) AS meta
               FROM customers
               WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.ENQUIRY,
        sql:  `SELECT id,
                 enquiry_number || ' ' || COALESCE(customer_name,'') || ' ' || COALESCE(product_name,'') AS content,
                 json_build_object('enquiry_number', enquiry_number, 'status', status, 'customer_name', customer_name) AS meta
               FROM enquiries
               WHERE tenant_id = $1 AND deleted_at IS NULL AND status <> 'DRAFT' LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.QUOTATION,
        sql:  `SELECT id,
                 quotation_number || ' ' || COALESCE(customer_name,'') AS content,
                 json_build_object('quotation_number', quotation_number, 'status', status, 'total_amount', total_amount) AS meta
               FROM quotations
               WHERE tenant_id = $1 AND deleted_at IS NULL AND status <> 'DRAFT' LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.SALES_ORDER,
        sql:  `SELECT id,
                 sales_order_number || ' ' || COALESCE(customer_name,'') AS content,
                 json_build_object('sales_order_number', sales_order_number, 'status', status, 'total_amount', total_amount) AS meta
               FROM sales_orders
               WHERE tenant_id = $1 AND deleted_at IS NULL AND status <> 'DRAFT' LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.INVOICE,
        sql:  `SELECT id,
                 invoice_number || ' ' || COALESCE(customer_name,'') AS content,
                 json_build_object('invoice_number', invoice_number, 'status', status, 'total_amount', total_amount) AS meta
               FROM invoices
               WHERE tenant_id = $1 AND deleted_at IS NULL AND status <> 'DRAFT' LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.PAYMENT,
        sql:  `SELECT id,
                 payment_number || ' ' || COALESCE(reference_number,'') AS content,
                 json_build_object('payment_number', payment_number, 'amount', amount, 'currency', currency, 'method', method) AS meta
               FROM payments
               WHERE tenant_id = $1 AND deleted_at IS NULL LIMIT 1000`,
      },
      {
        type: EmbeddingEntityType.CREDIT_NOTE,
        sql:  `SELECT id,
                 credit_note_number || ' ' || COALESCE(reason,'') AS content,
                 json_build_object('credit_note_number', credit_note_number, 'status', status, 'amount', amount) AS meta
               FROM credit_notes
               WHERE tenant_id = $1 AND deleted_at IS NULL AND status <> 'OPEN' LIMIT 1000`,
      },
    ];

    for (const task of tasks) {
      try {
        const rows: { id: string; content: string; meta: any }[] = await em.query(task.sql, [tenantId]);
        for (const row of rows) {
          try {
            const prev = await this.repo.findOne({
              where: { entityType: task.type, entityId: row.id, tenantId },
            });
            const hash = this.sha256(row.content);
            if (prev && prev.contentHash === hash) { skipped++; continue; }

            await this.upsertEmbedding({
              entityType: task.type,
              entityId:   row.id,
              content:    row.content,
              tenantId,
              metadata:   row.meta,
            });
            indexed++;
          } catch (err: unknown) {
            this.logger.warn(`Embedding error for ${task.type}/${row.id}: ${(err as Error)?.message ?? String(err)}`);
            errors++;
          }
        }
      } catch (err: unknown) {
        this.logger.error(`Batch error for ${task.type}: ${(err as Error)?.message ?? String(err)}`);
        errors++;
      }
    }

    return { indexed, skipped, errors };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * Call Ollama /api/embeddings.
   * Returns null when AI is disabled or Ollama is unreachable.
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.ollama.enabled) {
      // Return a deterministic pseudo-vector for testing without real Ollama
      return this.deterministicVector(text, 768);
    }
    try {
      const response = await this.ollama.embed(text, this.embedModel);
      return response;
    } catch (err: unknown) {
      this.logger.warn(`Embedding generation failed: ${(err as Error)?.message ?? String(err)}`);
      return null;
    }
  }

  /** SHA-256 hex of a string */
  private sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Deterministic pseudo-embedding for offline/test mode.
   * NOT suitable for production semantic search — purely for offline dev.
   */
  private deterministicVector(text: string, dims: number): number[] {
    const hash = this.sha256(text);
    const vec: number[] = [];
    for (let i = 0; i < dims; i++) {
      const byte = parseInt(hash[(i * 2) % 64] + hash[(i * 2 + 1) % 64], 16);
      vec.push((byte / 255) * 2 - 1);
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map(v => v / (mag || 1));
  }
}
