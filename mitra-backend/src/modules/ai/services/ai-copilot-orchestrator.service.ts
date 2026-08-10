import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { OllamaProvider } from '../providers/ollama.provider';
import { PromptTemplateService } from './prompt-template.service';
import { AiDomainCopilotService } from './ai-domain-copilot.service';
import { AiCopilotMemoryService } from './ai-copilot-memory.service';
import { CopilotDomain } from '../dto/copilot.dto';

const DOMAIN_ROLES: Record<CopilotDomain, string[]> = {
  [CopilotDomain.ENGINEERING]: ['ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'],
  [CopilotDomain.MANUFACTURING]: ['ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION', 'QUALITY'],
  [CopilotDomain.QUALITY]: ['ADMIN', 'MANAGEMENT', 'QUALITY', 'PRODUCTION', 'PLANNING'],
  [CopilotDomain.SERVICE]: ['ADMIN', 'MANAGEMENT', 'SALES'],
  [CopilotDomain.EXECUTIVE]: ['ADMIN', 'MANAGEMENT'],
  [CopilotDomain.COMMERCIAL]: ['ADMIN', 'MANAGEMENT', 'SALES'],
  [CopilotDomain.PROJECT]: ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'],
};

@Injectable()
export class AiCopilotOrchestratorService {
  private readonly logger = new Logger(AiCopilotOrchestratorService.name);

  constructor(
    private readonly ollama: OllamaProvider,
    private readonly promptTemplates: PromptTemplateService,
    private readonly domainCopilot: AiDomainCopilotService,
    private readonly memory: AiCopilotMemoryService,
  ) {}

  async orchestrate(request: {
    domain: CopilotDomain;
    message: string;
    tenantId: string;
    userId: string;
    userRole: string;
    task?: string;
    entityType?: string;
    entityId?: string;
    selectedProjectId?: string;
    conversationId?: string;
  }) {
    this.assertDomainAccess(request.domain, request.userRole);
    const started = Date.now();
    const safeMessage = this.sanitize(request.message);
    const task = this.domainCopilot.mapTask(request.domain, safeMessage, request.task);
    const memoryScope = await this.memory.getScopedMemory(request.tenantId, request.userId, request.conversationId);
    const contextPayload = await this.domainCopilot.buildDomainContext(request.domain, request.entityType, request.entityId, request.tenantId, safeMessage);
    const references = this.referencesFrom(contextPayload, request.entityType, request.entityId);

    const { promptTemplate, promptVersion, prompt } = this.promptTemplates.buildPrompt(task, {
      message: safeMessage,
      memory: memoryScope,
      context: { ...contextPayload.context, selectedProjectId: request.selectedProjectId ?? memoryScope.selectedProject },
      searchResults: contextPayload.search?.data ?? [],
      graphContext: contextPayload.graph ?? [],
    });

    let answer = this.sourceAwareFallback(request.domain, references);
    let confidence = references.length ? 0.68 : 0.35;
    let modelUsed = this.ollama.model;

    if (this.ollama.enabled && references.length) {
      try {
        const result = await this.ollama.generate(prompt);
        answer = this.sanitize(result.response || answer);
        modelUsed = result.model ?? this.ollama.model;
        confidence = 0.86;
      } catch (err: any) {
        this.logger.warn(`Orchestrated generation failed: ${err.message}`);
      }
    }

    const contextRefs = Object.fromEntries(references.map((ref) => [`${ref.entityType}:${ref.entityId}`, ref]));
    const conversationId = await this.memory.saveTurn(request.conversationId, request.tenantId, request.userId, {
      role: 'user',
      content: safeMessage,
      intent: request.selectedProjectId ? `project:${request.selectedProjectId}` : task,
      contextRefs,
    });
    await this.memory.saveTurn(conversationId, request.tenantId, request.userId, {
      role: 'assistant',
      content: answer,
      intent: task,
      modelUsed,
      processingMs: Date.now() - started,
      contextRefs,
    });

    return {
      answer,
      domain: request.domain,
      promptTemplate,
      promptVersion,
      confidence,
      references,
      contextSummary: references.length
        ? `${references.length} source reference(s), ${contextPayload.graph?.length ?? 0} graph edge(s), scoped memory retained ${memoryScope.retentionDays} day(s)`
        : 'No authorized source references were found for this request.',
      conversationId,
      modelUsed,
      processingMs: Date.now() - started,
    };
  }

  async retrieveContext(request: { domain: CopilotDomain; tenantId: string; userRole: string; entityType: string; entityId: string; query?: string }) {
    this.assertDomainAccess(request.domain, request.userRole);
    const context = await this.domainCopilot.buildDomainContext(request.domain, request.entityType, request.entityId, request.tenantId, request.query ?? request.entityType);
    return {
      ...context,
      references: this.referencesFrom(context, request.entityType, request.entityId),
    };
  }

  private assertDomainAccess(domain: CopilotDomain, role: string) {
    if (!DOMAIN_ROLES[domain]?.includes(role)) {
      throw new ForbiddenException(`Role ${role} cannot access ${domain} copilot context`);
    }
  }

  private referencesFrom(contextPayload: any, entityType?: string, entityId?: string) {
    const searchRows = contextPayload.search?.data ?? [];
    const catalog = contextPayload.context?.catalog;
    const refs = [
      ...(catalog ? [{ title: catalog.title, entityType: entityType ?? 'catalog', entityId: entityId ?? 'unknown', sourceDomain: catalog.sourceDomain, similarity: 1 }] : []),
      ...searchRows.map((item: any) => ({
        title: item.title ?? item.contentText?.slice(0, 80) ?? 'Knowledge reference',
        entityType: item.entityType ?? entityType ?? 'knowledge',
        entityId: item.entityId ?? entityId ?? 'unknown',
        sourceDomain: item.sourceDomain ?? item.entityType ?? 'knowledge',
        similarity: Number(item.similarity ?? 0),
      })),
    ];
    return refs.filter((ref, index, arr) => ref.entityId !== 'unknown' && arr.findIndex((candidate) => `${candidate.entityType}:${candidate.entityId}` === `${ref.entityType}:${ref.entityId}`) === index).slice(0, 8);
  }

  private sourceAwareFallback(domain: CopilotDomain, references: Array<{ title: string }>) {
    if (!references.length) {
      return `I could not find authorized source records for this ${domain} request. This answer is advisory: select a specific project or artifact, or index the relevant Engineering, Manufacturing, Quality, Service, Commercial, or Project records, then retry.`;
    }
    return `Advisory ${domain} summary prepared from ${references.length} source reference(s). Review the citations before taking action.`;
  }

  private sanitize(value: string) {
    return String(value ?? '')
      .replace(/(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+/gi, '$1: [redacted]')
      .slice(0, 6000);
  }
}
