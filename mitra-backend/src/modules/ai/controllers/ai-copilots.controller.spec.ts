import { AiCopilotsController } from './ai-copilots.controller';
import { CopilotDomain } from '../dto/copilot.dto';
import { EnterpriseCopilotService } from '../services/enterprise-copilot.service';

describe('AiCopilotsController (Sprint 2.8.3)', () => {
  const buildController = () => {
    const copilots = {
      listCopilots: jest.fn(() => [{ domain: 'engineering', label: 'Engineering Copilot', capabilityCount: 15 }]),
      listCapabilities: jest.fn(() => [{ key: 'engineering.drawings.explain', title: 'Explain a drawing' }]),
      suggestions: jest.fn(() => ['Explain a drawing']),
      chat: jest.fn(async () => ({ answer: 'ok', capability: { key: 'x' }, suggestedActions: [], followUpQuestions: [] })),
    };
    const controller = new AiCopilotsController(copilots as any);
    return { controller, copilots };
  };

  const user = { id: 'user-1', role: 'DESIGN', tenantId: 'tenant-1' } as any;

  it('lists copilots', () => {
    const { controller, copilots } = buildController();
    const result = controller.listCopilots();
    expect(result.data).toHaveLength(1);
    expect(copilots.listCopilots).toHaveBeenCalled();
  });

  it('lists capabilities for a domain', () => {
    const { controller, copilots } = buildController();
    const result = controller.listCapabilities(CopilotDomain.ENGINEERING);
    expect(result.data[0].key).toBe('engineering.drawings.explain');
    expect(copilots.listCapabilities).toHaveBeenCalledWith(CopilotDomain.ENGINEERING);
  });

  it('returns suggestions for a domain', () => {
    const { controller, copilots } = buildController();
    const result = controller.suggestions(CopilotDomain.MANUFACTURING);
    expect(result.suggestions).toContain('Explain a drawing');
    expect(copilots.suggestions).toHaveBeenCalledWith(CopilotDomain.MANUFACTURING);
  });

  it('delegates chat with user identity and domain from the route', async () => {
    const { controller, copilots } = buildController();
    const dto = {
      message: 'Explain drawing 1001',
      domain: CopilotDomain.ENGINEERING,
      capability: 'engineering.drawings.explain',
      entityType: 'drawing',
      entityId: 'drawing-1',
    } as any;
    await controller.chat(CopilotDomain.ENGINEERING, dto, user);
    expect(copilots.chat).toHaveBeenCalledWith(expect.objectContaining({
      domain: CopilotDomain.ENGINEERING,
      message: 'Explain drawing 1001',
      capability: 'engineering.drawings.explain',
      entityType: 'drawing',
      entityId: 'drawing-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      userRole: 'DESIGN',
    }));
  });

  it('uses the default tenant when absent', async () => {
    const { controller, copilots } = buildController();
    await controller.chat(CopilotDomain.QUALITY, { message: 'NCR?' } as any, { id: 'u', role: 'QUALITY' } as any);
    expect(copilots.chat).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'default' }));
  });
});
