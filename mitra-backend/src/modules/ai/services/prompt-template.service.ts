import { Injectable } from '@nestjs/common';
import {
  PROMPT_SEED_DEFINITIONS, SAFETY_PREAMBLE, buildSeedTemplateText,
} from './prompt-seed.data';

export interface PromptTemplateDefinition {
  id: string;
  version: string;
  domain: string;
  task: string;
  template: string;
}

/**
 * Legacy in-code prompt catalogue (2.8.1 surface, kept for backward
 * compatibility of /ai/copilot/* endpoints). Sprint 2.8.2: template text
 * now comes from the shared prompt-seed.data module so the DB-backed
 * PromptRegistryService and this service can never drift apart.
 * Constructor and public API are unchanged.
 */
@Injectable()
export class PromptTemplateService {
  private readonly promptTemplates: Record<string, PromptTemplateDefinition> =
    Object.fromEntries(
      PROMPT_SEED_DEFINITIONS.map((definition) => [
        definition.key,
        {
          id: definition.key,
          version: 'v1',
          domain: definition.domain,
          task: definition.task,
          template: buildSeedTemplateText(definition),
        },
      ]),
    );

  getTemplate(task: string): PromptTemplateDefinition | null {
    return this.promptTemplates[task] ?? null;
  }

  listTemplates(domain?: string): PromptTemplateDefinition[] {
    return Object.values(this.promptTemplates).filter((template) => !domain || template.domain === domain);
  }

  buildPrompt(task: string, variables: Record<string, any>): { promptTemplate: string; promptVersion: string; prompt: string } {
    const template = this.getTemplate(task);
    if (!template) {
      return {
        promptTemplate: 'default.fallback',
        promptVersion: 'v1',
        prompt: `${SAFETY_PREAMBLE}\n\nTask: General advisory summary\n\nUser request: ${this.safeString(variables.message)}\n\nContext: ${this.safeJson(variables.context)}`,
      };
    }

    const prompt = template.template.replace(/{{(\w+)}}/g, (_match, key) => {
      const value = variables[key];
      return typeof value === 'string' ? this.safeString(value) : this.safeJson(value ?? {});
    });

    return {
      promptTemplate: template.id,
      promptVersion: template.version,
      prompt,
    };
  }

  private safeJson(value: unknown): string {
    return this.safeString(JSON.stringify(value ?? {}, null, 2));
  }

  private safeString(value: unknown): string {
    return String(value ?? '').replace(/(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+/gi, '$1: [redacted]');
  }
}
