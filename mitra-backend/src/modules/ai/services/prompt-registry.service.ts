import {
  ConflictException, Injectable, Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPromptTemplate, AiPromptStatus } from '../entities/ai-prompt-template.entity';
import {
  PROMPT_SEED_DEFINITIONS, PROMPT_SEED_VARIABLES, SAFETY_PREAMBLE, buildSeedTemplateText,
} from './prompt-seed.data';

export interface PromptRegistryListFilter {
  category?: string;
  status?: AiPromptStatus;
  locale?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PromptUpsertInput {
  key: string;
  version?: string;
  locale?: string;
  category?: string;
  task?: string | null;
  description?: string | null;
  template: string;
  variables?: string[];
  metadata?: Record<string, unknown> | null;
}

/**
 * Sprint 2.8.2 Phase 2 — Prompt Registry.
 *
 * DB-backed, versioned, localized prompt catalogue with an approval
 * lifecycle (DRAFT → PUBLISHED → ARCHIVED). Seeded idempotently at
 * startup from prompt-seed.data; when the database is unreachable the
 * registry degrades to the same seed definitions held in memory so
 * advisory prompts keep working.
 */
@Injectable()
export class PromptRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PromptRegistryService.name);
  private readonly fallbackTemplates = new Map<string, AiPromptTemplate>();
  private dbAvailable = true;

  constructor(
    @InjectRepository(AiPromptTemplate)
    private readonly repo: Repository<AiPromptTemplate>,
  ) {
    for (const definition of PROMPT_SEED_DEFINITIONS) {
      this.fallbackTemplates.set(this.fallbackKey(definition.key, 'en'), {
        id: definition.key,
        key: definition.key,
        version: 'v1',
        locale: 'en',
        category: definition.domain,
        task: definition.task,
        description: definition.instruction,
        template: buildSeedTemplateText(definition),
        variables: [...PROMPT_SEED_VARIABLES],
        status: 'PUBLISHED',
        approvedBy: null,
        approvedAt: null,
        metadata: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        tenantId: null,
      } as AiPromptTemplate);
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      const rows = PROMPT_SEED_DEFINITIONS.map((definition) => this.repo.create({
        key: definition.key,
        version: 'v1',
        locale: 'en',
        category: definition.domain,
        task: definition.task,
        description: definition.instruction,
        template: buildSeedTemplateText(definition),
        variables: [...PROMPT_SEED_VARIABLES],
        status: 'PUBLISHED' as AiPromptStatus,
      }));
      await this.repo.createQueryBuilder()
        .insert()
        .values(rows as any[])
        .orIgnore()
        .execute();
      this.logger.log(`✓ Prompt registry seeded — ${rows.length} published templates verified`);
    } catch (err: any) {
      this.dbAvailable = false;
      this.logger.warn(`Prompt registry seeding failed (${err.message}); using in-memory seed definitions`);
    }
  }

  async list(filter: PromptRegistryListFilter = {}) {
    const page = Math.max(1, Number(filter.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(filter.limit ?? 20)));

    if (!this.dbAvailable) {
      const rows = [...this.fallbackTemplates.values()]
        .filter((template) => !filter.category || template.category === filter.category)
        .filter((template) => !filter.status || template.status === filter.status);
      return { data: rows.slice(0, limit), total: rows.length, page: 1, limit };
    }

    const qb = this.repo.createQueryBuilder('p')
      .where('p.deletedAt IS NULL');
    if (filter.category) qb.andWhere('p.category = :category', { category: filter.category });
    if (filter.status) qb.andWhere('p.status = :status', { status: filter.status });
    if (filter.locale) qb.andWhere('p.locale = :locale', { locale: filter.locale });
    if (filter.search) {
      qb.andWhere('(p.key ILIKE :search OR p.description ILIKE :search)', { search: `%${filter.search}%` });
    }
    qb.orderBy('p.key', 'ASC').addOrderBy('p.version', 'DESC')
      .skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<AiPromptTemplate> {
    const template = await this.repo.findOne({ where: { id, deletedAt: null } as any });
    if (!template) throw new NotFoundException(`Prompt template ${id} not found`);
    return template;
  }

  async resolve(key: string, locale = 'en'): Promise<AiPromptTemplate | null> {
    if (!this.dbAvailable) {
      return this.fallbackTemplates.get(this.fallbackKey(key, locale))
        ?? this.fallbackTemplates.get(this.fallbackKey(key, 'en'))
        ?? null;
    }

    const localized = await this.findPublished(key, locale);
    if (localized) return localized;
    if (locale !== 'en') return this.findPublished(key, 'en');
    return null;
  }

  async create(input: PromptUpsertInput, userId?: string): Promise<AiPromptTemplate> {
    this.validate(input);
    const existing = await this.repo.findOne({
      where: { key: input.key, version: input.version ?? 'v1', locale: input.locale ?? 'en', deletedAt: null } as any,
    });
    if (existing) {
      throw new ConflictException(`Prompt ${input.key} ${input.version ?? 'v1'} (${input.locale ?? 'en'}) already exists — create a new version instead`);
    }
    const entity = this.repo.create({
      key: input.key,
      version: input.version ?? 'v1',
      locale: input.locale ?? 'en',
      category: input.category ?? 'general',
      task: input.task ?? null,
      description: input.description ?? null,
      template: input.template,
      variables: input.variables ?? this.detectVariables(input.template),
      metadata: input.metadata ?? null,
      status: 'DRAFT',
      createdBy: userId ?? null,
    });
    return this.repo.save(entity);
  }

  async update(id: string, input: Partial<PromptUpsertInput>, userId?: string): Promise<AiPromptTemplate> {
    const template = await this.findById(id);
    if (template.status !== 'DRAFT') {
      throw new ConflictException(`Only DRAFT prompts can be edited (${template.key} is ${template.status})`);
    }
    const merged = {
      ...template,
      ...input,
      variables: input.variables ?? template.variables,
      updatedBy: userId ?? null,
    };
    this.validate(merged);
    return this.repo.save(merged);
  }

  async publish(id: string, userId?: string): Promise<AiPromptTemplate> {
    const template = await this.findById(id);
    if (template.status === 'PUBLISHED') {
      throw new ConflictException(`${template.key} ${template.version} is already published`);
    }
    if (template.status === 'ARCHIVED') {
      throw new ConflictException('Archived prompts cannot be published — create a new version');
    }

    await this.repo.createQueryBuilder()
      .update(AiPromptTemplate)
      .set({ status: 'ARCHIVED', updatedBy: userId ?? null })
      .where('key = :key AND locale = :locale AND status = :status AND id != :id', {
        key: template.key, locale: template.locale, status: 'PUBLISHED', id: template.id,
      })
      .execute();

    template.status = 'PUBLISHED';
    template.approvedBy = userId ?? null;
    template.approvedAt = new Date();
    template.updatedBy = userId ?? null;
    return this.repo.save(template);
  }

  async archive(id: string, userId?: string): Promise<AiPromptTemplate> {
    const template = await this.findById(id);
    template.status = 'ARCHIVED';
    template.updatedBy = userId ?? null;
    return this.repo.save(template);
  }

  async buildPrompt(key: string, variables: Record<string, any>, locale = 'en'): Promise<{
    promptTemplate: string; promptVersion: string; prompt: string; source: 'registry' | 'fallback';
  }> {
    const template = await this.resolve(key, locale);
    if (!template) {
      return {
        promptTemplate: 'default.fallback',
        promptVersion: 'v1',
        prompt: `${SAFETY_PREAMBLE}\n\nTask: General advisory summary\n\nUser request: ${this.safeString(variables.message)}\n\nContext: ${this.safeJson(variables.context)}`,
        source: 'fallback',
      };
    }

    const prompt = template.template.replace(/{{(\w+)}}/g, (_match, variable) => {
      const value = variables[variable];
      return typeof value === 'string' ? this.safeString(value) : this.safeJson(value ?? {});
    });

    return {
      promptTemplate: template.key,
      promptVersion: template.version,
      prompt,
      source: this.dbAvailable ? 'registry' : 'fallback',
    };
  }

  private async findPublished(key: string, locale: string): Promise<AiPromptTemplate | null> {
    return this.repo.createQueryBuilder('p')
      .where('p.key = :key AND p.locale = :locale AND p.status = :status AND p.deletedAt IS NULL', {
        key, locale, status: 'PUBLISHED',
      })
      .orderBy('p.version', 'DESC')
      .getOne();
  }

  private validate(input: { key: string; template: string; variables?: string[] }): void {
    if (!/^[a-z0-9]+(\.[a-z0-9_]+)+$/i.test(input.key)) {
      throw new ConflictException('Prompt key must be dot-separated, e.g. quality.ncr_explanation');
    }
    if (!input.template || input.template.trim().length < 10) {
      throw new ConflictException('Prompt template text is required (min 10 characters)');
    }
    const detected = this.detectVariables(input.template);
    const missing = (input.variables ?? []).filter((variable) => !detected.includes(variable));
    if (missing.length) {
      throw new ConflictException(`Declared variables not present in template: ${missing.join(', ')}`);
    }
  }

  private detectVariables(template: string): string[] {
    return [...new Set([...template.matchAll(/{{(\w+)}}/g)].map((match) => match[1]))];
  }

  private fallbackKey(key: string, locale: string): string {
    return `${key}::${locale}`;
  }

  private safeJson(value: unknown): string {
    return this.safeString(JSON.stringify(value ?? {}, null, 2));
  }

  private safeString(value: unknown): string {
    return String(value ?? '').replace(/(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+/gi, '$1: [redacted]');
  }
}
