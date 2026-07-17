import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Send, Bot, User, BookOpen, Sparkles, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

import DOMPurify from 'dompurify';

interface Message { role: 'user' | 'assistant'; content: string }

const ASSISTANTS = [
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  { id: 'design', label: 'Design', icon: Sparkles },
  { id: 'planning', label: 'Planning', icon: Sparkles },
  { id: 'manufacturing', label: 'Manufacturing', icon: Sparkles },
  { id: 'quality', label: 'Quality', icon: Sparkles },
  { id: 'management', label: 'Management', icon: Sparkles },
];

/** Sanitize AI content — strip all HTML tags for plain-text display */
function sanitizeText(raw: string): string {
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
}

export function AiAssistantPage() {
  const [activeAssistant, setActiveAssistant] = useState('knowledge');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: health } = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => api.get('/ai/health').then(r => r.data),
    refetchInterval: 30_000,
    retry: false,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post('/ai/chat', {
        message: content,
        context: activeAssistant,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        projectId: null,
        conversationId: null,
      });
      return res.data as { answer: string; intent: string; modelUsed: string };
    },
    onSuccess: (data, variables) => {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: sanitizeText(variables) },
        { role: 'assistant', content: sanitizeText(data.answer) },
      ]);
      setInput('');
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 429) toast.error('Rate limit exceeded. Please wait a moment.');
      else toast.error(err?.response?.data?.message ?? 'AI request failed');
      setMessages(prev => [...prev, { role: 'assistant', content: sanitizeText('⚠️ Sorry, I encountered an error. Please try again.') }]);
    },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(trimmed);
  };

  const handleAssistantChange = (id: string) => { setActiveAssistant(id); setMessages([]); };
  const isAiAvailable = health?.enabled && health?.available;

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <div className="flex items-center gap-2 text-sm">
          <Activity className={`w-4 h-4 ${isAiAvailable ? 'text-green-500' : 'text-gray-400'}`} />
          <span className={isAiAvailable ? 'text-green-600' : 'text-gray-500'}>
            {health === undefined ? 'Checking…' : isAiAvailable ? `Online (${health.model})` : 'AI Offline'}
          </span>
        </div>
      </div>
      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-56 flex-shrink-0">
          <Card className="h-full">
            <CardHeader><CardTitle className="text-sm">Assistants</CardTitle></CardHeader>
            <CardContent className="p-2">
              {ASSISTANTS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => handleAssistantChange(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeAssistant === id ? 'bg-mitra-50 text-mitra-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-mitra-600" />
                {ASSISTANTS.find(a => a.id === activeAssistant)?.label} Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Bot className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">How can I help you today?</p>
                  <p className="text-sm">Ask about {activeAssistant} processes, standards, or best practices.</p>
                  {!isAiAvailable && health !== undefined && (
                    <p className="text-xs mt-3 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">AI is currently disabled. Set AI_ENABLED=true in .env to activate.</p>
                  )}
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user' ? 'bg-mitra-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-mitra-600" />}
                      <span className="text-xs font-medium opacity-70">{msg.role === 'user' ? 'You' : 'AI'}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{sanitizeText(msg.content)}</p>
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 animate-pulse text-mitra-600" />
                      <span className="text-sm text-gray-500">Thinking…</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 border-t flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask the ${activeAssistant} assistant…`} className="flex-1 input-field" disabled={sendMessage.isPending} maxLength={2000} />
                <button type="submit" disabled={sendMessage.isPending || !input.trim()} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-4 h-4" /></button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
