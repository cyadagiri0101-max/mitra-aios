export interface KnowledgeContext {
  entityType: string;
  entityId: string;
  tenantId: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeResult {
  suggestions?: string[];
  relatedEntities?: Array<{ type: string; id: string; label: string }>;
  insights?: string[];
}

export interface KnowledgeHook {
  name: string;
  onEntityAction(context: KnowledgeContext): Promise<KnowledgeResult | null>;
}

export interface AuditHook {
  name: string;
  onAuditEvent(event: Record<string, unknown>): Promise<void>;
}

export interface ContextBuilder {
  name: string;
  buildContext(entityType: string, entityId: string, tenantId: string | null): Promise<Record<string, unknown>>;
}

export interface DocumentHook {
  name: string;
  onDocumentGenerated(documentType: string, documentId: string, payload: Record<string, unknown>): Promise<void>;
}

export interface CopilotAction {
  actionId: string;
  label: string;
  description: string;
  handler(context: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface CopilotExtensionPoint {
  registerAction(action: CopilotAction): void;
  getActions(): CopilotAction[];
}
