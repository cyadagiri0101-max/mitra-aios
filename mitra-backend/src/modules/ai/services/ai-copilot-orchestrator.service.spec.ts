import { ForbiddenException } from '@nestjs/common';
import { AiCopilotOrchestratorService } from './ai-copilot-orchestrator.service';
import { PromptTemplateService } from './prompt-template.service';
import { CopilotDomain } from '../dto/copilot.dto';

describe('AiCopilotOrchestratorService', () => {
  const promptTemplates = new PromptTemplateService();
  const baseRequest = {
    domain: CopilotDomain.QUALITY,
    message: 'Summarize the NCR and include token: should-not-leak',
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'QUALITY',
    entityType: 'capa',
    entityId: 'entity-1',
  };

  const buildService = (overrides: Record<string, any> = {}) => {
    const ollama = overrides.ollama ?? { enabled: false, model: 'phi3', generate: jest.fn() };
    const domainCopilot = overrides.domainCopilot ?? {
      mapTask: jest.fn(() => 'quality.ncr_explanation'),
      buildDomainContext: jest.fn(async () => ({
        context: { catalog: { title: 'NCR 100', sourceDomain: 'quality', sourceRef: { ncrNumber: 'NCR-100' } } },
        search: { data: [{ title: 'NCR 100', entityType: 'capa', entityId: 'entity-1', sourceDomain: 'quality', similarity: 0.92 }] },
        graph: [{ relationshipType: 'RELATED_TO' }],
      })),
    };
    const memory = overrides.memory ?? {
      getScopedMemory: jest.fn(async () => ({ retentionDays: 14, selectedProject: null, currentConversationContext: [], referencedEntities: [], recentSearches: [] })),
      saveTurn: jest.fn(async (conversationId?: string) => conversationId ?? 'conversation-1'),
    };
    return { service: new AiCopilotOrchestratorService(ollama as any, promptTemplates, domainCopilot as any, memory as any), ollama, domainCopilot, memory };
  };

  it('returns advisory responses with citations and saves scoped turns', async () => {
    const { service, memory } = buildService();
    const result = await service.orchestrate(baseRequest);

    expect(result.references).toHaveLength(1);
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.answer).toContain('Advisory');
    expect(memory.saveTurn).toHaveBeenCalledTimes(2);
    expect(memory.saveTurn.mock.calls[0][3].content).toContain('token: [redacted]');
  });

  it('blocks roles outside the requested domain', async () => {
    const { service } = buildService();
    await expect(service.orchestrate({ ...baseRequest, domain: CopilotDomain.EXECUTIVE, userRole: 'QUALITY' })).rejects.toThrow(ForbiddenException);
  });

  it('uses source-aware fallback when no authorized references exist', async () => {
    const { service } = buildService({
      domainCopilot: {
        mapTask: jest.fn(() => 'quality.inspection_summary'),
        buildDomainContext: jest.fn(async () => ({ context: null, search: { data: [] }, graph: [] })),
      },
    });
    const result = await service.orchestrate({ ...baseRequest, entityType: undefined, entityId: undefined });
    expect(result.references).toHaveLength(0);
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.answer).toContain('could not find authorized source records');
  });
});
