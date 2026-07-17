import { Injectable, Logger } from '@nestjs/common';
import { OllamaProvider } from '../providers/ollama.provider';
import { AiContextService } from './ai-context.service';
import { AiUsageService } from '@modules/ai-usage/services/ai-usage.service';
import {
  AiChatDto, AiAnalysisDto, AiIntent,
  AiChatResponseDto, AiHealthResponseDto,
} from '../dto/ai.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are MITRA Copilot — an intelligent assistant embedded in MITRA, 
a precision mold manufacturing management platform used by industrial companies.

Your job:
- Answer questions about projects, trials, CAPAs, work orders, dispatches, and service requests.
- Base all answers strictly on the MITRA DATA provided below.
- If the data doesn't contain enough information, say so clearly — never invent facts.
- Keep responses concise, factual, and structured (use bullet points for lists).
- For numbers, always include units (days, hours, %, ₹ or $ as appropriate).
- If asked about delayed/overdue items, sort by severity.
- If asked for recommendations, cite the specific records you're basing them on.

Rules:
- Do not mention "JSON", "database", "query", or technical implementation details.
- Present data as if you are a knowledgeable operations manager reviewing real reports.
- Use present tense for current status, past tense for completed events.
- If a field is null or empty, say "not set" or "not available".`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly ollama:  OllamaProvider,
    private readonly context: AiContextService,
    private readonly aiUsage: AiUsageService,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  // ── Health ─────────────────────────────────────────────────────────────────
  async health(): Promise<AiHealthResponseDto> {
    if (!this.ollama.enabled) {
      return { enabled: false, available: false, model: this.ollama.model, reason: 'Set AI_ENABLED=true in .env' };
    }
    const ping = await this.ollama.ping();
    return {
      enabled:       true,
      available:     ping.available,
      model:         this.ollama.model,
      ollamaVersion: ping.version,
      reason:        ping.available ? undefined : `Cannot reach ${this.ollama.url}`,
    };
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  async chat(dto: AiChatDto, tenantId: string, userId?: string): Promise<AiChatResponseDto> {
    const t0 = Date.now();

    // 1. Detect intent
    const intent = dto.intent ?? this.detectIntent(dto.message);

    // 2. Fetch grounded DB context
    const { data, summary } = await this.context.buildContext(intent, tenantId);

    // 3. Build prompt
    const prompt = this.buildPrompt(dto.message, intent, data, dto.history);

    // 4. Call Ollama (or return stub if disabled)
    let answer: string;
    let modelUsed: string;

    if (!this.ollama.enabled) {
      // Return structured data as a fallback when AI is disabled
      answer = this.buildFallbackAnswer(intent, data, dto.message);
      modelUsed = 'data-only (AI disabled)';
    } else {
      const result = await this.ollama.generate(prompt);
      answer    = result.response;
      modelUsed = result.model;
    }

    const processingMs = Date.now() - t0;

    // Track usage
    this.trackAiUsage(userId ?? 'system', prompt, modelUsed, processingMs);

    return {
      answer,
      intent,
      context:      data,
      modelUsed,
      processingMs,
      aiEnabled:    this.ollama.enabled,
    };
  }

  // ── Entity analysis ────────────────────────────────────────────────────────
  async analyzeEntity(dto: AiAnalysisDto, tenantId: string, userId?: string): Promise<AiChatResponseDto> {
    const t0 = Date.now();

    // Fetch the specific entity
    const entity = await this.fetchEntity(dto.entityType, dto.entityId, tenantId);
    if (!entity) {
      return {
        answer:       `${dto.entityType} with ID ${dto.entityId} was not found.`,
        intent:       AiIntent.GENERAL,
        context:      {},
        modelUsed:    'none',
        processingMs: Date.now() - t0,
        aiEnabled:    this.ollama.enabled,
      };
    }

    const question = dto.question ?? `Analyze this ${dto.entityType} and provide actionable insights.`;
    const prompt   = `${SYSTEM_PROMPT}

MITRA DATA:
${JSON.stringify(entity, null, 2)}

USER QUESTION: ${question}

Answer:`;

    let answer:   string;
    let modelUsed: string;

    if (!this.ollama.enabled) {
      answer    = JSON.stringify(entity, null, 2);
      modelUsed = 'data-only (AI disabled)';
    } else {
      const result = await this.ollama.generate(prompt);
      answer    = result.response;
      modelUsed = result.model;
    }

    const processingMs = Date.now() - t0;

    // Track usage
    this.trackAiUsage(userId ?? 'system', prompt, modelUsed, processingMs);

    return {
      answer,
      intent:       AiIntent.GENERAL,
      context:      { entity },
      modelUsed,
      processingMs,
      aiEnabled:    this.ollama.enabled,
    };
  }

  // ── Intent detection ───────────────────────────────────────────────────────
  private detectIntent(message: string): AiIntent {
    const lower = message.toLowerCase();
    if (/trial|shot|mold temp|injection|cycle time|observation/.test(lower)) return AiIntent.TRIALS;
    if (/capa|corrective|preventive|non.?conform|defect|rework/.test(lower))  return AiIntent.CAPA;
    if (/work.?order|machining|operation|job.?card|manufacturing/.test(lower)) return AiIntent.MANUFACTURING;
    if (/dispatch|delivery|shipping|courier|track/.test(lower))               return AiIntent.DISPATCH;
    if (/service|repair|complaint|warranty|breakdown/.test(lower))            return AiIntent.SERVICE;
    if (/workflow|stage|transition|status/.test(lower))                       return AiIntent.WORKFLOW;
    if (/knowledge|article|document|procedure|standard/.test(lower))          return AiIntent.KNOWLEDGE;
    if (/project|delay|overdue|customer|milestone/.test(lower))               return AiIntent.PROJECTS;
    return AiIntent.GENERAL;
  }

  // ── Prompt builder ─────────────────────────────────────────────────────────
  private buildPrompt(
    message: string,
    intent:  AiIntent,
    data:    Record<string, any>,
    history?: { role: string; content: string }[],
  ): string {
    const dataSection = Object.entries(data)
      .map(([k, v]) => `## ${k.replace(/_/g, ' ').toUpperCase()}\n${JSON.stringify(v, null, 2)}`)
      .join('\n\n');

    const historySection = history && history.length > 0
      ? '\n\nCONVERSATION HISTORY:\n' + history.slice(-4) // last 4 turns only
          .map(h => `${h.role.toUpperCase()}: ${h.content}`)
          .join('\n')
      : '';

    return `${SYSTEM_PROMPT}

MITRA DATA (as of this moment):
${dataSection}
${historySection}

USER: ${message}

MITRA COPILOT:`;
  }

  // ── Fallback answer (no AI, just structured data) ─────────────────────────
  private buildFallbackAnswer(
    intent: AiIntent,
    data:   Record<string, any>,
    question: string,
  ): string {
    const firstKey   = Object.keys(data)[0];
    const records    = data[firstKey] ?? [];
    const count      = records.length;

    if (count === 0) {
      return `No ${firstKey?.replace(/_/g, ' ') ?? 'records'} found matching your query.`;
    }

    const lines = [
      `Found ${count} ${firstKey?.replace(/_/g, ' ')} record${count > 1 ? 's' : ''}:`,
      '',
      ...records.slice(0, 10).map((r: any, i: number) => {
        const key = r.project_number ?? r.capa_number ?? r.work_order_number ?? r.service_number ?? r.title ?? r.id;
        const status = r.status ?? r.currentStage ?? r.result ?? '';
        const flag   = r.is_overdue ? ' ⚠ OVERDUE' : '';
        return `${i + 1}. ${key}${status ? ` — ${status}` : ''}${flag}`;
      }),
      count > 10 ? `\n...and ${count - 10} more.` : '',
      '',
      '(Enable AI_ENABLED=true for natural-language analysis of this data.)',
    ];

    return lines.filter(l => l !== undefined).join('\n');
  }

  // ── Entity fetcher ─────────────────────────────────────────────────────────
  private async fetchEntity(type: string, id: string, tenantId: string): Promise<any> {
    const tableMap: Record<string, string> = {
      capa:    'capa_verifications',
      trial:   'trial_observations',
      project: 'projects',
      service: 'service_requests',
      workorder: 'work_orders',
    };
    const table = tableMap[type.toLowerCase()];
    if (!table) return null;
    try {
      const rows = await this.em.query(
        `SELECT * FROM ${table} WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [id, tenantId],
      );
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  // ── AI usage tracking ────────────────────────────────────────────────────────
  private trackAiUsage(userId: string, prompt: string, modelName: string, responseTimeMs: number): void {
    // Rough token estimate: ~4 chars per token
    const tokenEstimate = Math.ceil(prompt.length / 4);

    this.aiUsage.trackUsage({
      userId,
      prompt: prompt.substring(0, 2000), // cap stored prompt length
      modelName,
      responseTimeMs,
      tokenEstimate,
    }).catch((err) => {
      this.logger.warn(`Failed to track AI usage: ${err.message}`);
    });
  }
}
