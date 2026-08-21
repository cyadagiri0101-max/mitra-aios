import { KnowledgeArticleController } from './knowledgearticle.controller';
import { ArticleStatus, ArticleType } from '../entities/knowledgearticle.entity';

describe('KnowledgeArticleController', () => {
  let controller: KnowledgeArticleController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    createArticleDraftFromDecision: jest.Mock;
    attachEvidence: jest.Mock;
    getEvidence: jest.Mock;
    detachEvidence: jest.Mock;
    createRevision: jest.Mock;
    getRevisionHistory: jest.Mock;
    update: jest.Mock;
    submitForReview: jest.Mock;
    approveAndPublish: jest.Mock;
    rejectReview: jest.Mock;
    reopenRejected: jest.Mock;
    markSuperseded: jest.Mock;
    markExpired: jest.Mock;
    remove: jest.Mock;
  };

  const user = {
    id: 'user-lead-1',
    email: 'lead@mitra.ai',
    tenantId: 'tenant-1',
    roles: ['DESIGN'],
  };

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      findOne: jest.fn().mockResolvedValue({ id: 'art-1', title: 'Test Article' }),
      create: jest.fn().mockResolvedValue({ id: 'art-1', status: ArticleStatus.DRAFT }),
      createArticleDraftFromDecision: jest.fn().mockResolvedValue({
        id: 'art-draft-1',
        title: 'Engineering Decision: Conformal Cooling',
        status: ArticleStatus.DRAFT,
      }),
      attachEvidence: jest.fn().mockResolvedValue([{ id: 'ev-1', chunkId: 'c-1', citationLabel: '[REF-1]' }]),
      getEvidence: jest.fn().mockResolvedValue([{ id: 'ev-1', chunkId: 'c-1', citationLabel: '[REF-1]' }]),
      detachEvidence: jest.fn().mockResolvedValue(undefined),
      createRevision: jest.fn().mockResolvedValue({ id: 'art-2', version: 2, status: ArticleStatus.DRAFT }),
      getRevisionHistory: jest.fn().mockResolvedValue([{ id: 'art-1', version: 1 }, { id: 'art-2', version: 2 }]),
      update: jest.fn().mockResolvedValue({ id: 'art-1', title: 'Updated Title' }),
      submitForReview: jest.fn().mockResolvedValue({ id: 'art-1', status: ArticleStatus.UNDER_REVIEW }),
      approveAndPublish: jest.fn().mockResolvedValue({ id: 'art-1', status: ArticleStatus.PUBLISHED }),
      rejectReview: jest.fn().mockResolvedValue({ id: 'art-1', status: ArticleStatus.REJECTED }),
      reopenRejected: jest.fn().mockResolvedValue({ id: 'art-1', status: ArticleStatus.DRAFT }),
      markSuperseded: jest.fn().mockResolvedValue({ id: 'art-1', status: ArticleStatus.SUPERSEDED }),
      markExpired: jest.fn().mockResolvedValue({ id: 'art-1', status: ArticleStatus.EXPIRED }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    controller = new KnowledgeArticleController(service as any);
  });

  it('delegates create to service with authenticated user context', async () => {
    const dto = { title: 'New Guideline', content: 'Content', articleType: ArticleType.PROCEDURE };
    await controller.create(dto as any, user as any);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-lead-1', 'tenant-1');
  });

  it('delegates createFromDecision to service', async () => {
    await controller.createFromDecision('dec-123', user as any);
    expect(service.createArticleDraftFromDecision).toHaveBeenCalledWith('dec-123', 'user-lead-1', 'tenant-1');
  });

  it('delegates attachEvidence, getEvidence, and detachEvidence to service', async () => {
    await controller.attachEvidence('art-1', { chunkIds: ['c-1'] }, user as any);
    expect(service.attachEvidence).toHaveBeenCalledWith('art-1', { chunkIds: ['c-1'] }, 'user-lead-1', 'tenant-1');

    await controller.getEvidence('art-1', user as any);
    expect(service.getEvidence).toHaveBeenCalledWith('art-1', 'tenant-1');

    await controller.detachEvidence('art-1', 'ev-1', user as any);
    expect(service.detachEvidence).toHaveBeenCalledWith('art-1', 'ev-1', 'user-lead-1', 'tenant-1');
  });

  it('delegates createRevision and getRevisionHistory to service', async () => {
    await controller.createRevision('art-1', user as any);
    expect(service.createRevision).toHaveBeenCalledWith('art-1', 'user-lead-1', 'tenant-1');

    await controller.getRevisionHistory('art-1', user as any);
    expect(service.getRevisionHistory).toHaveBeenCalledWith('art-1', 'tenant-1');
  });

  it('delegates submitForReview to service', async () => {
    await controller.submitForReview('art-1', { reviewDueDate: '2026-10-01' }, user as any);
    expect(service.submitForReview).toHaveBeenCalledWith('art-1', { reviewDueDate: '2026-10-01' }, 'user-lead-1', 'tenant-1');
  });

  it('delegates approve / publish to service', async () => {
    await controller.approve('art-1', { expiresAt: '2027-01-01' }, user as any);
    expect(service.approveAndPublish).toHaveBeenCalledWith('art-1', { expiresAt: '2027-01-01' }, 'user-lead-1', 'tenant-1');

    await controller.publish('art-1', {}, user as any);
    expect(service.approveAndPublish).toHaveBeenCalledWith('art-1', {}, 'user-lead-1', 'tenant-1');
  });

  it('delegates reject to service with rejection reason', async () => {
    await controller.reject('art-1', { rejectionReason: 'Incomplete tooling parameters.' }, user as any);
    expect(service.rejectReview).toHaveBeenCalledWith(
      'art-1',
      { rejectionReason: 'Incomplete tooling parameters.' },
      'user-lead-1',
      'tenant-1',
    );
  });

  it('delegates reopen, supersede, expire to service', async () => {
    await controller.reopen('art-1', user as any);
    expect(service.reopenRejected).toHaveBeenCalledWith('art-1', 'user-lead-1', 'tenant-1');

    await controller.supersede('art-1', user as any);
    expect(service.markSuperseded).toHaveBeenCalledWith('art-1', 'user-lead-1', 'tenant-1');

    await controller.expire('art-1', user as any);
    expect(service.markExpired).toHaveBeenCalledWith('art-1', 'user-lead-1', 'tenant-1');
  });
});
