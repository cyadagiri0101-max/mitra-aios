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
