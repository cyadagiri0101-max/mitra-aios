import { create } from 'zustand';
import { ChatMessage, AiResponse, AiHealth, AiIntent } from '../types/ai.types';

interface AiStore {
  messages: ChatMessage[];
  isLoading: boolean;
  health: AiHealth | null;
  addMessage: (message: ChatMessage) => void;
  addResponse: (response: AiResponse) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setHealth: (health: AiHealth) => void;
}

export const useAiStore = create<AiStore>((set) => ({
  messages: [],
  isLoading: false,
  health: null,
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  addResponse: (response) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          role: 'assistant',
          content: response.answer,
          timestamp: new Date(),
          intent: response.intent ?? AiIntent.GENERAL,
        },
      ],
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
  setHealth: (health) => set({ health }),
}));
