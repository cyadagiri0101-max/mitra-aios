import { KnowledgeReindexSchedulerService } from './knowledge-reindex-scheduler.service';

describe('KnowledgeReindexSchedulerService', () => {
  let embedding: { indexTenantData: jest.Mock };
  let tenantRepo: { find: jest.Mock };
  let dataSource: object;
  let config: { get: jest.Mock };
  let scheduler: KnowledgeReindexSchedulerService;

  const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(() => {
    jest.useFakeTimers();
    embedding = { indexTenantData: jest.fn().mockResolvedValue({ indexed: 3, skipped: 1, errors: 0 }) };
    tenantRepo = {
      find: jest.fn().mockResolvedValue([
        { id: TENANT_A, name: 'Acme', isActive: true },
        { id: TENANT_B, name: 'Globex', isActive: true },
      ]),
    };
    dataSource = { query: jest.fn() };
    config = {
      get: jest.fn((key: string) => (key === 'MITRA_KNOWLEDGE_REINDEX_INITIAL_DELAY_MS' ? '60000' : '21600000')),
    };
    scheduler = new KnowledgeReindexSchedulerService(embedding as any, tenantRepo as any, dataSource as any, config as any);
  });

  afterEach(() => {
    scheduler.onModuleDestroy();
    jest.useRealTimers();
  });

  it('reindexes every active tenant on tick', async () => {
    await scheduler.tick();
    expect(tenantRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
    expect(embedding.indexTenantData).toHaveBeenCalledTimes(2);
    expect(embedding.indexTenantData).toHaveBeenCalledWith(TENANT_A, dataSource);
    expect(embedding.indexTenantData).toHaveBeenCalledWith(TENANT_B, dataSource);
  });

  it('continues when one tenant fails and reports the error', async () => {
    embedding.indexTenantData
      .mockRejectedValueOnce(new Error('tenant A failed'))
      .mockResolvedValueOnce({ indexed: 1, skipped: 0, errors: 0 });

    await expect(scheduler.tick()).resolves.toBeUndefined();
    expect(embedding.indexTenantData).toHaveBeenCalledTimes(2);
  });

  it('schedules the first run after the initial delay and repeats on interval', async () => {
    scheduler.onModuleInit();
    expect(config.get).toHaveBeenCalledWith('MITRA_KNOWLEDGE_REINDEX_INTERVAL_MS', '21600000');
    expect(config.get).toHaveBeenCalledWith('MITRA_KNOWLEDGE_REINDEX_INITIAL_DELAY_MS', '60000');

    await jest.advanceTimersByTimeAsync(60_000);
    expect(embedding.indexTenantData).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(embedding.indexTenantData).toHaveBeenCalledTimes(4);
  });

  it('does not overlap reindex cycles', async () => {
    const resolvers: Array<() => void> = [];
    embedding.indexTenantData.mockImplementation(
      () => new Promise((resolve) => {
        resolvers.push(() => resolve({ indexed: 0, skipped: 0, errors: 0 }));
      }),
    );

    const first = scheduler.tick();
    const second = scheduler.tick(); // in-flight → skipped synchronously
    await Promise.resolve(); // resolves tenantRepo.find
    await Promise.resolve(); // tick reaches tenant A's indexTenantData
    expect(resolvers.length).toBe(1); // sequential loop: only tenant A pending
    resolvers.forEach((r) => r()); // release tenant A
    await Promise.resolve(); // loop proceeds to tenant B
    expect(resolvers.length).toBe(2);
    resolvers.forEach((r) => r());
    await Promise.all([first, second]);

    expect(embedding.indexTenantData).toHaveBeenCalledTimes(2);
    expect(tenantRepo.find).toHaveBeenCalledTimes(1);
  });

  it('clears the timer on destroy', () => {
    scheduler.onModuleInit();
    scheduler.onModuleDestroy();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(embedding.indexTenantData).not.toHaveBeenCalled();
  });
});
