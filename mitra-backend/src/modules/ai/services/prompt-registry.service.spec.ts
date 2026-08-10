import { ConflictException, NotFoundException } from '@nestjs/common';
import { PromptRegistryService } from './prompt-registry.service';
import { PROMPT_SEED_DEFINITIONS } from './prompt-seed.data';

const makeQueryBuilder = (overrides: Record<string, jest.Mock | any> = {}) => {
  const qb: any = {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ raw: [] }),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    ...overrides,
  };
  return qb;
};

const makeRepo = (qb?: any) => ({
  create: jest.fn((data: any) => ({ ...data })),
  save: jest.fn(async (entity: any) => ({ id: 'prompt-1', ...entity })),
  findOne: jest.fn().mockResolvedValue(null),
  createQueryBuilder: jest.fn(() => qb ?? makeQueryBuilder()),
});

const buildService = (repo?: any) => {
  const actualRepo = repo ?? makeRepo();
  const service = new PromptRegistryService(actualRepo as any);
  return { service, repo: actualRepo };
};

describe('PromptRegistryService', () => {
  it('seeds all catalogue definitions idempotently at startup', async () => {
    const qb = makeQueryBuilder();
    const repo = makeRepo(qb);
    const { service } = buildService(repo);
    await service.onModuleInit();
    expect(qb.insert).toHaveBeenCalled();
    expect(qb.orIgnore).toHaveBeenCalled();
    expect(qb.values.mock.calls[0][0]).toHaveLength(PROMPT_SEED_DEFINITIONS.length);
  });

  it('degrades to in-memory seed definitions when the database is unreachable', async () => {
    const qb = makeQueryBuilder({ execute: jest.fn().mockRejectedValue(new Error('connection refused')) });
    const repo = makeRepo(qb);
    const { service } = buildService(repo);
    await service.onModuleInit();

    const resolved = await service.resolve('quality.ncr_explanation');
    expect(resolved?.key).toBe('quality.ncr_explanation');
    expect(resolved?.status).toBe('PUBLISHED');

    const built = await service.buildPrompt('quality.ncr_explanation', { message: 'explain', context: { a: 1 } });
    expect(built.source).toBe('fallback');
    expect(built.prompt).toContain('quality');
  });

  it('resolves published templates preferring the requested locale', async () => {
    const localized = { id: 'p2', key: 'quality.ncr_explanation', version: 'v1', locale: 'hi', status: 'PUBLISHED', template: 'नमस्ते {{message}}' };
    const qb = makeQueryBuilder({ getOne: jest.fn().mockResolvedValue(localized) });
    const { service } = buildService(makeRepo(qb));
    const resolved = await service.resolve('quality.ncr_explanation', 'hi');
    expect(resolved?.locale).toBe('hi');
  });

  it('creates drafts with validation and duplicate protection', async () => {
    const repo = makeRepo();
    const { service } = buildService(repo);

    await expect(service.create({ key: 'bad key!', template: 'long enough template' })).rejects.toThrow(ConflictException);
    await expect(service.create({ key: 'quality.short', template: 'tiny' })).rejects.toThrow(ConflictException);

    repo.findOne.mockResolvedValueOnce({ id: 'existing' });
    await expect(service.create({ key: 'quality.ncr_explanation', template: 'long enough template' })).rejects.toThrow(ConflictException);

    repo.findOne.mockResolvedValueOnce(null);
    const draft = await service.create({
      key: 'quality.custom_check',
      template: 'Check {{message}} against {{context}}',
      variables: ['message', 'context'],
    }, 'user-1');
    expect(draft.status).toBe('DRAFT');
    expect(draft.createdBy).toBe('user-1');
  });

  it('rejects declared variables missing from the template', async () => {
    const { service } = buildService();
    await expect(service.create({
      key: 'quality.custom_check',
      template: 'Only message here {{message}}',
      variables: ['message', 'graphContext'],
    })).rejects.toThrow(/graphContext/);
  });

  it('only allows editing DRAFT prompts', async () => {
    const repo = makeRepo();
    const { service } = buildService(repo);
    repo.findOne.mockResolvedValueOnce({ id: 'p1', key: 'a.b', status: 'PUBLISHED', template: 'long enough', variables: [] });
    await expect(service.update('p1', { template: 'long enough template' })).rejects.toThrow(ConflictException);
  });

  it('publish archives previous published versions and records approval', async () => {
    const qb = makeQueryBuilder();
    const repo = makeRepo(qb);
    const { service } = buildService(repo);
    repo.findOne.mockResolvedValueOnce({ id: 'p1', key: 'quality.ncr_explanation', locale: 'en', version: 'v2', status: 'DRAFT', template: 'long enough', variables: [] });

    const published = await service.publish('p1', 'approver-1');
    expect(published.status).toBe('PUBLISHED');
    expect(published.approvedBy).toBe('approver-1');
    expect(published.approvedAt).toBeInstanceOf(Date);
    expect(qb.update).toHaveBeenCalled();
  });

  it('rejects publishing already published or archived prompts', async () => {
    const repo = makeRepo();
    const { service } = buildService(repo);
    repo.findOne.mockResolvedValueOnce({ id: 'p1', status: 'PUBLISHED', key: 'a.b' });
    await expect(service.publish('p1')).rejects.toThrow(ConflictException);
    repo.findOne.mockResolvedValueOnce({ id: 'p2', status: 'ARCHIVED', key: 'a.c' });
    await expect(service.publish('p2')).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException for unknown ids', async () => {
    const { service } = buildService();
    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });

  it('buildPrompt renders variables with secret redaction', async () => {
    const template = { id: 'p1', key: 'quality.ncr_explanation', version: 'v3', locale: 'en', status: 'PUBLISHED', template: 'Msg {{message}} Ctx {{context}}' };
    const qb = makeQueryBuilder({ getOne: jest.fn().mockResolvedValue(template) });
    const { service } = buildService(makeRepo(qb));

    const built = await service.buildPrompt('quality.ncr_explanation', {
      message: 'token: abc123 and hello',
      context: { note: 'ok' },
    });
    expect(built.source).toBe('registry');
    expect(built.promptVersion).toBe('v3');
    expect(built.prompt).toContain('token: [redacted]');
    expect(built.prompt).toContain('hello');
  });

  it('buildPrompt falls back to the advisory default when no template resolves', async () => {
    const { service } = buildService();
    const built = await service.buildPrompt('unknown.task', { message: 'hi', context: {} });
    expect(built.source).toBe('fallback');
    expect(built.promptTemplate).toBe('default.fallback');
    expect(built.prompt).toContain('advisory only');
  });

  it('lists templates with filters and pagination', async () => {
    const rows = [{ id: 'p1', key: 'quality.ncr_explanation', category: 'quality', status: 'PUBLISHED' }];
    const qb = makeQueryBuilder({ getManyAndCount: jest.fn().mockResolvedValue([rows, 1]) });
    const { service } = buildService(makeRepo(qb));
    const result = await service.list({ category: 'quality', status: 'PUBLISHED', page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.data[0].key).toBe('quality.ncr_explanation');
  });
});
