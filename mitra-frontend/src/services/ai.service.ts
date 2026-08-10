import { api } from '../utils/api';
import {
  AiResponse, AiHealth, ChatMessage, CopilotCapability, CopilotChatResponse, CopilotDomain, CopilotSummary,
} from '../types/ai.types';
import { aiEvents } from '../events/ai.events';

export async function askAI(message: string, history: ChatMessage[] = []): Promise<AiResponse> {
  aiEvents.emit('ai:loading', { loading: true });
  try {
    const res = await api.post('/ai/chat', {
      message,
      history: history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    });
    const data: AiResponse = res.data;
    aiEvents.emit('ai:response', { response: data });
    return data;
  } catch (err: any) {
    const errorMsg = err?.response?.data?.message ?? err?.message ?? 'AI communication failure';
    aiEvents.emit('ai:error', { error: errorMsg });
    throw err;
  } finally {
    aiEvents.emit('ai:loading', { loading: false });
  }
}

export async function fetchAiHealth(): Promise<AiHealth> {
  const res = await api.get('/ai/health');
  return res.data;
}

export async function fetchCopilots(): Promise<CopilotSummary[]> {
  const res = await api.get('/ai/copilots');
  return res.data.data ?? [];
}

export async function fetchCopilotCapabilities(domain: CopilotDomain): Promise<CopilotCapability[]> {
  const res = await api.get(`/ai/copilots/${domain}`);
  return res.data.data ?? [];
}

export async function fetchCopilotSuggestions(domain: CopilotDomain): Promise<string[]> {
  const res = await api.get(`/ai/copilots/${domain}/suggestions`);
  return res.data.suggestions ?? [];
}

export async function sendCopilotChat(params: {
  domain: CopilotDomain;
  message: string;
  conversationId?: string;
  capability?: string;
  entityType?: string;
  entityId?: string;
  selectedProjectId?: string;
  history?: ChatMessage[];
}): Promise<CopilotChatResponse> {
  aiEvents.emit('ai:loading', { loading: true });
  try {
    const res = await api.post(`/ai/copilots/${params.domain}/chat`, {
      message: params.message,
      conversationId: params.conversationId,
      capability: params.capability,
      entityType: params.entityType,
      entityId: params.entityId,
      selectedProjectId: params.selectedProjectId,
      history: (params.history ?? []).slice(-10).map((m) => ({ role: m.role, content: m.content })),
    });
    const data: CopilotChatResponse = res.data;
    aiEvents.emit('ai:response', { response: data });
    return data;
  } catch (err: any) {
    const errorMsg = err?.response?.data?.message ?? err?.message ?? 'AI communication failure';
    aiEvents.emit('ai:error', { error: errorMsg });
    throw err;
  } finally {
    aiEvents.emit('ai:loading', { loading: false });
  }
}
