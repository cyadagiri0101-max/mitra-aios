import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { CommercialAiService } from './commercial-ai.service';
import { AiDocumentMetadata } from '../entities/ai-document-metadata.entity';

describe('CommercialAiService', () => {
  let service: CommercialAiService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((d: any) => ({ ...d })),
      save: jest.fn((d: any) => Promise.resolve({ ...d, id: d.id ?? 'ai-9' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommercialAiService,
        { provide: getRepositoryToken(AiDocumentMetadata), useValue: repo },
      ],
    }).compile();

    service = module.get(CommercialAiService);
  });

  it('rejects tenantless syncEntityContext (fail closed)', async () => {
    await expect(
      service.syncEntityContext('RFQ', 'r-1', { key: 'v' }, 'u-1', null),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('scopes the existing-context lookup to the caller tenant', async () => {
    await service.syncEntityContext('RFQ', 'r-1', { key: 'v' }, 'u-1', 't-1');
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ entityType: 'RFQ', entityId: 'r-1', tenantId: 't-1' }) }),
    );
  });

  it('writes the caller tenant onto a new context', async () => {
    await service.syncEntityContext('RFQ', 'r-1', { key: 'v' }, 'u-1', 't-1');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-1' }));
  });

  it('never updates another tenant\'s context — row from t-1 is invisible to t-2', async () => {
    const t1Row = { id: 'ai-1', entityType: 'RFQ', entityId: 'r-1', documentMetadata: {}, embeddingPlaceholder: null, knowledgeRefs: [], tenantId: 't-1', deletedAt: null, updatedAt: new Date() };
    repo.findOne.mockImplementation(async ({ where }: any) => (where.tenantId === 't-1' ? { ...t1Row } : null));
    const saved = await service.syncEntityContext('RFQ', 'r-1', { key: 'new' }, 'u-2', 't-2');
    expect(saved.tenantId).toBe('t-2');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-2' }));
    expect(repo.save).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'ai-1', tenantId: 't-1' }));
  });

  it('rejects tenantless getContext (fail closed)', async () => {
    await expect(service.getContext('RFQ', 'r-1', null)).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('rejects tenantless listByEntityType (fail closed)', async () => {
    await expect(service.listByEntityType('RFQ')).rejects.toThrow(ForbiddenException);
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('scopes listByEntityType to the caller tenant', async () => {
    await service.listByEntityType('RFQ', 't-1', 10);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ entityType: 'RFQ', tenantId: 't-1' }) }),
    );
  });

  it('rejects tenantless setEmbeddingPlaceholder (fail closed)', async () => {
    await expect(service.setEmbeddingPlaceholder('RFQ', 'r-1', 'text-embedding', 1536)).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('rejects tenantless addKnowledgeRef (fail closed)', async () => {
    await expect(service.addKnowledgeRef('RFQ', 'r-1', { type: 'DOC', id: 'd-1' })).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });
});