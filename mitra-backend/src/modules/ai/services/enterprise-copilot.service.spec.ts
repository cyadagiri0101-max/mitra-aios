import { CopilotDomain } from '../dto/copilot.dto';
import { EnterpriseCopilotService } from './enterprise-copilot.service';
import { COPILOT_CATALOGUE } from '../copilots/copilot-capability.data';
import { PROMPT_SEED_DEFINITIONS } from './prompt-seed.data';

const buildService = (orchestratorOverrides: Record<string, any> = {}) => {
  const orchestrator = {
    chat: jest.fn(async (request: any) => ({
      answer: 'Capability answer',
      domain: request.domain,
      task: request.task,
      promptTemplate: request.task,
      promptVersion: 'v1',
      provider: 'ollama',
      modelUsed: 'phi3',
      confidence: 0.86,
      references: [],
      toolsExecuted: [],
      injectionFlagged: false,
      injectionReasons: [],
      fallbackUsed: false,
      contextSummary: '1 source reference(s)',
      conversationId: 'conversation-1',
      processingMs: 25,
      ...orchestratorOverrides,
    })),
  };
  const service = new EnterpriseCopilotService(orchestrator as any);
  return { service, orchestrator };
};

const baseRequest = {
  domain: CopilotDomain.ENGINEERING,
  message: 'Explain drawing 1001',
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'DESIGN',
};

describe('EnterpriseCopilotService (Sprint 2.8.3)', () => {
  it('lists the seven copilots with capability counts', () => {
    const { service } = buildService();
    const copilots = service.listCopilots();
    expect(copilots).toHaveLength(7);
    expect(copilots.map((item) => item.domain).sort()).toEqual([
      'commercial', 'engineering', 'executive', 'manufacturing', 'project', 'quality', 'service',
    ]);
    for (const copilot of copilots) {
      expect(copilot.capabilityCount).toBeGreaterThanOrEqual(5);
    }
  });

  it('exposes capabilities without intent patterns for a domain', () => {
    const { service } = buildService();
    const capabilities = service.listCapabilities(CopilotDomain.QUALITY);
    expect(capabilities.length).toBeGreaterThan(0);
    expect(capabilities[0]).toEqual(expect.objectContaining({
      key: expect.stringContaining('quality.'),
      title: expect.any(String),
      promptKey: expect.stringContaining('quality.'),
      tools: expect.any(Array),
      suggestedActions: expect.any(Array),
      followUpQuestions: expect.any(Array),
    }));
  });

  it('returns starter suggestions per domain', () => {
    const { service } = buildService();
    const suggestions = service.suggestions(CopilotDomain.MANUFACTURING);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toEqual(expect.any(String));
  });

  it('resolves explicit capability keys and falls back to intent detection', () => {
    const { service } = buildService();
    const explicit = service.resolveCapability(CopilotDomain.ENGINEERING, 'hello world', 'engineering.bom.cost_analysis');
    expect(explicit.key).toBe('engineering.bom.cost_analysis');

    const detected = service.resolveCapability(CopilotDomain.QUALITY, 'What is the NCR disposition?');
    expect(detected.key).toBe('quality.ncrs.explain');

    const fallback = service.resolveCapability(CopilotDomain.PROJECT, 'unmatched text here');
    expect(fallback.key).toBe('project.health.assessment');
  });

  it('routes chat through the platform pipeline with capability task and auto tools', async () => {
    const { service, orchestrator } = buildService();
    const result = await service.chat(baseRequest);

    expect(orchestrator.chat).toHaveBeenCalledWith(expect.objectContaining({
      task: 'engineering.explain_drawing',
      tools: expect.arrayContaining(['engineering.drawings']),
    }));
    expect(result.capability).toEqual(expect.objectContaining({
      key: 'engineering.drawings.explain',
      promptKey: 'engineering.explain_drawing',
    }));
    expect(result.suggestedActions.length).toBeGreaterThan(0);
    expect(result.followUpQuestions.length).toBeGreaterThan(0);
  });

  it('merges user-requested tools with capability tools without duplicates', async () => {
    const { service, orchestrator } = buildService();
    await service.chat({ ...baseRequest, tools: ['engineering.drawings', 'knowledge.search'] });
    const tools = orchestrator.chat.mock.calls[0][0].tools as string[];
    expect(tools.filter((tool) => tool === 'engineering.drawings')).toHaveLength(1);
    expect(tools).toContain('knowledge.search');
  });

  it('honours a requested capability key in chat', async () => {
    const { service, orchestrator } = buildService();
    await service.chat({ ...baseRequest, capability: 'engineering.bom.gap_analysis' });
    expect(orchestrator.chat).toHaveBeenCalledWith(expect.objectContaining({ task: 'engineering.bom_gap_analysis' }));
  });

  describe('catalogue integrity', () => {
    it('every capability prompt key resolves in the prompt registry seeds', () => {
      const seedKeys = PROMPT_SEED_DEFINITIONS.map((definition) => definition.key);
      for (const copilot of COPILOT_CATALOGUE) {
        for (const capability of copilot.capabilities) {
          expect(seedKeys).toContain(capability.promptKey);
        }
      }
    });

    it('every auto-attached tool name is defined in the tool registry surface', () => {
      const definedTools = [
        'engineering.drawings', 'engineering.boms', 'engineering.routings', 'engineering.documents',
        'planning.process_plans', 'quality.ncrs', 'quality.capas', 'manufacturing.work_orders',
        'service.service_requests', 'commercial.rfqs', 'commercial.quotations', 'project.projects',
        'analytics.bi_query', 'knowledge.search',
      ];
      for (const copilot of COPILOT_CATALOGUE) {
        for (const capability of copilot.capabilities) {
          for (const tool of capability.tools) {
            expect(definedTools).toContain(tool);
          }
        }
      }
    });

    it('capability keys are unique across the catalogue and map to their domain', () => {
      const seen = new Set<string>();
      for (const copilot of COPILOT_CATALOGUE) {
        expect(copilot.capabilities.length).toBeGreaterThan(0);
        for (const capability of copilot.capabilities) {
          expect(capability.key.startsWith(`${copilot.domain}.`)).toBe(true);
          expect(seen.has(capability.key)).toBe(false);
          seen.add(capability.key);
        }
      }
    });

    it('capabilities carry UX metadata (suggested actions, follow-ups)', () => {
      for (const copilot of COPILOT_CATALOGUE) {
        for (const capability of copilot.capabilities) {
          expect(capability.suggestedActions.length).toBeGreaterThan(0);
          expect(capability.followUpQuestions.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
