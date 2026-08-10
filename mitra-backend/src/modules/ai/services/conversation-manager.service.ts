import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConversation } from '../entities/ai-conversation.entity';
import { AiCopilotMemoryService } from './ai-copilot-memory.service';

/**
 * Sprint 2.8.2 Phase 5 — Conversation Manager.
 *
 * Wraps the 2.8.1 AiCopilotMemoryService (which stays untouched for the
 * legacy /ai/copilot/* endpoints) and adds the platform surface:
 * pin/unpin, JSON metadata, explicit expiry reporting derived from the
 * retention policy, and selected-project management. No long-term memory
 * is introduced — everything remains retention-bounded.
 */
@Injectable()
export class ConversationManagerService {
  private readonly retentionDays: number;

  constructor(
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    private readonly memory: AiCopilotMemoryService,
    private readonly config: ConfigService,
  ) {
    this.retentionDays = Math.max(1, Number(this.config.get('AI_COPILOT_MEMORY_RETENTION_DAYS', 14)));
  }

  async list(tenantId: string, userId: string, options: { pinnedOnly?: boolean; limit?: number } = {}) {
    const conversations = await this.memory.listConversations(tenantId, userId, options.limit ?? 20);
    const rows = conversations
      .filter((conversation) => !options.pinnedOnly || conversation.isPinned)
      .map((conversation) => this.withExpiry(conversation));
    return { data: rows, retentionDays: this.retentionDays };
  }

  async get(tenantId: string, userId: string, conversationId: string) {
    const conversation = await this.findOwnedConversation(tenantId, userId, conversationId);
    const messages = await this.memory.getConversationMessages(tenantId, userId, conversationId);
    return { ...this.withExpiry(conversation), messages };
  }

  async pin(tenantId: string, userId: string, conversationId: string, reason?: string) {
    const conversation = await this.findOwnedConversation(tenantId, userId, conversationId);
    conversation.isPinned = true;
    conversation.metadata = {
      ...(conversation.metadata ?? {}),
      pinReason: reason ?? null,
      pinnedAt: new Date().toISOString(),
      pinnedBy: userId,
    };
    conversation.updatedBy = userId;
    await this.conversationRepo.save(conversation);
    return this.withExpiry(conversation);
  }

  async unpin(tenantId: string, userId: string, conversationId: string) {
    const conversation = await this.findOwnedConversation(tenantId, userId, conversationId);
    conversation.isPinned = false;
    const metadata = { ...(conversation.metadata ?? {}) };
    delete metadata.pinReason;
    delete metadata.pinnedAt;
    delete metadata.pinnedBy;
    conversation.metadata = Object.keys(metadata).length ? metadata : null;
    conversation.updatedBy = userId;
    await this.conversationRepo.save(conversation);
    return this.withExpiry(conversation);
  }

  async setMetadata(tenantId: string, userId: string, conversationId: string, metadata: Record<string, unknown>) {
    const conversation = await this.findOwnedConversation(tenantId, userId, conversationId);
    conversation.metadata = { ...(conversation.metadata ?? {}), ...metadata };
    conversation.updatedBy = userId;
    await this.conversationRepo.save(conversation);
    return this.withExpiry(conversation);
  }

  async setSelectedProject(tenantId: string, userId: string, conversationId: string, projectId: string | null) {
    const conversation = await this.findOwnedConversation(tenantId, userId, conversationId);
    conversation.intent = projectId ? `project:${projectId}` : 'copilot';
    conversation.updatedBy = userId;
    await this.conversationRepo.save(conversation);
    return this.withExpiry(conversation);
  }

  retentionPolicy() {
    return { retentionDays: this.retentionDays, pinnedExempt: true };
  }

  private withExpiry(conversation: AiConversation) {
    const expiresAt = conversation.isPinned
      ? null
      : new Date((conversation.updatedAt ?? new Date()).getTime() + this.retentionDays * 24 * 60 * 60 * 1000);
    return {
      ...conversation,
      expiresAt,
      expired: !conversation.isPinned && expiresAt !== null && expiresAt.getTime() < Date.now(),
    };
  }

  private async findOwnedConversation(tenantId: string, userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId, userId, deletedAt: null } as any,
    });
    if (!conversation) throw new NotFoundException(`Conversation ${conversationId} not found`);
    return conversation;
  }
}
