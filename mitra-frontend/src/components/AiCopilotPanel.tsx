import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, BarChart3, FileText, Wand2, Search, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

interface AiCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SuggestionChip {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

const SUGGESTIONS: SuggestionChip[] = [
  { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Analyze Delays', prompt: 'Show me all delayed projects and identify root causes' },
  { icon: <FileText className="w-3.5 h-3.5" />, label: 'Explain BOM', prompt: 'Analyze BOM complexity and identify critical path items' },
  { icon: <Wand2 className="w-3.5 h-3.5" />, label: 'Generate Quote', prompt: 'Generate a quotation for the latest enquiry based on current material costs' },
  { icon: <Search className="w-3.5 h-3.5" />, label: 'Search Docs', prompt: 'Find documents related to project PRJ-1250' },
];

function GeometricAvatar({ isProcessing }: { isProcessing: boolean }) {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {/* Outer pulsing ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: '2px solid rgba(100, 255, 218, 0.6)',
        }}
        animate={isProcessing ? {
          scale: [1, 1.15, 1],
          opacity: [0.6, 1, 0.6],
        } : {
          scale: [1, 1.05, 1],
          opacity: [0.6, 0.8, 0.6],
        }}
        transition={isProcessing ? {
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        } : {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Inner radial gradient center */}
      <div
        className="w-10 h-10 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(100, 255, 218, 0.3) 0%, rgba(100, 255, 218, 0.05) 60%, transparent 100%)',
        }}
      />
      {/* Geometric core — three intersecting lines */}
      <svg width="24" height="24" viewBox="0 0 24 24" className="absolute">
        <line x1="12" y1="4" x2="12" y2="20" stroke="rgba(100, 255, 218, 0.5)" strokeWidth="1.5" />
        <line x1="4" y1="12" x2="20" y2="12" stroke="rgba(100, 255, 218, 0.5)" strokeWidth="1.5" />
        <line x1="6.34" y1="6.34" x2="17.66" y2="17.66" stroke="rgba(100, 255, 218, 0.3)" strokeWidth="1" />
        <line x1="17.66" y1="6.34" x2="6.34" y2="17.66" stroke="rgba(100, 255, 218, 0.3)" strokeWidth="1" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="rgba(100, 255, 218, 0.6)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function AiCopilotPanel({ isOpen, onClose }: AiCopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: text, intent: undefined });
      const answer = res.data?.answer ?? 'Unable to process request. Production intelligence systems are operational.';
      setMessages(prev => [...prev, { role: 'assistant', content: answer, timestamp: new Date() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `System error: ${err?.response?.data?.message ?? err?.message ?? 'Unknown communication failure'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ backgroundColor: 'rgba(10, 25, 47, 0.6)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: '360px',
              maxWidth: '100vw',
              background: 'linear-gradient(135deg, rgba(17, 34, 64, 0.95), rgba(10, 25, 47, 0.98))',
              borderLeft: '1px solid rgba(100, 255, 218, 0.3)',
              borderRadius: '12px 0 0 12px',
              boxShadow: isLoading
                ? '0 0 30px rgba(100, 255, 218, 0.2), -4px 0 20px rgba(0, 0, 0, 0.4)'
                : '0 0 20px rgba(100, 255, 218, 0.1), -4px 0 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(73, 86, 112, 0.4)' }}>
              <GeometricAvatar isProcessing={isLoading} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>
                  Production Intelligence Engine
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
                  <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    Engine Active. Awaiting instruction.
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(100, 255, 218, 0.1)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <GeometricAvatar isProcessing={false} />
                  <p className="text-xs mt-4 font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    Production Intelligence Engine
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                    Ready to process queries.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 relative flex items-center justify-center">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{
                            border: '1.5px solid rgba(100, 255, 218, 0.4)',
                            background: 'radial-gradient(circle, rgba(100, 255, 218, 0.2) 0%, transparent 70%)',
                          }}
                        />
                        <svg width="12" height="12" viewBox="0 0 24 24" className="absolute">
                          <line x1="12" y1="4" x2="12" y2="20" stroke="rgba(100, 255, 218, 0.5)" strokeWidth="1.5" />
                          <line x1="4" y1="12" x2="20" y2="12" stroke="rgba(100, 255, 218, 0.5)" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg-deep)' }}
                    >
                      <span>U</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? ''
                        : ''
                    }`}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: msg.role === 'user' ? 'var(--color-bg-deep)' : 'var(--color-text)',
                      backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : 'rgba(17, 34, 64, 0.8)',
                      border: msg.role === 'user' ? 'none' : '1px solid rgba(73, 86, 112, 0.4)',
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 relative flex items-center justify-center flex-shrink-0">
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ border: '1.5px solid rgba(100, 255, 218, 0.6)' }}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <svg width="12" height="12" viewBox="0 0 24 24" className="absolute">
                      <line x1="12" y1="4" x2="12" y2="20" stroke="rgba(100, 255, 218, 0.5)" strokeWidth="1.5" />
                      <line x1="4" y1="12" x2="20" y2="12" stroke="rgba(100, 255, 218, 0.5)" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                      backgroundColor: 'rgba(17, 34, 64, 0.8)',
                      border: '1px solid rgba(73, 86, 112, 0.4)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <div className="px-4 py-2 border-t" style={{ borderColor: 'rgba(73, 86, 112, 0.4)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Analysis Types
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(s.prompt)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(17, 34, 64, 0.6)',
                      border: '1px solid rgba(73, 86, 112, 0.4)',
                      color: 'var(--color-text)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(100, 255, 218, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(73, 86, 112, 0.4)';
                    }}
                  >
                    {s.icon}
                    <span className="truncate">{s.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t" style={{ borderColor: 'rgba(73, 86, 112, 0.4)' }}>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-bg-deep)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                  placeholder="Enter query or select analysis type."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--color-text)' }}
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="p-1.5 rounded-md flex-shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: input.trim() ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    opacity: input.trim() ? 1 : 0.4,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Send className="w-4 h-4" style={{ color: input.trim() ? 'var(--color-bg-deep)' : 'var(--color-text-secondary)' }} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Floating AI button (bottom-right)
export function AiFloatingButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  if (isOpen) return null;
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{
        background: 'linear-gradient(135deg, rgba(17, 34, 64, 0.95), rgba(10, 25, 47, 0.98))',
        border: '1px solid rgba(100, 255, 218, 0.3)',
        boxShadow: '0 0 20px rgba(100, 255, 218, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 1 }}
    >
      <div className="relative w-8 h-8 flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full absolute"
          style={{
            border: '1.5px solid rgba(100, 255, 218, 0.5)',
            background: 'radial-gradient(circle, rgba(100, 255, 218, 0.15) 0%, transparent 70%)',
          }}
        />
        <svg width="14" height="14" viewBox="0 0 24 24">
          <line x1="12" y1="4" x2="12" y2="20" stroke="rgba(100, 255, 218, 0.6)" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="rgba(100, 255, 218, 0.6)" strokeWidth="1.5" />
        </svg>
      </div>
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        Production Intelligence
      </span>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
    </motion.button>
  );
}
