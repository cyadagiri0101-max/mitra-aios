import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like } from 'typeorm';
import {
  EngineeringReviewRequest, ReviewEntityType, ReviewType, ReviewStatus, ReviewDecision,
} from '../entities/engineering-review-request.entity';
import { EngineeringReviewComment } from '../entities/engineering-review-comment.entity';
import {
  EngineeringReviewAssignment, AssignmentRole, AssignmentStatus,
} from '../entities/engineering-review-assignment.entity';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringEventBus } from './engineering-event-bus.service';
import { EngineeringDomainEventType } from '../events/engineering.events';
import { EngineeringAiHooksService } from './engineering-ai-hooks.service';
import { AuditService } from '../../audit/services/audit.service';
import { NotificationService } from '../../platform/services/notification.service';

/**
 * Engineering Reviews: review requests, reviewer assignment, approval,
 * comments, markups and decisions.
 */
@Injectable()
export class EngineeringReviewService {
  constructor(
    @InjectRepository(EngineeringReviewRequest)
    private readonly reviewRepo: Repository<EngineeringReviewRequest>,
    @InjectRepository(EngineeringReviewComment)
    private readonly commentRepo: Repository<EngineeringReviewComment>,
    @InjectRepository(EngineeringReviewAssignment)
    private readonly assignmentRepo: Repository<EngineeringReviewAssignment>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly eventBus: EngineeringEventBus,
    private readonly aiHooks: EngineeringAiHooksService,
    private readonly outboxService: OutboxService,
  ) {}

  async findAllAdvanced(tenantId?: string | null, query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.reviewRepo.createQueryBuilder('r').where('r.deleted_at IS NULL');
    if (tenantId) qb.andWhere('r.tenant_id = :tenantId', { tenantId });
    if (query.search) {
      qb.andWhere('(r.review_number ILIKE :search OR r.title ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.projectId) qb.andWhere('r.project_id = :projectId', { projectId: query.projectId });
    if (query.entityType) qb.andWhere('r.entity_type = :entityType', { entityType: query.entityType });
    if (query.entityId) qb.andWhere('r.entity_id = :entityId', { entityId: query.entityId });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.reviewerId) qb.andWhere('r.reviewer_id = :reviewerId', { reviewerId: query.reviewerId });

    const SORTABLE = new Set(['reviewNumber', 'title', 'createdAt', 'status', 'dueDate', 'updatedAt']);
    const sortBy = query.sortBy ?? 'createdAt';
    const field = SORTABLE.has(sortBy) ? `r.${sortBy}` : 'r.created_at';
    const direction = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(field, direction).addOrderBy('r.created_at', 'DESC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const review = await this.reviewRepo.findOne({ where });
    if (!review) throw new NotFoundException('Review request not found');
    return review;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    if (!data.projectId || !data.entityType || !data.entityId) {
      throw new NotFoundException('projectId, entityType and entityId are required — no orphan review records');
    }
    const review = this.reviewRepo.create({
      ...data,
      reviewNumber: await this.generateReviewNumber(tenantId),
      status: ReviewStatus.PENDING,
      requestedBy: userId,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    const saved = await this.reviewRepo.save(review);
    await this.auditService.logBusinessEvent('engineering.review.created', 'EngineeringReviewRequest', saved.id, userId ?? 'system', {
      reviewNumber: saved.reviewNumber,
      entityType: saved.entityType,
      entityId: saved.entityId,
      projectId: saved.projectId,
      tenantId: saved.tenantId,
    });
    this.publish(saved, EngineeringDomainEventType.REVIEW_REQUESTED, {}, userId);
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const review = await this.findOne(id, tenantId);
    Object.assign(review, data, { updatedBy: userId });
    const saved = await this.reviewRepo.save(review);
    await this.auditService.logBusinessEvent('engineering.review.updated', 'EngineeringReviewRequest', saved.id, userId ?? 'system', {
      changedFields: Object.keys(data),
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const review = await this.findOne(id, tenantId);
    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      review.deletedAt = now;
      review.updatedBy = userId;
      await em.getRepository(EngineeringReviewRequest).save(review);
      await em.getRepository(EngineeringReviewComment).update(
        { reviewRequestId: id, deletedAt: IsNull() },
        { deletedAt: now, updatedBy: userId },
      );
    });
    await this.auditService.logBusinessEvent('engineering.review.deleted', 'EngineeringReviewRequest', id, userId ?? 'system', {
      reviewNumber: review.reviewNumber,
      tenantId: review.tenantId,
    });
    return { deleted: true, id };
  }

  /**
   * Record a reviewer decision. APPROVE / REJECT / CHANGES_REQUIRED /
   * CONCURRED. Terminal decisions complete the review.
   */
  async decide(id: string, decision: ReviewDecision, comments: string | null, userId: string, tenantId?: string | null) {
    const review = await this.findOne(id, tenantId);
    if (review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.REJECTED || review.status === ReviewStatus.CANCELLED) {
      throw new NotFoundException(`Review already completed with status ${review.status}`);
    }
    review.status = decision === ReviewDecision.APPROVE || decision === ReviewDecision.CONCURRED
      ? ReviewStatus.APPROVED
      : decision === ReviewDecision.REJECT
        ? ReviewStatus.REJECTED
        : ReviewStatus.CHANGES_REQUIRED;
    review.decision = decision;
    review.decisionComments = comments;
    review.completedAt = new Date();
    review.updatedBy = userId;
    const saved = await this.reviewRepo.save(review);

    await this.auditService.logBusinessEvent('engineering.review.decided', 'EngineeringReviewRequest', saved.id, userId ?? 'system', {
      decision,
      tenantId: saved.tenantId,
    });
    this.publish(saved, EngineeringDomainEventType.REVIEW_DECIDED, { decision, comments }, userId);
    return saved;
  }

  // ── Multi-reviewer assignments (Sprint 2.3.1 G-5) ────────────────────────

  /** List assignments for a review request. */
  async listAssignments(reviewId: string, tenantId?: string | null) {
    await this.findOne(reviewId, tenantId);
    const where: any = { reviewRequestId: reviewId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.assignmentRepo.find({ where, order: { createdAt: 'ASC' } });
  }

  /**
   * Assign reviewers to a review request. Creates assignments (idempotent
   * per assignee) and sets the review to IN_REVIEW when it was PENDING.
   * Assignments + outbox rows commit in one transaction (G-13).
   */
  async assign(
    reviewId: string,
    assignees: { assigneeId: string; assigneeName?: string | null; reviewRole?: string }[],
    userId: string,
    tenantId?: string | null,
  ) {
    if (!assignees?.length) throw new NotFoundException('At least one assignee is required');
    const review = await this.findOne(reviewId, tenantId);
    if (review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.REJECTED || review.status === ReviewStatus.CANCELLED) {
      throw new NotFoundException(`Cannot assign reviewers to a completed review (${review.status})`);
    }

    const saved = await this.dataSource.transaction(async (em) => {
      const repo = em.getRepository(EngineeringReviewAssignment);
      const created: EngineeringReviewAssignment[] = [];
      for (const a of assignees) {
        if (!a.assigneeId) throw new NotFoundException('assigneeId is required');
        const existing = await repo.findOne({
          where: { reviewRequestId: reviewId, assigneeId: a.assigneeId, deletedAt: IsNull() },
        });
        const row = existing ?? repo.create({
          reviewRequestId: reviewId,
          assigneeId: a.assigneeId,
          createdBy: userId,
          updatedBy: userId,
          tenantId: review.tenantId ?? tenantId ?? undefined,
        });
        if (a.assigneeName !== undefined) row.assigneeName = a.assigneeName ?? null;
        if (a.reviewRole !== undefined) row.reviewRole = (a.reviewRole as AssignmentRole) ?? AssignmentRole.REVIEWER;
        if (existing && existing.status === AssignmentStatus.PENDING) {
          row.updatedBy = userId;
        }
        const savedRow = await repo.save(row);
        if (!existing) {
          created.push(savedRow);
          await this.outboxService.append(
            EngineeringDomainEventType.REVIEW_ASSIGNED,
            'EngineeringReviewAssignment',
            savedRow.id,
            { projectId: review.projectId, entityId: review.id, entityNumber: review.reviewNumber, assigneeId: a.assigneeId, reviewRole: row.reviewRole },
            { tenantId: review.tenantId, actorId: userId, em },
          );
        }
      }
      if (created.length) {
        review.status = ReviewStatus.IN_REVIEW;
        review.updatedBy = userId;
        await em.getRepository(EngineeringReviewRequest).save(review);
      }
      return created;
    });

    if (saved.length) {
      await this.auditService.logBusinessEvent('engineering.review.assigned', 'EngineeringReviewRequest', reviewId, userId ?? 'system', {
        reviewNumber: review.reviewNumber,
        assignees: saved.map((a) => a.assigneeId),
        tenantId: review.tenantId,
      });
    }
    return this.listAssignments(reviewId, tenantId);
  }

  /**
   * Record an individual reviewer's decision on an assignment and roll the
   * review status up: any REJECT → REJECTED; all terminal → APPROVED (or
   * CHANGES_REQUIRED when any reviewer asked for changes); otherwise the
   * review stays IN_REVIEW.
   */
  async decideAssignment(
    reviewId: string,
    assigneeId: string,
    decision: ReviewDecision,
    comments: string | null,
    userId: string,
    tenantId?: string | null,
  ) {
    const review = await this.findOne(reviewId, tenantId);
    if (review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.REJECTED || review.status === ReviewStatus.CANCELLED) {
      throw new NotFoundException(`Review already completed with status ${review.status}`);
    }
    const where: any = { reviewRequestId: reviewId, assigneeId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const assignment = await this.assignmentRepo.findOne({ where });
    if (!assignment) throw new NotFoundException('Review assignment not found');

    assignment.decision = decision;
    assignment.decisionComments = comments;
    assignment.decidedAt = new Date();
    assignment.status = decision === ReviewDecision.APPROVE || decision === ReviewDecision.CONCURRED
      ? AssignmentStatus.APPROVED
      : decision === ReviewDecision.REJECT
        ? AssignmentStatus.REJECTED
        : AssignmentStatus.CHANGES_REQUIRED;
    assignment.updatedBy = userId;
    const savedAssignment = await this.assignmentRepo.save(assignment);

    const assignments = await this.listAssignments(reviewId, tenantId);
    const terminal = [AssignmentStatus.APPROVED, AssignmentStatus.REJECTED, AssignmentStatus.CHANGES_REQUIRED];
    const rejected = assignments.some((a) => a.status === AssignmentStatus.REJECTED);
    const allDecided = assignments.length > 0 && assignments.every((a) => terminal.includes(a.status));

    if (rejected || allDecided) {
      review.status = rejected
        ? ReviewStatus.REJECTED
        : assignments.some((a) => a.status === AssignmentStatus.CHANGES_REQUIRED)
          ? ReviewStatus.CHANGES_REQUIRED
          : ReviewStatus.APPROVED;
      review.decision = rejected
        ? ReviewDecision.REJECT
        : assignments.some((a) => a.status === AssignmentStatus.CHANGES_REQUIRED)
          ? ReviewDecision.CHANGES_REQUIRED
          : ReviewDecision.APPROVE;
      review.decisionComments = comments;
      review.completedAt = new Date();
      review.updatedBy = userId;
      const savedReview = await this.reviewRepo.save(review);

      await this.auditService.logBusinessEvent('engineering.review.decided', 'EngineeringReviewRequest', savedReview.id, userId ?? 'system', {
        decision: savedReview.decision,
        assignments: assignments.map((a) => ({ assigneeId: a.assigneeId, status: a.status })),
        tenantId: savedReview.tenantId,
      });
      this.publish(savedReview, EngineeringDomainEventType.REVIEW_DECIDED, { decision: savedReview.decision, comments, via: 'assignments' }, userId);
    } else {
      review.status = ReviewStatus.IN_REVIEW;
      review.updatedBy = userId;
      await this.reviewRepo.save(review);
    }

    await this.auditService.logBusinessEvent('engineering.review.assignment_decided', 'EngineeringReviewAssignment', savedAssignment.id, userId ?? 'system', {
      reviewRequestId: reviewId,
      decision,
      tenantId: review.tenantId,
    });
    return { assignment: savedAssignment, reviewStatus: review.status };
  }

  // ── Comments & markups ───────────────────────────────────────────────────

  async listComments(reviewId: string, tenantId?: string | null) {
    await this.findOne(reviewId, tenantId);
    const where: any = { reviewRequestId: reviewId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.commentRepo.find({ where, order: { createdAt: 'ASC' } });
  }

  async addComment(reviewId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const review = await this.findOne(reviewId, tenantId);
    const body = data.comment ?? data.body;
    if (!body) throw new NotFoundException('Comment body is required');
    const comment = this.commentRepo.create({
      reviewRequestId: reviewId,
      body,
      markupData: data.markupData ?? null,
      authorId: userId,
      authorName: data.authorName ?? null,
      createdBy: userId,
      updatedBy: userId,
      tenantId: review.tenantId ?? tenantId ?? undefined,
    });
    const saved = await this.commentRepo.save(comment);
    await this.auditService.logBusinessEvent('engineering.review.comment_added', 'EngineeringReviewComment', saved.id, userId ?? 'system', {
      reviewRequestId: reviewId,
      tenantId: saved.tenantId,
    });
    return saved;
  }

  async resolveComment(reviewId: string, commentId: string, userId: string, tenantId?: string | null) {
    await this.findOne(reviewId, tenantId);
    const where: any = { id: commentId, reviewRequestId: reviewId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const comment = await this.commentRepo.findOne({ where });
    if (!comment) throw new NotFoundException('Review comment not found');
    comment.isResolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date();
    comment.updatedBy = userId;
    return this.commentRepo.save(comment);
  }

  async removeComment(reviewId: string, commentId: string, userId: string, tenantId?: string | null) {
    await this.findOne(reviewId, tenantId);
    const where: any = { id: commentId, reviewRequestId: reviewId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const comment = await this.commentRepo.findOne({ where });
    if (!comment) throw new NotFoundException('Review comment not found');
    comment.deletedAt = new Date();
    comment.updatedBy = userId;
    await this.commentRepo.save(comment);
    return { deleted: true, id: commentId };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async generateReviewNumber(tenantId?: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RVR-${year}-`;
    const where: any = { reviewNumber: Like(`${prefix}%`) };
    if (tenantId) where.tenantId = tenantId;
    const count = await this.reviewRepo.count({ where });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private publish(review: EngineeringReviewRequest, eventType: EngineeringDomainEventType, payload: Record<string, any> = {}, actorId?: string | null) {
    const event = {
      eventType,
      occurredAt: new Date(),
      tenantId: review.tenantId,
      actorId: actorId ?? null,
      payload: {
        projectId: review.projectId,
        entityId: review.id,
        entityNumber: review.reviewNumber,
        entityType: review.entityType,
        reviewedEntityId: review.entityId,
        ...payload,
      },
    };
    this.eventBus.publish(event);
    this.aiHooks.dispatchEvent(event).catch(() => undefined);
  }
}
