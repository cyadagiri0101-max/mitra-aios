import { useEffect, useMemo, useRef, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  Boxes,
  ChevronRight,
  FileSearch,
  Mic,
  MicOff,
  Send,
  Sparkles,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react';
import { detectEmotion, getLEDForEmotion } from '../../core/robot-engine/EmotionEngine';
import { planGesture } from '../../core/robot-engine/GestureEngine';
import { askAI } from '../../services/ai.service';
import { speak, stopSpeaking } from '../../services/voice.service';
import { useAiStore } from '../../store/ai.store';
import { useRobotStore } from '../../store/robot.store';
import { AiIntent } from '../../types/ai.types';
import { RobotAssistant } from '../Robot/RobotAssistant';

type Suggestion = {
  label: string;
  prompt: string;
  intent: AiIntent;
  icon: React.ElementType;
};

const suggestions: Suggestion[] = [
  {
    label: 'Analyze BOM',
    prompt: 'Analyze the latest BOM and identify material, lead time, and alternate part risks.',
    intent: AiIntent.BOM_ANALYSIS,
    icon: Boxes,
  },
  {
    label: 'Analyze Drawing',
    prompt: 'Review the latest drawing for tolerance, manufacturability, and release risks.',
    intent: AiIntent.DRAWING_ANALYSIS,
    icon: FileSearch,
  },
  {
    label: 'Predict Delays',
    prompt: 'Predict delay risks across active projects and rank the top blockers.',
    intent: AiIntent.DELAY_RISK,
    icon: TrendingUp,
  },
  {
    label: 'Root Cause',
    prompt: 'Find likely root causes for current production and quality exceptions.',
    intent: AiIntent.ROOT_CAUSE,
    icon: Wrench,
  },
  {
    label: 'Recommendations',
    prompt: 'Recommend the next best actions to keep projects on track today.',
    intent: AiIntent.RECOMMENDATION,
    icon: Sparkles,
  },
];

function inferIntent(prompt: string): AiIntent {
  const text = prompt.toLowerCase();
  if (text.includes('bom')) return AiIntent.BOM_ANALYSIS;
  if (text.includes('drawing')) return AiIntent.DRAWING_ANALYSIS;
  if (text.includes('delay') || text.includes('risk')) return AiIntent.DELAY_RISK;
  if (text.includes('quality') || text.includes('defect')) return AiIntent.QUALITY_CHECK;
  if (text.includes('root cause')) return AiIntent.ROOT_CAUSE;
  if (text.includes('recommend')) return AiIntent.RECOMMENDATION;
  return AiIntent.GENERAL;
}

function fallbackResponse(prompt: string) {
  const intent = inferIntent(prompt);
  switch (intent) {
    case AiIntent.BOM_ANALYSIS:
      return 'BOM risk review is ready. Focus on long-lead electronic items, single-source parts, and any material lines without approved alternates.';
    case AiIntent.DRAWING_ANALYSIS:
      return 'Drawing review is ready. Check tolerance stackups, missing datum references, and revision-release alignment before manufacturing release.';
    case AiIntent.DELAY_RISK:
      return 'Delay risk is elevated for projects with pending drawings, material lead-time variance, and unresolved quality holds. PRJ-1248 should be reviewed first.';
    case AiIntent.QUALITY_CHECK:
      return 'Quality focus areas are inspection backlog, repeat rework reasons, and overdue CAPA verification. I recommend closing the highest recurrence items first.';
    case AiIntent.ROOT_CAUSE:
      return 'Likely root causes cluster around supplier lead-time drift, late drawing release, and rework loops. Validate with the latest NCR and CAPA records.';
    case AiIntent.RECOMMENDATION:
      return 'Recommended actions: expedite critical material, reallocate one manufacturing slot, parallelize inspection, and release pending drawings before noon.';
    default:
      return 'I am online. I can help analyze BOMs, drawings, project risk, quality exceptions, and production recommendations.';
  }
}

export function AIDock() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useAiStore(s => s.messages);
  const isLoading = useAiStore(s => s.isLoading);
  const addMessage = useAiStore(s => s.addMessage);
  const setLoading = useAiStore(s => s.setLoading);
  const robotState = useRobotStore(s => s.state);
  const robotEmotion = useRobotStore(s => s.emotion);
  const robotSpeaking = useRobotStore(s => s.speaking);
  const voiceEnabled = useRobotStore(s => s.config.voiceEnabled);
  const setRobotState = useRobotStore(s => s.setState);
  const setRobotEmotion = useRobotStore(s => s.setEmotion);
  const setRobotGesture = useRobotStore(s => s.setGesture);
  const setRobotSpeaking = useRobotStore(s => s.setSpeaking);
  const setRobotListening = useRobotStore(s => s.setListening);
  const setRobotTranscript = useRobotStore(s => s.setTranscript);
  const setRobotLastResponse = useRobotStore(s => s.setLastResponse);
  const led = getLEDForEmotion(robotEmotion);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const statusLabel = useMemo(() => {
    if (listening) return 'Listening';
    if (isLoading || robotState === 'thinking') return 'Thinking';
    if (robotSpeaking) return 'Speaking';
    if (robotState === 'warning' || robotState === 'alert') return 'Attention';
    return 'Online';
  }, [isLoading, listening, robotSpeaking, robotState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!transcript.trim()) return;
    setInput(transcript);
    setRobotTranscript(transcript);
  }, [setRobotTranscript, transcript]);

  useEffect(() => {
    setRobotListening(listening);
    if (listening) {
      setRobotState('listening');
      setRobotEmotion('neutral');
      setRobotGesture('scan');
    } else if (robotState === 'listening') {
      setRobotState('idle');
      setRobotGesture('idle');
    }
  }, [listening, robotState, setRobotEmotion, setRobotGesture, setRobotListening, setRobotState]);

  const finishSpeech = () => {
    setRobotSpeaking(false);
    setRobotState('success');
    setRobotEmotion('success');
    setRobotGesture('celebrate');
    window.setTimeout(() => {
      setRobotState('idle');
      setRobotGesture('idle');
    }, 1100);
  };

  const sendMessage = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || isLoading) return;

    if (listening) {
      await SpeechRecognition.stopListening();
    }

    stopSpeaking();
    resetTranscript();
    setInput('');
    setLoading(true);
    setRobotState('thinking');
    setRobotEmotion('thinking');
    setRobotGesture('think');
    addMessage({ role: 'user', content: text, timestamp: new Date(), intent: inferIntent(text) });

    let answer = '';
    let intent = inferIntent(text);

    try {
      const response = await askAI(text, useAiStore.getState().messages);
      answer = response.answer || fallbackResponse(text);
      intent = response.intent ?? intent;
    } catch {
      answer = fallbackResponse(text);
      setRobotState('warning');
    } finally {
      setLoading(false);
    }

    const emotion = detectEmotion(answer);
    const gesture = planGesture(`${text} ${answer}`);
    setRobotLastResponse(answer);
    setRobotEmotion(emotion);
    setRobotGesture(gesture);
    addMessage({ role: 'assistant', content: answer, timestamp: new Date(), intent });

    if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speak(
        answer,
        () => {
          setRobotState('speaking');
          setRobotSpeaking(true);
        },
        finishSpeech,
      );
    } else {
      finishSpeech();
    }
  };

  const toggleListening = async () => {
    if (!browserSupportsSpeechRecognition) {
      setRobotState('warning');
      setRobotEmotion('warning');
      setRobotGesture('alert');
      return;
    }

    if (listening) {
      await SpeechRecognition.stopListening();
      return;
    }

    stopSpeaking();
    resetTranscript();
    setRobotTranscript('');
    setRobotState('listening');
    setRobotEmotion('neutral');
    setRobotGesture('scan');
    await SpeechRecognition.startListening({ continuous: false, language: 'en-IN' });
  };

  return (
    <>
      <motion.button
        className="fixed bottom-6 right-6 z-50 xl:hidden inline-flex items-center gap-2 rounded-lg border px-4 py-3 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(7, 16, 32, 0.96), rgba(18, 31, 57, 0.96))',
          borderColor: 'rgba(100, 255, 218, 0.34)',
          color: 'var(--color-text)',
          boxShadow: '0 0 28px rgba(0, 180, 216, 0.24)',
        }}
        onClick={() => setMobileOpen(true)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Bot className="h-5 w-5" style={{ color: led.core }} />
        <span className="text-sm font-semibold">MITRA AI</span>
      </motion.button>

      <AnimatePresence>
        {(mobileOpen || true) && (
          <motion.aside
            className={`${mobileOpen ? 'flex' : 'hidden'} xl:flex fixed right-4 top-20 bottom-10 z-40 w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border`}
            style={{
              background: 'linear-gradient(180deg, rgba(6, 15, 31, 0.98), rgba(10, 25, 47, 0.98))',
              borderColor: 'rgba(73, 86, 112, 0.72)',
              boxShadow: `0 0 34px ${led.core}26, -12px 0 40px rgba(0, 0, 0, 0.32)`,
            }}
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(73, 86, 112, 0.55)' }}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: `${led.core}66`, backgroundColor: `${led.core}18` }}>
                  <Bot className="h-5 w-5" style={{ color: led.core }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold" style={{ color: 'var(--color-text)' }}>MITRA AI Core</p>
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: led.core, boxShadow: `0 0 10px ${led.core}` }} />
                    {statusLabel}
                  </p>
                </div>
              </div>
              <button
                className="rounded-md p-1.5 transition-colors xl:hidden"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close MITRA AI dock"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative h-[245px] border-b" style={{ borderColor: 'rgba(73, 86, 112, 0.45)' }}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(0,180,216,0.18),transparent_48%)]" />
              <RobotAssistant className="absolute inset-0" compact />
            </div>

            <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(73, 86, 112, 0.45)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Hello Admin!</p>
              <p className="mt-1 text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
                Production intelligence is online for BOMs, drawings, quality, delay risk, and dispatch decisions.
              </p>
            </div>

            <div className="space-y-2 border-b p-3" style={{ borderColor: 'rgba(73, 86, 112, 0.45)' }}>
              {suggestions.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => void sendMessage(item.prompt)}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all hover:translate-x-0.5"
                    style={{
                      backgroundColor: 'rgba(17, 34, 64, 0.58)',
                      borderColor: 'rgba(73, 86, 112, 0.55)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: `${led.core}16`, color: led.core }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {messages.length === 0 && !isLoading && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Sparkles className="mb-3 h-6 w-6" style={{ color: led.core }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Ready for today’s production loop.</p>
                  <p className="mt-1 max-w-[240px] text-xs leading-5" style={{ color: 'var(--color-text-secondary)' }}>
                    Ask for risks, summaries, exceptions, or next actions.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {messages.map((message, index) => (
                  <motion.div
                    key={`${message.timestamp.toISOString()}-${index}`}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className="max-w-[86%] rounded-lg border px-3 py-2 text-sm leading-5"
                      style={{
                        backgroundColor: message.role === 'user' ? 'rgba(100, 255, 218, 0.95)' : 'rgba(17, 34, 64, 0.78)',
                        borderColor: message.role === 'user' ? 'rgba(100, 255, 218, 0.3)' : 'rgba(73, 86, 112, 0.55)',
                        color: message.role === 'user' ? 'var(--color-bg-deep)' : 'var(--color-text)',
                      }}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'rgba(73, 86, 112, 0.55)', color: 'var(--color-text-secondary)' }}>
                    <AlertTriangle className="h-4 w-4 animate-pulse" style={{ color: led.core }} />
                    Analyzing production context...
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3" style={{ borderColor: 'rgba(73, 86, 112, 0.55)' }}>
              <div className="flex items-center gap-2 rounded-lg border px-2 py-2" style={{ backgroundColor: 'rgba(3, 10, 24, 0.8)', borderColor: 'rgba(73, 86, 112, 0.68)' }}>
                <button
                  type="button"
                  onClick={() => void toggleListening()}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors"
                  style={{
                    backgroundColor: listening ? 'rgba(239, 68, 68, 0.18)' : `${led.core}18`,
                    color: listening ? 'var(--color-error)' : led.core,
                  }}
                  aria-label={listening ? 'Stop listening' : 'Start listening'}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <input
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') void sendMessage(input);
                  }}
                  placeholder="Ask MITRA..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--color-text)' }}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-all disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ backgroundColor: led.core, color: 'var(--color-bg-deep)' }}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
