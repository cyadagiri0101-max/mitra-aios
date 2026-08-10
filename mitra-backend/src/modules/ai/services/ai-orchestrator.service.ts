import { Injectable, Logger } from '@nestjs/common';
import { CopilotDomain } from '../dto/copilot.dto';
import { AiSecurityService } from './ai-security.service';
import { PromptRegistryService } from './prompt-registry.service';
import { ToolRegistryService } from './tool-registry.service';
import { ModelRouterService } from './model-router.service';
import { AiAuditService } from './ai-audit.service';
import { AiCopilotMemoryService } from './ai-copilot-memory.service';
import { AiDomainCopilotService } from './ai-domain-copilot.service';

export interface AiPlatformChatRequest {
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
  locale?: string;
  model?: string;
  tools?: string[];
  toolArgs?: Record<string, unknown>;
}

/**
 * Sprint 2.8.2 Phase 4 — platform AI orchestrator pipeline.
 *
 * Stages (in order):
 *   1. RBAC domain access            (AiSecurityService)
 *   2. Sanitize + injection detect   (AiSecurityService)
 *   3. Task mapping                  (AiDomainCopilotService — reused)
 *   4. Entity context                (KnowledgeContextBuilder — reused)
 *   5. Semantic search               (KnowledgeSearch — reused)
 *   6. Knowledge graph               (KnowledgeGraph — reused)
 *   7. Tool execution                (ToolRegistryService)
 *   8. Prompt rendering              (PromptRegistryService)
 *   9. Model routing + generation    (ModelRouterService)
 *  10. Response format + citations   (citation validation)
 *  11. Confidence calculation        (deterministic scoring)
 *  12. Audit logging                 (AiAuditService)
 *  13. Conversation save             (AiCopilotMemoryService — reused)
 *
 * The legacy AiCopilotOrchestratorService (2.8.1) remains untouched and
 * continues to serve /ai/copilot/* — this pipeline serves the new
 * platform endpoints.
 */
@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private readonly security: AiSecurityService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly modelRouter: ModelRouterService,
    private readonly audit: AiAuditService,
    private readonly memory: AiCopilotMemoryService,
    private readonly domainCopilot: AiDomainCopilotService,
  ) {}

  async chat(request: AiPlatformChatRequest) {
    const started = Date.now();

    // 1 — RBAC
    this.security.assertDomainAccess(request.domain, request.userRole);

    // 2 — sanitize + injection detection
    const safeMessage = this.security.sanitize(request.message);
    const injection = this.security.detectInjection(safeMessage);

    // 3 — task mapping
    const task = this.domainCopilot.mapTask(request.domain, safeMessage, request.task);

    // 4/5/6 — entity context, semantic search, knowledge graph (reused)
    const contextPayload = await this.domainCopilot.buildDomainContext(
      request.domain, request.entityType, request.entityId, request.tenantId, safeMessage,
    );
    const references = this.security.validateCitations(
      this.referencesFrom(contextPayload, request.entityType, request.entityId),
    );
    const memoryScope = await this.memory.getScopedMemory(request.tenantId, request.userId, request.conversationId);

    // 7 — tool execution (optional, permission-checked inside the registry)
    const toolsExecuted: Array<{ tool: string; domain: string; truncated: boolean; durationMs: number }> = [];
    const toolResults: Record<string, unknown> = {};
    for (const toolName of request.tools ?? []) {
      try {
        const executed = await this.toolRegistry.execute(toolName, request.toolArgs ?? {}, {
          tenantId: request.tenantId, userId: request.userId, userRole: request.userRole,
        });
        toolsExecuted.push({ tool: executed.tool, domain: executed.domain, truncated: executed.truncated, durationMs: executed.durationMs });
        toolResults[toolName] = executed.result;
      } catch (err: any) {
        this.logger.warn(`Tool ${toolName} failed: ${err.message}`);
        toolsExecuted.push({ tool: toolName, domain: 'unknown', truncated: false, durationMs: 0 });
        toolResults[toolName] = { error: err.message };
      }
    }

    // 8 — prompt rendering from the registry
    const { promptTemplate, promptVersion, prompt } = await this.promptRegistry.buildPrompt(task, {
      message: safeMessage,
      memory: memoryScope,
      context: {
        ...contextPayload.context,
        selectedProjectId: request.selectedProjectId ?? memoryScope.selectedProject,
        toolResults: Object.keys(toolResults).length ? toolResults : undefined,
      },
      searchResults: contextPayload.search?.data ?? [],
      graphContext: contextPayload.graph ?? [],
    }, request.locale ?? 'en');

    // 9 — generation (skipped entirely for injection-flagged requests)
    let answer: string;
    let provider = 'none';
    let modelUsed = 'none';
    let modelGenerated = false;
    let fallbackUsed = false;

    if (injection.flagged) {
      answer = 'This request appears to contain prompt-injection patterns and was not sent to a model. Please rephrase as a normal advisory question about your authorized MITRA data.';
    } else if (references.length) {
      const generated = await this.modelRouter.generate({ prompt, model: request.model, task });
      answer = this.security.sanitize(generated.response);
      provider = generated.provider;
      modelUsed = generated.model;
      modelGenerated = true;
      fallbackUsed = generated.fallbackUsed;
    } else {
      answer = `I could not find authorized source records for this ${request.domain} request. This answer is advisory: select a specific project or artifact, or index the relevant Engineering, Manufacturing, Quality, Service, Commercial, or Project records, then retry.`;
    }

    // 10/11 — confidence
    const confidence = this.security.calculateConfidence({
      referenceCount: references.length,
      modelGenerated,
      fallbackUsed,
      injectionFlagged: injection.flagged,
    });

    const processingMs = Date.now() - started;

    // 12 — audit
    await this.audit.record({
      tenantId: request.tenantId,
      userId: request.userId,
      userRole: request.userRole,
      action: 'chat',
      domain: request.domain,
      task,
      promptTemplate,
      promptVersion,
      provider,
      model: modelUsed,
      toolsExecuted: toolsExecuted.map((tool) => tool.tool),
      citationCount: references.length,
      confidence,
      inputHash: this.security.hashInput(safeMessage),
      injectionFlagged: injection.flagged,
      processingMs,
      status: 'SUCCESS',
    });

    // 13 — conversation save
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
      modelUsed: modelGenerated ? `${provider}:${modelUsed}` : null,
      processingMs,
      contextRefs,
    });

    return {
      answer,
      domain: request.domain,
      task,
      promptTemplate,
      promptVersion,
      provider,
      modelUsed,
      confidence,
      references,
      toolsExecuted,
      injectionFlagged: injection.flagged,
      injectionReasons: injection.reasons,
      fallbackUsed,
      contextSummary: references.length
        ? `${references.length} source reference(s), ${contextPayload.graph?.length ?? 0} graph edge(s), ${toolsExecuted.length} tool(s), scoped memory retained ${memoryScope.retentionDays} day(s)`
        : 'No authorized source references were found for this request.',
      conversationId,
      processingMs,
    };
  }

  async retrieveContext(request: {
    domain: CopilotDomain; tenantId: string; userRole: string;
    entityType: string; entityId: string; query?: string;
  }) {
    this.security.assertDomainAccess(request.domain, request.userRole);
    const context = await this.domainCopilot.buildDomainContext(
      request.domain, request.entityType, request.entityId, request.tenantId, request.query ?? request.entityType,
    );
    return {
      ...context,
      references: this.security.validateCitations(this.referencesFrom(context, request.entityType, request.entityId)),
    };
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
}
