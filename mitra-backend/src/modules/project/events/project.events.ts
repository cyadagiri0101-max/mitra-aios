/**
 * Project domain events (Sprint 2.2).
 *
 * These are in-process domain events published through the
 * DomainEventBus. AI/preparation subscribers (e.g. risk prediction,
 * similar-project lookup) attach here without coupling to inference.
 */

export enum ProjectDomainEventType {
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_STATUS_CHANGED = 'project.status_changed',
  MILESTONE_COMPLETED = 'project.milestone_completed',
  MILESTONE_DELAYED = 'project.milestone_delayed',
  TASK_CREATED = 'project.task_created',
  TASK_STATUS_CHANGED = 'project.task_status_changed',
  RISK_CREATED = 'project.risk_created',
  RISK_CLOSED = 'project.risk_closed',
  DOCUMENT_UPLOADED = 'project.document_uploaded',
  DOCUMENT_RELEASED = 'project.document_released',
}

export interface ProjectDomainEventBase {
  eventType: ProjectDomainEventType;
  occurredAt: Date;
  projectId: string;
  tenantId: string | null;
  actorId: string | null;
  payload?: Record<string, any>;
}

export type ProjectDomainEvent = ProjectDomainEventBase;

export interface ProjectDomainEventSubscriber {
  /** Subscriber name for diagnostics. */
  readonly name: string;
  /** Handles the event. Errors are caught and logged, never propagated. */
  handle(event: ProjectDomainEvent): Promise<void> | void;
}
