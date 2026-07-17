import { api } from '../utils/api';
import { AiResponse, AiHealth, ChatMessage } from '../types/ai.types';
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
