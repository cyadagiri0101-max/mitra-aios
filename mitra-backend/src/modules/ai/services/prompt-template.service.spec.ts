import { PromptTemplateService } from './prompt-template.service';

describe('PromptTemplateService', () => {
  it('lists versioned domain templates', () => {
    const service = new PromptTemplateService();
    const quality = service.listTemplates('quality');
    expect(quality.length).toBeGreaterThanOrEqual(4);
    expect(quality.every((template) => template.version === 'v1')).toBe(true);
  });

  it('redacts sensitive prompt variables', () => {
    const service = new PromptTemplateService();
    const result = service.buildPrompt('engineering.explain_drawing', {
      message: 'explain drawing api_key=abc123',
      memory: {},
      context: {},
      searchResults: [],
      graphContext: [],
    });
    expect(result.promptTemplate).toBe('engineering.explain_drawing');
    expect(result.prompt).toContain('api_key: [redacted]');
    expect(result.prompt).toContain('advisory only');
  });
});
