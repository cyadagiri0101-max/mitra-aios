import { describe, it, expect } from 'vitest';
import { portfolioQueryKeys } from './usePortfolioData';

describe('M12.5 Sprint 2: portfolioQueryKeys Resolution', () => {
  it('resolves root portfolio query key', () => {
    expect(portfolioQueryKeys.all).toEqual(['portfolio']);
  });

  it('resolves snapshot query key', () => {
    expect(portfolioQueryKeys.snapshot()).toEqual(['portfolio', 'snapshot']);
  });

  it('resolves demand query key with params', () => {
    const params = { timeframeDays: 30 };
    expect(portfolioQueryKeys.demand(params)).toEqual(['portfolio', 'demand', { timeframeDays: 30 }]);
  });

  it('resolves demand query key without params', () => {
    expect(portfolioQueryKeys.demand()).toEqual(['portfolio', 'demand', {}]);
  });

  it('resolves capacity query key with params', () => {
    const params = { engineerRole: 'TOOL_DESIGNER' };
    expect(portfolioQueryKeys.capacity(params)).toEqual(['portfolio', 'capacity', { engineerRole: 'TOOL_DESIGNER' }]);
  });

  it('resolves bottlenecks query key', () => {
    expect(portfolioQueryKeys.bottlenecks()).toEqual(['portfolio', 'bottlenecks']);
  });

  it('resolves recommendations query key', () => {
    expect(portfolioQueryKeys.recommendations()).toEqual(['portfolio', 'recommendations', {}]);
  });

  it('resolves allocations query key with filter params', () => {
    expect(portfolioQueryKeys.allocations({ projectId: 'BM289' })).toEqual([
      'portfolio',
      'allocations',
      { projectId: 'BM289' },
    ]);
  });
});
