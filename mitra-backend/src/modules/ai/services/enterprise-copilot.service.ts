import { Injectable, Logger } from '@nestjs/common';
import { CopilotDomain } from '../dto/copilot.dto';
import { AiOrchestratorService, AiPlatformChatRequest } from '../services/ai-orchestrator.service';
import {
  COPILOT_CATALOGUE, CopilotCapability, detectCapability, findCapability, findCopilot,
} from '../copilots/copilot-capability.data';

export interface EnterpriseCopilotChatRequest extends AiPlatformChatRequest {
  capability?: string;
}

/**
 * Sprint 2.8.3 — Enterprise Copilot layer.
 *
 * Sits in front of the Sprint 2.8.2 platform pipeline. Every request:
 *   1. Resolves the capability from the catalogue (explicit key first,
 *      then intent detection, then the domain default).
 *   2. Maps capability → prompt registry key (task) + auto-attached tools.
 *   3. Delegates to AiOrchestratorService.chat (RBAC, context, search,
 *      graph, tools, prompt, router, confidence, audit, memory).
 *   4. Enriches the response with capability metadata, suggested user
 *      actions, and follow-up questions for the UX.
 *
 * The catalogue (copilot-capability.data.ts) is the single source of
 * truth; no capability prompt or tool set lives in this service.
 */
@Injectable()
export class EnterpriseCopilotService {
  private readonly logger = new Logger(EnterpriseCopilotService.name);

  constructor(private readonly orchestrator: AiOrchestratorService) {}

  listCopilots() {
    return COPILOT_CATALOGUE.map((copilot) => ({
      domain: copilot.domain,
      label: copilot.label,
      description: copilot.description,
      capabilityCount: copilot.capabilities.length,
    }));
  }

  listCapabilities(domain: CopilotDomain) {
    const copilot = findCopilot(domain);
    if (!copilot) return [];
    return copilot.capabilities.map(({ key, title, description, promptKey, tools, suggestedActions, followUpQuestions }) => ({
      key, title, description, promptKey, tools, suggestedActions, followUpQuestions,
    }));
  }

  suggestions(domain: CopilotDomain): string[] {
    const copilot = findCopilot(domain);
    if (!copilot) return [];
    return copilot.capabilities.map((capability) => capability.title);
  }

  resolveCapability(domain: CopilotDomain, message: string, requestedKey?: string): CopilotCapability {
    if (requestedKey) {
      const explicit = findCapability(domain, requestedKey);
      if (explicit) return explicit;
      this.logger.warn(`Requested capability '${requestedKey}' not found for domain '${domain}'; using intent detection`);
    }
    const detected = detectCapability(domain, message);
    if (detected) return detected;
    const copilot = findCopilot(domain);
    return copilot!.capabilities[0];
  }

  async chat(request: EnterpriseCopilotChatRequest) {
    const capability = this.resolveCapability(request.domain, request.message, request.capability);

    const tools = [...new Set([...capability.tools, ...(request.tools ?? [])])].slice(0, 8);

    const result = await this.orchestrator.chat({
      ...request,
      task: capability.promptKey,
      tools,
    });

    return {
      ...result,
      capability: {
        key: capability.key,
        title: capability.title,
        description: capability.description,
        promptKey: capability.promptKey,
      },
      suggestedActions: capability.suggestedActions,
      followUpQuestions: capability.followUpQuestions,
    };
  }
}
