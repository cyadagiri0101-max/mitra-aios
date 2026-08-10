import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import {
  Activity,
  BadgeCheck,
  Bot,
  BookOpen,
  BrainCircuit,
  Building2,
  Factory,
  FileText,
  Gauge,
  History,
  Lightbulb,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
} from 'lucide-react';
import { api } from '../utils/api';
import {
  fetchCopilotCapabilities, fetchCopilotSuggestions, sendCopilotChat,
} from '../services/ai.service';
import { CopilotCapability, CopilotChatResponse, CopilotDomain } from '../types/ai.types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';

type Message = { role: 'user' | 'assistant'; content: string; response?: CopilotChatResponse };
type Conversation = { id: string; title?: string; messageCount?: number; updatedAt?: string };

const DOMAINS: Array<{ id: CopilotDomain; label: string; icon: React.ElementType }> = [
  { id: 'engineering', label: 'Engineering', icon: FileText },
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory },
  { id: 'quality', label: 'Quality', icon: ShieldCheck },
  { id: 'service', label: 'Service', icon: Wrench },
  { id: 'executive', label: 'Executive', icon: Building2 },
  { id: 'commercial', label: 'Commercial', icon: Gauge },
  { id: 'project', label: 'Project', icon: BookOpen },
];

function sanitizeText(raw: string): string {
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
}

function confidenceTone(confidence?: number) {
  if ((confidence ?? 0) >= 0.8) return 'text-emerald-200 border-emerald-400/30 bg-emerald-400/10';
  if ((confidence ?? 0) >= 0.55) return 'text-amber-100 border-amber-400/30 bg-amber-400/10';
  return 'text-rose-100 border-rose-400/30 bg-rose-400/10';
}

function capabilityFromResponse(response: CopilotChatResponse): CopilotCapability {
  return {
    key: response.capability.key,
    title: response.capability.title,
    description: response.capability.description,
    promptKey: response.capability.promptKey,
    tools: response.toolsExecuted?.map((tool) => tool.tool) ?? [],
    suggestedActions: response.suggestedActions ?? [],
    followUpQuestions: response.followUpQuestions ?? [],
  };
}

export function AiAssistantPage() {
  const [domain, setDomain] = useState<CopilotDomain>('engineering');
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<CopilotCapability | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: health } = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => api.get('/ai/health').then((r) => r.data),
    refetchInterval: 30_000,
    retry: false,
  });

  const { data: capabilities = [] } = useQuery({
    queryKey: ['copilot-capabilities', domain],
    queryFn: () => fetchCopilotCapabilities(domain),
    staleTime: 5 * 60 * 1000,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['copilot-suggestions', domain],
    queryFn: () => fetchCopilotSuggestions(domain),
    staleTime: 5 * 60 * 1000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['copilot-conversations'],
    queryFn: () => api.get('/ai/copilot/conversations', { params: { limit: 10 } }).then((r) => r.data as Conversation[]),
    staleTime: 60_000,
  });

  const activeDomain = DOMAINS.find((item) => item.id === domain) ?? DOMAINS[0];
  const ActiveDomainIcon = activeDomain.icon;
  const references = useMemo(() => [...messages].reverse().find((message) => message.response?.references?.length)?.response?.references ?? [], [messages]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, capability }: { content: string; capability?: CopilotCapability }) => {
      const history: any[] = messages.slice(-10).map((message) => ({ role: message.role, content: message.content }));
      return sendCopilotChat({
        domain,
        message: content,
        conversationId,
        capability: capability?.key,
        history,
      });
    },
    onSuccess: (data, variables) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: sanitizeText(variables.content) },
        { role: 'assistant', content: sanitizeText(data.answer), response: data },
      ]);
      setInput('');
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'The Copilot request failed. Check your connection and permissions, then retry.' }]);
    },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const submit = (content = input, capability?: CopilotCapability) => {
    const trimmed = content.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate({ content: trimmed, capability });
  };

  const isAiAvailable = health?.enabled && health?.available;

  return (
    <div className="space-y-5 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Enterprise AI Copilot</h1>
          <p className="mt-1 text-sm text-slate-400">Seven domain copilots with capability-aware prompts, auto tools, citations, confidence, and recommended actions.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm">
          <Activity className={`h-4 w-4 ${isAiAvailable ? 'text-emerald-300' : 'text-slate-500'}`} />
          <span className={isAiAvailable ? 'text-emerald-200' : 'text-slate-400'}>{health === undefined ? 'Checking' : isAiAvailable ? `Online (${health.model})` : 'Advisory fallback'}</span>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <Card className="rounded-lg min-h-0">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BrainCircuit className="h-4 w-4 text-cyan-200" /> Copilots</CardTitle></CardHeader>
          <CardContent className="space-y-2 p-3">
            {DOMAINS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setDomain(id); setMessages([]); setConversationId(undefined); setSelectedCapability(undefined); }} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${domain === id ? 'border-cyan-300/60 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-slate-950/40 text-slate-300 hover:border-white/20'}`}>
                <Icon className="h-4 w-4" /> <span className="truncate">{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg flex min-h-0 flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2"><ActiveDomainIcon className="h-5 w-5 text-cyan-200" /> {activeDomain.label} Copilot</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                <Bot className="mb-4 h-12 w-12 text-cyan-200/70" />
                <p className="text-lg font-semibold text-white">Ask for an advisory, source-grounded answer.</p>
                <p className="mt-1 max-w-md text-sm">Capabilities are detected from your question and route to the right prompt and tools. Responses include references, confidence, and recommended actions.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {(selectedCapability ? [selectedCapability.title, ...selectedCapability.followUpQuestions] : suggestions.slice(0, 8)).map((suggestion) => (
                    <button key={suggestion} onClick={() => submit(suggestion, selectedCapability)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300/40">
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[84%] rounded-lg border px-4 py-3 ${message.role === 'user' ? 'border-cyan-300/30 bg-cyan-500/15 text-white' : 'border-white/10 bg-slate-950/70 text-slate-100'}`}>
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-cyan-200" />}
                    <span>{message.role === 'user' ? 'You' : `MITRA ${activeDomain.label} Copilot`}</span>
                    {message.response?.capability && <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">{message.response.capability.title}</span>}
                    {message.response?.confidence !== undefined && <span className={`ml-auto rounded-full border px-2 py-0.5 ${confidenceTone(message.response.confidence)}`}>{Math.round(message.response.confidence * 100)}%</span>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  {message.response && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
                      <div className="text-xs text-slate-500">Prompt: {message.response.promptTemplate}@{message.response.promptVersion} · Model: {message.response.modelUsed ?? 'advisory'} · {message.response.toolsExecuted?.length ?? 0} tool(s)</div>
                      {message.response.injectionFlagged && <div className="text-xs text-rose-300">Prompt-injection patterns detected; the request was not sent to a model.</div>}
                      {message.response.fallbackUsed && <div className="text-xs text-amber-200">Model fallback used for this answer.</div>}
                      {message.response.suggestedActions?.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-xs text-cyan-200"><Lightbulb className="h-3 w-3" /> Recommended actions</div>
                          <div className="flex flex-wrap gap-1.5">
                            {message.response.suggestedActions.map((action) => (
                              <button key={action} onClick={() => submit(action, capabilityFromResponse(message.response!))} className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100 hover:border-cyan-300/60">
                                {action}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {message.response.followUpQuestions?.length > 0 && (
                        <div>
                          <div className="mb-1 text-xs text-slate-500">Follow-up questions</div>
                          <div className="flex flex-wrap gap-1.5">
                            {message.response.followUpQuestions.map((question) => (
                              <button key={question} onClick={() => submit(question)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:border-white/30">
                                {question}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sendMessage.isPending && <div className="text-sm text-slate-400"><Bot className="mr-2 inline h-4 w-4 animate-pulse text-cyan-200" /> Gathering context and sources...</div>}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="flex-shrink-0 border-t border-white/10 p-4">
            <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex gap-2">
              <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Ask the ${activeDomain.label} Copilot...`} className="input-field flex-1" disabled={sendMessage.isPending} maxLength={4000} />
              <button type="submit" disabled={sendMessage.isPending || !input.trim()} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </Card>

        <div className="space-y-5 min-h-0 overflow-y-auto">
          <Card className="rounded-lg">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-cyan-200" /> {activeDomain.label} Capabilities</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {capabilities.length === 0 && <p className="text-sm text-slate-500">Capabilities appear here.</p>}
              {capabilities.slice(0, 10).map((capability) => (
                <button key={capability.key} onClick={() => { setSelectedCapability(capability); submit(capability.title, capability); }} title={capability.description} className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${selectedCapability?.key === capability.key ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 bg-slate-950/50 hover:border-white/20'}`}>
                  <div className="text-slate-100">{capability.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{capability.tools.join(', ')}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BadgeCheck className="h-4 w-4 text-emerald-200" /> Knowledge References</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {references.length === 0 && <p className="text-sm text-slate-500">Citations appear here after a source-backed answer.</p>}
              {references.map((ref) => (
                <div key={`${ref.entityType}:${ref.entityId}`} className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm">
                  <div className="font-medium text-white">{ref.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{ref.sourceDomain} / {ref.entityType}</div>
                  <div className="mt-2 text-xs text-cyan-200">Similarity {Math.round((ref.similarity ?? 0) * 100)}%</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4 text-cyan-200" /> Conversation History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {conversations.length === 0 && <p className="text-sm text-slate-500">Scoped conversations will appear here.</p>}
              {conversations.map((conversation) => (
                <button key={conversation.id} onClick={() => setConversationId(conversation.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${conversation.id === conversationId ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 bg-slate-950/50'}`}>
                  <div className="flex items-center gap-2 text-slate-100"><MessageSquare className="h-4 w-4" /> <span className="truncate">{conversation.title ?? 'Conversation'}</span></div>
                  <div className="mt-1 text-xs text-slate-500">{conversation.messageCount ?? 0} messages</div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
