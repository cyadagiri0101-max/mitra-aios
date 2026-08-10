export enum AiIntent {
  GENERAL = 'GENERAL',
  BOM_ANALYSIS = 'BOM_ANALYSIS',
  DRAWING_ANALYSIS = 'DRAWING_ANALYSIS',
  DELAY_RISK = 'DELAY_RISK',
  QUALITY_CHECK = 'QUALITY_CHECK',
  ROOT_CAUSE = 'ROOT_CAUSE',
  RECOMMENDATION = 'RECOMMENDATION',
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: AiIntent;
}

export interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

export interface AiResponse {
  answer: string;
  intent: AiIntent;
  context: Record<string, unknown>;
  modelUsed: string;
  processingMs: number;
  aiEnabled: boolean;
}

export interface AiHealth {
  enabled: boolean;
  available: boolean;
  model: string;
  ollamaVersion?: string;
  reason?: string;
}

export type CopilotDomain = 'engineering' | 'manufacturing' | 'quality' | 'service' | 'executive' | 'commercial' | 'project';

export interface CopilotSummary {
  domain: CopilotDomain;
  label: string;
  description: string;
  capabilityCount: number;
}

export interface CopilotCapability {
  key: string;
  title: string;
  description: string;
  promptKey: string;
  tools: string[];
  suggestedActions: string[];
  followUpQuestions: string[];
}

export interface CopilotReference {
  title: string;
  entityType: string;
  entityId: string;
  sourceDomain: string;
  similarity: number;
}

export interface CopilotChatResponse {
  answer: string;
  domain: CopilotDomain;
  task: string;
  promptTemplate: string;
  promptVersion: string;
  provider: string;
  modelUsed: string;
  confidence: number;
  references: CopilotReference[];
  toolsExecuted: Array<{ tool: string; domain: string; truncated: boolean; durationMs: number }>;
  injectionFlagged: boolean;
  fallbackUsed: boolean;
  contextSummary: string;
  conversationId?: string;
  processingMs?: number;
  capability: {
    key: string;
    title: string;
    description: string;
    promptKey: string;
  };
  suggestedActions: string[];
  followUpQuestions: string[];
}
