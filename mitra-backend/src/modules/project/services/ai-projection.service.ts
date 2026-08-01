import { Injectable, Logger } from '@nestjs/common';
import { ProjectDomainEvent, ProjectDomainEventSubscriber } from '../events/project.events';

/**
 * AI-ready integration points for the Project Management Domain.
 *
 * Sprint 2.2 deliberately ships NO inference: these hooks define the
 * contracts (input/output shapes) that AI providers will implement in a
 * future sprint. Each capability returns a structured "not configured"
 * envelope so the UI can render disabled states and the integration
 * surface is already in place.
 *
 * Implementations plug in by registering an AiProjectionProvider via
 * `registerProvider()` — no controller or service changes needed.
 */

export interface RiskPredictionResult {
  predictedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predictedDelayDays: number | null;
  confidence: number | null;
  reasons: string[];
}

export interface ResourceRecommendationResult {
  recommendations: { skill: string; suggestedCount: number; rationale: string }[];
}

export interface SimilarProjectResult {
  similarProjects: { projectId: string; projectNumber: string; name: string; similarity: number }[];
}

export interface AiProjectionProvider {
  readonly name: string;
  predictRisk?(projectId: string, context: Record<string, any>): Promise<RiskPredictionResult>;
  predictDelay?(projectId: string, context: Record<string, any>): Promise<{ predictedDelayDays: number | null; confidence: number | null; reasons: string[] }>;
  recommendResources?(projectId: string, context: Record<string, any>): Promise<ResourceRecommendationResult>;
  findSimilarProjects?(projectId: string, context: Record<string, any>): Promise<SimilarProjectResult>;
  optimizeTimeline?(projectId: string, context: Record<string, any>): Promise<{ suggestions: string[] }>;
  summarizeMeetings?(projectId: string, context: Record<string, any>): Promise<{ summary: string }>;
}

const NOT_CONFIGURED = {
  available: false,
  provider: 'none',
  reason: 'AI projection provider is not configured yet (Sprint 2.2 integration point)',
};

@Injectable()
export class AiProjectionService implements ProjectDomainEventSubscriber {
  readonly name = 'AiProjectionService';
  private readonly logger = new Logger(AiProjectionService.name);
  private providers: AiProjectionProvider[] = [];

  /** Register an AI provider implementation (future sprint). */
  registerProvider(provider: AiProjectionProvider): void {
    this.providers.push(provider);
    this.logger.log(`AI projection provider registered: ${provider.name}`);
  }

  private provider(): AiProjectionProvider | null {
    return this.providers[this.providers.length - 1] ?? null;
  }

  async predictRisk(projectId: string, context: Record<string, any> = {}) {
    const p = this.provider();
    if (!p?.predictRisk) return NOT_CONFIGURED;
    return { available: true, provider: p.name, ...(await p.predictRisk(projectId, context)) };
  }

  async predictDelay(projectId: string, context: Record<string, any> = {}) {
    const p = this.provider();
    if (!p?.predictDelay) return NOT_CONFIGURED;
    return { available: true, provider: p.name, ...(await p.predictDelay(projectId, context)) };
  }

  async recommendResources(projectId: string, context: Record<string, any> = {}) {
    const p = this.provider();
    if (!p?.recommendResources) return NOT_CONFIGURED;
    return { available: true, provider: p.name, ...(await p.recommendResources(projectId, context)) };
  }

  async findSimilarProjects(projectId: string, context: Record<string, any> = {}) {
    const p = this.provider();
    if (!p?.findSimilarProjects) return NOT_CONFIGURED;
    return { available: true, provider: p.name, ...(await p.findSimilarProjects(projectId, context)) };
  }

  async optimizeTimeline(projectId: string, context: Record<string, any> = {}) {
    const p = this.provider();
    if (!p?.optimizeTimeline) return NOT_CONFIGURED;
    return { available: true, provider: p.name, ...(await p.optimizeTimeline(projectId, context)) };
  }

  async summarizeMeetings(projectId: string, context: Record<string, any> = {}) {
    const p = this.provider();
    if (!p?.summarizeMeetings) return NOT_CONFIGURED;
    return { available: true, provider: p.name, ...(await p.summarizeMeetings(projectId, context)) };
  }

  /** AI-event hook: optionally feed domain events to the provider. */
  async handle(_event: ProjectDomainEvent): Promise<void> {
    // No-op in Sprint 2.2 — providers may subscribe later.
  }
}
