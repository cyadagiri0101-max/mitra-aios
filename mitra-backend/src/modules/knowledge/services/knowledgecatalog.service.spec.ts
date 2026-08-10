import { KnowledgeCatalogService } from './knowledgecatalog.service';

describe('KnowledgeCatalogService', () => {
  it('creates a catalog entry without duplicating source data', async () => {
    const repo = {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => ({ id: 'entry-1', ...input })),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const service = new KnowledgeCatalogService(repo as any);

    const result = await service.upsertCatalogEntry({
      tenantId: 'tenant-1',
      entityType: 'project',
      entityId: '11111111-1111-1111-1111-111111111111',
      title: 'Project catalog entry',
      summary: 'Derived metadata from existing project row',
      sourceDomain: 'project',
      sourceRef: { projectNumber: 'P-1001' },
      tags: ['project', 'risk'],
    });

    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(result.title).toBe('Project catalog entry');
    expect(result.sourceRef).toEqual({ projectNumber: 'P-1001' });
  });
});
