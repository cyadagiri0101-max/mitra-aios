import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AiConversation } from '../entities/ai-conversation.entity';
import { AiMessage } from '../entities/ai-message.entity';

@Injectable()
export class AiCopilotMemoryService {
  private readonly retentionDays: number;

  constructor(
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messageRepo: Repository<AiMessage>,
    private readonly config: ConfigService,
  ) {
    this.retentionDays = Math.max(1, Number(this.config.get('AI_COPILOT_MEMORY_RETENTION_DAYS', 14)));
  }

  async getScopedMemory(tenantId: string, userId: string, conversationId?: string) {
    await this.pruneExpired(tenantId);
    const conversation = conversationId
      ? await this.conversationRepo.findOne({ where: { id: conversationId, tenantId, userId, deletedAt: null } as any })
      : null;

    const messages = conversation
      ? await this.messageRepo.find({
          where: { conversationId: conversation.id },
          order: { createdAt: 'DESC' },
          take: 12,
        })
      : [];

    const referencedEntities = messages.flatMap((message) => Object.keys(message.contextRefs ?? {}));
    const recent = [...messages].reverse();
    return {
      conversationId: conversation?.id ?? null,
      selectedProject: (conversation?.intent?.startsWith('project:') ? conversation.intent.replace('project:', '') : null),
      referencedEntities: [...new Set(referencedEntities)].slice(0, 20),
      recentSearches: recent.filter((message) => message.role === 'user').slice(-5).map((message) => message.content),
      currentConversationContext: recent.map((message) => ({ role: message.role, content: message.content })).slice(-10),
      retentionDays: this.retentionDays,
    };
  }

  async saveTurn(conversationId: string | undefined, tenantId: string, userId: string, payload: { role: string; content: string; intent?: string | null; modelUsed?: string | null; processingMs?: number | null; contextRefs?: Record<string, unknown> | null }) {
    let conversation = conversationId
      ? await this.conversationRepo.findOne({ where: { id: conversationId, tenantId, userId, deletedAt: null } as any })
      : null;

    if (!conversation) {
      conversation = this.conversationRepo.create({
        tenantId,
        userId,
        title: payload.content.slice(0, 120),
        intent: payload.intent ?? 'copilot',
        messageCount: 0,
        isPinned: false,
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    const message = this.messageRepo.create({
      conversationId: conversation.id,
      role: payload.role,
      content: payload.content,
      intent: payload.intent ?? null,
      modelUsed: payload.modelUsed ?? null,
      processingMs: payload.processingMs ?? null,
      contextRefs: payload.contextRefs ?? null,
    });
    await this.messageRepo.save(message);

    conversation.messageCount = (conversation.messageCount ?? 0) + 1;
    conversation.updatedBy = userId;
    await this.conversationRepo.save(conversation);
    return conversation.id;
  }

  async listConversations(tenantId: string, userId: string, limit = 20) {
    return this.conversationRepo.find({
      where: { tenantId, userId, deletedAt: null } as any,
      order: { updatedAt: 'DESC' },
      take: Math.min(50, Math.max(1, limit)),
    });
  }

  async getConversationMessages(tenantId: string, userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId, tenantId, userId, deletedAt: null } as any });
    if (!conversation) return [];
    return this.messageRepo.find({ where: { conversationId }, order: { createdAt: 'ASC' } });
  }

  private async pruneExpired(tenantId: string) {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    await this.conversationRepo.softDelete({ tenantId, isPinned: false, updatedAt: LessThan(cutoff) } as any);
  }
}
