import { ForbiddenException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CopilotDomain } from '../dto/copilot.dto';

export interface InjectionCheckResult {
  flagged: boolean;
  reasons: string[];
}

export interface ConfidenceInput {
  referenceCount: number;
  modelGenerated: boolean;
  fallbackUsed: boolean;
  injectionFlagged: boolean;
}

const DOMAIN_ROLES: Record<CopilotDomain, string[]> = {
  [CopilotDomain.ENGINEERING]: ['ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'],
  [CopilotDomain.MANUFACTURING]: ['ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION', 'QUALITY'],
  [CopilotDomain.QUALITY]: ['ADMIN', 'MANAGEMENT', 'QUALITY', 'PRODUCTION', 'PLANNING'],
  [CopilotDomain.SERVICE]: ['ADMIN', 'MANAGEMENT', 'SALES'],
  [CopilotDomain.EXECUTIVE]: ['ADMIN', 'MANAGEMENT'],
  [CopilotDomain.COMMERCIAL]: ['ADMIN', 'MANAGEMENT', 'SALES'],
  [CopilotDomain.PROJECT]: ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'],
};

const INJECTION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i, reason: 'instruction-override' },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions|prompts|rules|training)/i, reason: 'instruction-override' },
  { pattern: /(reveal|show|print|repeat|output)\s+(your\s+)?(system\s+prompt|instructions|initial\s+prompt)/i, reason: 'prompt-extraction' },
  { pattern: /you\s+are\s+now\s+(a|an|in)\b/i, reason: 'role-hijack' },
  { pattern: /pretend\s+(you\s+are|to\s+be)\b/i, reason: 'role-hijack' },
  { pattern: /\b(jailbreak|DAN\s+mode|do\s+anything\s+now)\b/i, reason: 'jailbreak' },
  { pattern: /bypass\s+(safety|content|filter|restriction|guard)/i, reason: 'safety-bypass' },
  { pattern: /(new|updated)\s+(system\s+)?instructions?\s*:/i, reason: 'instruction-injection' },
  { pattern: /override\s+(safety|instructions|guardrails)/i, reason: 'safety-bypass' },
];

const SECRET_PATTERN = /(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+/gi;

/**
 * Sprint 2.8.2 Phase 6 — centralized AI security service.
 *
 * Consolidates the guards that were previously inline in the copilot
 * orchestrator and prompt templates: domain RBAC, prompt-injection
 * detection, secret redaction, citation validation, and deterministic
 * confidence scoring. Pure functions only — no I/O — so every stage of
 * the orchestrator pipeline can call it synchronously.
 */
@Injectable()
export class AiSecurityService {
  assertDomainAccess(domain: CopilotDomain, role: string): void {
    if (!DOMAIN_ROLES[domain]?.includes(role)) {
      throw new ForbiddenException(`Role ${role} cannot access ${domain} copilot context`);
    }
  }

  domainRoles(domain: CopilotDomain): string[] {
    return [...(DOMAIN_ROLES[domain] ?? [])];
  }

  sanitize(value: string): string {
    return String(value ?? '')
      .replace(SECRET_PATTERN, '$1: [redacted]')
      .slice(0, 6000);
  }

  detectInjection(text: string): InjectionCheckResult {
    const reasons = INJECTION_PATTERNS
      .filter(({ pattern }) => pattern.test(String(text ?? '')))
      .map(({ reason }) => reason);
    return { flagged: reasons.length > 0, reasons: [...new Set(reasons)] };
  }

  validateCitations(references: Array<Record<string, any>>): Array<Record<string, any>> {
    return (references ?? []).filter((reference) =>
      reference
      && reference.title
      && reference.entityType
      && reference.entityId
      && reference.entityId !== 'unknown');
  }

  calculateConfidence(input: ConfidenceInput): number {
    if (input.injectionFlagged) return 0.1;
    if (input.referenceCount === 0) return 0.35;
    if (input.modelGenerated) return input.fallbackUsed ? 0.75 : 0.86;
    return input.fallbackUsed ? 0.55 : 0.68;
  }

  hashInput(text: string): string {
    return createHash('sha256').update(String(text ?? '')).digest('hex');
  }
}
