import { NotFoundException } from '@nestjs/common';
import { ConversationManagerService } from './conversation-manager.service';

const makeConversation = (overrides: Record<string, any> = {}) => ({
  id: 'conv-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  title: 'Test conversation',
  intent: 'copilot',
  messageCount: 4,
  isPinned: false,
  metadata: null,
  updatedAt: new Date(),
  ...overrides,
});

const buildService = (overrides: Record<string, any> = {}) => {
  const conversationRepo = overrides.conversationRepo ?? {
    findOne: jest.fn().mockResolvedValue(makeConversation()),
    save: jest.fn(async (entity: any) => entity),
  };
  const memory = overrides.memory ?? {
    listConversations: jest.fn(async () => [makeConversation(), makeConversation({ id: 'conv-2', isPinned: true })]),
    getConversationMessages: jest.fn(async () => [{ id: 'm1', role: 'user', content: 'hi' }]),
  };
  const config = { get: jest.fn((_key: string, fallback?: any) => fallback) };
  const service = new ConversationManagerService(conversationRepo as any, memory as any, config as any);
  return { service, conversationRepo, memory };
};

describe('ConversationManagerService', () => {
  it('lists conversations with computed expiry', async () => {
    const { service } = buildService();
    const result = await service.list('tenant-1', 'user-1');
    expect(result.data).toHaveLength(2);
    expect(result.retentionDays).toBe(14);
    const unpinned = result.data.find((c: any) => !c.isPinned) as any;
    const pinned = result.data.find((c: any) => c.isPinned) as any;
    expect(unpinned.expiresAt).toBeInstanceOf(Date);
    expect(pinned.expiresAt).toBeNull();
  });

  it('filters pinned conversations', async () => {
    const { service } = buildService();
    const result = await service.list('tenant-1', 'user-1', { pinnedOnly: true });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].isPinned).toBe(true);
  });

  it('pins a conversation and records metadata', async () => {
    const { service, conversationRepo } = buildService();
    const result = await service.pin('tenant-1', 'user-1', 'conv-1', 'keep for audit');
    expect(result.isPinned).toBe(true);
    expect((result.metadata as any).pinReason).toBe('keep for audit');
    expect(result.expiresAt).toBeNull();
    expect(conversationRepo.save).toHaveBeenCalled();
  });

  it('unpins and clears pin metadata', async () => {
    const conversationRepo = {
      findOne: jest.fn().mockResolvedValue(makeConversation({
        isPinned: true,
        metadata: { pinReason: 'x', pinnedAt: 'now', pinnedBy: 'user-1', tag: 'keep' },
      })),
      save: jest.fn(async (entity: any) => entity),
    };
    const { service } = buildService({ conversationRepo });
    const result = await service.unpin('tenant-1', 'user-1', 'conv-1');
    expect(result.isPinned).toBe(false);
    expect((result.metadata as any).tag).toBe('keep');
    expect((result.metadata as any).pinReason).toBeUndefined();
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('merges metadata without dropping existing keys', async () => {
    const conversationRepo = {
      findOne: jest.fn().mockResolvedValue(makeConversation({ metadata: { tag: 'a' } })),
      save: jest.fn(async (entity: any) => entity),
    };
    const { service } = buildService({ conversationRepo });
    const result = await service.setMetadata('tenant-1', 'user-1', 'conv-1', { followUp: true });
    expect((result.metadata as any).tag).toBe('a');
    expect((result.metadata as any).followUp).toBe(true);
  });

  it('sets and clears the selected project via intent', async () => {
    const conversationRepo = {
      findOne: jest.fn().mockResolvedValue(makeConversation()),
      save: jest.fn(async (entity: any) => entity),
    };
    const { service } = buildService({ conversationRepo });
    const set = await service.setSelectedProject('tenant-1', 'user-1', 'conv-1', 'proj-9');
    expect(set.intent).toBe('project:proj-9');
    const cleared = await service.setSelectedProject('tenant-1', 'user-1', 'conv-1', null);
    expect(cleared.intent).toBe('copilot');
  });

  it('returns messages with expiry for a single conversation', async () => {
    const { service, memory } = buildService();
    const result = await service.get('tenant-1', 'user-1', 'conv-1');
    expect(result.messages).toHaveLength(1);
    expect(memory.getConversationMessages).toHaveBeenCalledWith('tenant-1', 'user-1', 'conv-1');
  });

  it('throws NotFoundException for foreign conversations', async () => {
    const conversationRepo = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const { service } = buildService({ conversationRepo });
    await expect(service.pin('tenant-1', 'user-1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('exposes the retention policy', () => {
    const { service } = buildService();
    expect(service.retentionPolicy()).toEqual({ retentionDays: 14, pinnedExempt: true });
  });
});
