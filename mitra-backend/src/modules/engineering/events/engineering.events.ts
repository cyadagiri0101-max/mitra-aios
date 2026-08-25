/**
 * Engineering Domain events + AI-readiness event definitions.
 *
 * The platform does NOT perform AI inference. These typed events are the
 * integration points the future AI layer subscribes to (similar drawing
 * search, BOM recommendations, material suggestions, design rule
 * validation, knowledge extraction, document indexing, embedding
 * generation, knowledge graph updates).
 */

export enum EngineeringDomainEventType {
  // Drawing events
  DRAWING_CREATED = 'engineering.drawing.created',
  DRAWING_REVISION_UPLOADED = 'engineering.drawing.revision_uploaded',
  DRAWING_CHECKED_OUT = 'engineering.drawing.checked_out',
  DRAWING_CHECKED_IN = 'engineering.drawing.checked_in',
  DRAWING_RELEASED = 'engineering.drawing.released',
  DRAWING_STATUS_CHANGED = 'engineering.drawing.status_changed',

  // BOM events
  BOM_CREATED = 'engineering.bom.created',
  BOM_REVISIONED = 'engineering.bom.revisioned',
  BOM_RELEASED = 'engineering.bom.released',
  BOM_ITEM_CHANGED = 'engineering.bom.item_changed',
  BOM_SUBSTITUTION_CHANGED = 'engineering.bom.substitution_changed',

  // Change events
  CHANGE_REQUESTED = 'engineering.change.requested',
  CHANGE_APPROVED = 'engineering.change.approved',
  CHANGE_RELEASED = 'engineering.change.released',
  CHANGE_NOTICE_ISSUED = 'engineering.change.notice_issued',

  // Process planning events
  ROUTING_CREATED = 'engineering.routing.created',
  ROUTING_RELEASED = 'engineering.routing.released',
  ROUTING_VERSIONED = 'engineering.routing.versioned',

  // Review events
  REVIEW_REQUESTED = 'engineering.review.requested',
  REVIEW_DECIDED = 'engineering.review.decided',
  REVIEW_ASSIGNED = 'engineering.review.assigned',

  // Document events
  DOCUMENT_UPLOADED = 'engineering.document.uploaded',
  DOCUMENT_VERSIONED = 'engineering.document.versioned',

  // Manufacturing events (Sprint 2.4 MES — Phase 10). Same outbox/bus.
  WORK_ORDER_CREATED = 'manufacturing.work_order.created',
  WORK_ORDER_RELEASED = 'manufacturing.work_order.released',
  WORK_ORDER_STARTED = 'manufacturing.work_order.started',
  WORK_ORDER_PAUSED = 'manufacturing.work_order.paused',
  WORK_ORDER_RESUMED = 'manufacturing.work_order.resumed',
  WORK_ORDER_HOLD = 'manufacturing.work_order.hold',
  WORK_ORDER_COMPLETED = 'manufacturing.work_order.completed',
  WORK_ORDER_CANCELLED = 'manufacturing.work_order.cancelled',
  WORK_ORDER_REWORK = 'manufacturing.work_order.rework',
  WORK_ORDER_SCRAPPED = 'manufacturing.work_order.scrapped',
  JOB_STARTED = 'manufacturing.job.started',
  JOB_PAUSED = 'manufacturing.job.paused',
  JOB_RESUMED = 'manufacturing.job.resumed',
  JOB_HOLD = 'manufacturing.job.hold',
  JOB_COMPLETED = 'manufacturing.job.completed',
  JOB_CANCELLED = 'manufacturing.job.cancelled',
  JOB_REWORK = 'manufacturing.job.rework',
  JOB_SCRAPPED = 'manufacturing.job.scrapped',
  MATERIAL_RESERVED = 'manufacturing.material.reserved',
  MATERIAL_CONSUMED = 'manufacturing.material.consumed',
  MATERIAL_SHORTAGE = 'manufacturing.material.shortage',
  MATERIAL_VARIANCE = 'manufacturing.material.variance',
  MACHINE_STOPPED = 'manufacturing.machine.stopped',
  MACHINE_MAINTENANCE = 'manufacturing.machine.maintenance',
  PRODUCTION_DELAYED = 'manufacturing.production.delayed',
  INSPECTION_FAILED = 'manufacturing.inspection.failed',
  NCR_RAISED = 'manufacturing.ncr.raised',
  NCR_CLOSED = 'manufacturing.ncr.closed',
  SCHEDULE_ASSIGNED = 'manufacturing.schedule.assigned',

  // Quality events (Sprint 2.5 QMS). Same transactional outbox/event bus.
  INSPECTION_PLAN_CREATED = 'quality.inspection_plan.created',
  INSPECTION_PASSED = 'quality.inspection.passed',
  QUALITY_INSPECTION_FAILED = 'quality.inspection.failed',
  SUPPLIER_INSPECTION_CREATED = 'quality.supplier_inspection.created',
  CONTROL_PLAN_CREATED = 'quality.control_plan.created',
  FMEA_CREATED = 'quality.fmea.created',
  PPAP_APQP_CREATED = 'quality.ppap_apqp.created',
  PPAP_APPROVED = 'quality.ppap.approved',
  GAUGE_CREATED = 'quality.gauge.created',
  CALIBRATION_DUE = 'quality.calibration.due',
  GAUGE_EXPIRED = 'quality.gauge.expired',
  MSA_STUDY_CREATED = 'quality.msa_study.created',
  CAPA_OPENED = 'quality.capa.opened',
  CAPA_CLOSED = 'quality.capa.closed',
  CUSTOMER_COMPLAINT_OPENED = 'quality.customer_complaint.opened',

  // Dispatch & Logistics events (Sprint M5)
  DISPATCH_CREATED = 'dispatch.created',
  DISPATCH_PACKED = 'dispatch.packed',
  DISPATCH_SHIPPED = 'dispatch.shipped',
  DISPATCH_DELIVERED = 'dispatch.delivered',
  DISPATCH_CANCELLED = 'dispatch.cancelled',

  // Service & Lifecycle events (Sprint M5)
  SERVICE_INSTALLATION_COMPLETED = 'service.installation.completed',
  SERVICE_WARRANTY_ACTIVATED = 'service.warranty.activated',
  SERVICE_WARRANTY_CLAIM_ADJUDICATED = 'service.warranty_claim.adjudicated',

  // Enterprise Portfolio Orchestration events (M12.5 Sprint 3)
  PORTFOLIO_ALLOCATION_CREATED = 'engineering.portfolio.allocation_created',
  PORTFOLIO_ALLOCATION_STATUS_UPDATED = 'engineering.portfolio.allocation_status_updated',
  PORTFOLIO_SNAPSHOT_CREATED = 'engineering.portfolio.snapshot_created',
}

/** Generic engineering payload — always carries the owning project id. */
export interface EngineeringDomainEventPayload {
  projectId?: string | null;
  entityId?: string;
  entityNumber?: string | null;
  [key: string]: any;
}

export interface EngineeringDomainEvent {
  eventType: EngineeringDomainEventType;
  occurredAt: Date;
  tenantId?: string | null;
  actorId?: string | null;
  payload: EngineeringDomainEventPayload;
}

export interface EngineeringDomainEventSubscriber {
  name: string;
  handle(event: EngineeringDomainEvent): Promise<void> | void;
}

/** AI hook codes registered in the engineering_ai_hooks table. */
export const ENGINEERING_AI_HOOKS = {
  SIMILAR_DRAWING_SEARCH: 'SIMILAR_DRAWING_SEARCH',
  BOM_RECOMMENDATION: 'BOM_RECOMMENDATION',
  MATERIAL_SUGGESTION: 'MATERIAL_SUGGESTION',
  DESIGN_RULE_VALIDATION: 'DESIGN_RULE_VALIDATION',
  ENGINEERING_KNOWLEDGE_EXTRACTION: 'ENGINEERING_KNOWLEDGE_EXTRACTION',
  ENGINEERING_DOCUMENT_INDEXING: 'ENGINEERING_DOCUMENT_INDEXING',
  EMBEDDING_GENERATION: 'EMBEDDING_GENERATION',
  KNOWLEDGE_GRAPH_UPDATE: 'KNOWLEDGE_GRAPH_UPDATE',
} as const;
