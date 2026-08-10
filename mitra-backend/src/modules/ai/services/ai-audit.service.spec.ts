import { AiAuditService } from './ai-audit.service';

const buildService = (failSave = false) => {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'audit-1', action: 'chat' }], 1]),
  };
  const repo = {
    create: jest.fn((data: any) => ({ id: 'audit-1', ...data })),
    save: jest.fn(async (entity: any) => {
      if (failSave) throw new Error('db down');
      return entity;
    }),
    createQueryBuilder: jest.fn(() => qb),
  };
  return { service: new AiAuditService(repo as any), repo, qb };
};

describe('AiAuditService', () => {
  it('records a complete audit entry with defaults', async () => {
    const { service, repo } = buildService();
    await service.record({
      tenantId: 'tenant-1', userId: 'user-1', userRole: 'QUALITY', action: 'chat',
      domain: 'quality', task: 'quality.ncr_explanation', provider: 'ollama', model: 'phi3',
      toolsExecuted: ['quality.ncrs'], citationCount: 2, confidence: 0.86,
      inputHash: 'abc', injectionFlagged: false, processingMs: 120,
    });
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      action: 'chat',
      status: 'SUCCESS',
      toolsExecuted: ['quality.ncrs'],
      error: null,
    }));
  });

  it('never throws when the audit write fails', async () => {
    const { service } = buildService(true);
    await expect(service.record({ action: 'chat' })).resolves.toBeUndefined();
  });

  it('lists audit entries scoped to the tenant with filters', async () => {
    const { service, qb } = buildService();
    const result = await service.list({ tenantId: 'tenant-1', action: 'chat', injectionOnly: true, page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.data[0].action).toBe('chat');
    expect(qb.where).toHaveBeenCalledWith('a.tenantId = :tenantId', { tenantId: 'tenant-1' });
  });
});
