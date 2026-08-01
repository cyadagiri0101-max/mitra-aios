/**
 * AIWorkspaceContext
 *
 * The single integration layer that connects:
 *   AICommandBar → RobotStateMachine (via useRobotStore) + ai.service
 *   AIActionCenter → action queue + robot feedback
 *   AIExecutionPreview → confirmation → action execution
 *
 * Exposes `useAIWorkspace()` to any component inside <AIWorkspaceProvider>.
 *
 * Robot state mapping:
 *   command.action()           → greeting → idle   (direct, 1.2s)
 *   prompt (analysis/quality)  → thinking → speaking → success → idle
 *   prompt (production/plan)   → searching → speaking → success → idle
 *   executeAction()            → presenting → success/warning → idle
 *
 * ⌘K integration:
 *   Pass `openCommandBar` to Header's `onSearchOpen` prop.
 *   The provider itself does NOT add a global keydown listener;
 *   delegation via the existing Header handler is sufficient and
 *   avoids double-firing.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { detectEmotion } from '../core/robot-engine/EmotionEngine';
import { planGesture } from '../core/robot-engine/GestureEngine';
import { askAI } from '../services/ai.service';
import aiCommandService from '../services/aiCommandService';
import { speak, stopSpeaking } from '../services/voice.service';
import { useAiStore } from '../store/ai.store';
import { useRobotStore } from '../store/robot.store';
import { AiIntent } from '../types/ai.types';
import type {
  AIAction,
  Command,
  CommandCategory,
} from '../components/AI/workspace/ai.workspace.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferIntent(prompt: string): AiIntent {
  const t = prompt.toLowerCase();
  if (t.includes('bom')) return AiIntent.BOM_ANALYSIS;
  if (t.includes('drawing')) return AiIntent.DRAWING_ANALYSIS;
  if (t.includes('delay') || t.includes('risk')) return AiIntent.DELAY_RISK;
  if (t.includes('quality') || t.includes('defect')) return AiIntent.QUALITY_CHECK;
  if (t.includes('root cause')) return AiIntent.ROOT_CAUSE;
  if (t.includes('recommend')) return AiIntent.RECOMMENDATION;
  return AiIntent.GENERAL;
}

function fallback(prompt: string): string {
  const t = prompt.toLowerCase();
  if (t.includes('bom'))
    return 'BOM risk review ready. Prioritise long-lead, single-source, and no-alternate items first.';
  if (t.includes('drawing'))
    return 'Drawing review ready. Verify tolerance stackups, datum references, and revision alignment before release.';
  if (t.includes('delay') || t.includes('risk'))
    return 'Elevated delay risk detected across active projects. PRJ-1248 is the highest priority.';
  if (t.includes('quality') || t.includes('defect'))
    return 'Quality focus areas: inspection backlog, repeat rework reasons, and overdue CAPA verification.';
  if (t.includes('root cause'))
    return 'Root causes cluster around supplier lead-time drift, late drawing release, and rework loops.';
  if (t.includes('recommend'))
    return 'Recommended: expedite critical materials, reallocate one manufacturing slot, parallelize inspection.';
  if (t.includes('dispatch') || t.includes('shipping'))
    return 'Dispatch risk: three orders have material holds unresolved. Review DPT-0441, DPT-0449, and DPT-0451.';
  if (t.includes('maintenance'))
    return 'Maintenance forecast ready. Machine M-07 is approaching scheduled service within 48 hours.';
  return 'I am online. I can help with BOM analysis, drawing review, quality, delay risk, and production decisions.';
}

/** Initial robot state driven by command category */
function categoryToRobotState(category: CommandCategory) {
  if (category === 'production' || category === 'planning')
    return { state: 'searching' as const, gesture: 'scan' as const };
  if (category === 'navigation')
    return { state: 'greeting' as const, gesture: 'wave' as const };
  return { state: 'thinking' as const, gesture: 'think' as const };
}

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AIWorkspaceContextValue {
  // ── Command bar ─────────────────────────────────────────────────────────
  isCommandBarOpen: boolean;
  recentCommandIds: string[];
  openCommandBar: () => void;
  closeCommandBar: () => void;
  /**
   * Central integration method.
   * Wires AICommandBar selection → robot state machine → ai.service → TTS.
   */
  handleCommand: (command: Command) => Promise<void>;

  // ── Action queue ────────────────────────────────────────────────────────
  actions: AIAction[];
  addAction: (action: AIAction) => void;
  executeAction: (id: string) => Promise<void>;
  cancelAction: (id: string) => void;
  retryAction: (id: string) => Promise<void>;
  clearCompletedActions: () => void;

  // ── Execution preview ───────────────────────────────────────────────────
  executionPreview: AIAction | null;
  isExecutingPreviewId: string | null;
  openExecutionPreview: (action: AIAction) => void;
  closeExecutionPreview: () => void;
  /** Called by AIExecutionPreview when user clicks Confirm */
  confirmExecution: (id: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AIWorkspaceContext = createContext<AIWorkspaceContextValue | null>(null);

export function useAIWorkspace(): AIWorkspaceContextValue {
  const ctx = useContext(AIWorkspaceContext);
  if (!ctx) throw new Error('useAIWorkspace must be used inside <AIWorkspaceProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AIWorkspaceProvider({ children }: { children: ReactNode }) {
  // ── Robot store selectors ────────────────────────────────────────────────
  const setRobotState    = useRobotStore(s => s.setState);
  const setRobotEmotion  = useRobotStore(s => s.setEmotion);
  const setRobotGesture  = useRobotStore(s => s.setGesture);
  const setRobotSpeaking = useRobotStore(s => s.setSpeaking);
  const setRobotLastResponse = useRobotStore(s => s.setLastResponse);

  // ── AI store selectors ────────────────────────────────────────────────────
  const addAiMessage = useAiStore(s => s.addMessage);
  const setAiLoading = useAiStore(s => s.setLoading);

  // ── Local state ──────────────────────────────────────────────────────────
  const [isCommandBarOpen, setCommandBarOpen] = useState(false);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([]);
  const [actions, setActions] = useState<AIAction[]>([]);
  const [executionPreview, setExecutionPreview] = useState<AIAction | null>(null);
  const [isExecutingPreviewId, setExecutingPreviewId] = useState<string | null>(null);

  // Prevent concurrent command executions
  const isProcessingRef = useRef(false);

  // ── Command bar ──────────────────────────────────────────────────────────

  const openCommandBar = useCallback(() => setCommandBarOpen(true), []);
  const closeCommandBar = useCallback(() => setCommandBarOpen(false), []);

  // ── Action queue helpers ─────────────────────────────────────────────────

  const patchAction = useCallback(
    (id: string, patch: Partial<AIAction>) =>
      setActions(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a))),
    [],
  );

  const addAction = useCallback((action: AIAction) => {
    setActions(prev => {
      if (prev.some(a => a.id === action.id)) return prev;
      return [action, ...prev];
    });
  }, []);

  const cancelAction = useCallback((id: string) => {
    patchAction(id, { status: 'cancelled' });
  }, [patchAction]);

  const clearCompletedActions = useCallback(() => {
    setActions(prev => prev.filter(a => a.status === 'pending' || a.status === 'running'));
  }, []);

  // ── Helper: Format command result for display ────────────────────────────

  const formatResultForDisplay = useCallback((result: any): string => {
    if (typeof result === 'string') return result;
    if (result?.summary) return result.summary;
    if (result?.answer) return result.answer;
    if (result?.aiAnalysis) return result.aiAnalysis;
    if (result?.detailedAnalysis) return result.detailedAnalysis;
    return JSON.stringify(result, null, 2);
  }, []);

  // ── Core action runner ───────────────────────────────────────────────────

  const runAction = useCallback(async (id: string) => {
    const action = actions.find(a => a.id === id);
    if (!action) return;

    const startTime = Date.now();
    patchAction(id, { status: 'running', triggeredAt: new Date().toISOString() });
    setExecutingPreviewId(id);

    setRobotState('presenting');
    setRobotEmotion('thinking');
    setRobotGesture('present');

    // Extract context from action if available (before try block for catch access)
    const context = action.metadata || {};

    try {
      // Execute command via aiCommandService (replaces setTimeout mock)
      const result = await aiCommandService.execute(action.commandId || 'unknown', context);

      const executionTimeMs = Date.now() - startTime;
      const resultSummary = formatResultForDisplay(result);

      patchAction(id, {
        status: 'success',
        completedAt: new Date().toISOString(),
        result: resultSummary,
        metadata: { ...context, executionTimeMs },
      });

      setRobotState('success');
      setRobotEmotion('success');
      setRobotGesture('celebrate');
      window.setTimeout(() => {
        setRobotState('idle');
        setRobotGesture('idle');
      }, 1200);
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      patchAction(id, {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date().toISOString(),
        metadata: { ...context, executionTimeMs, errorDetails: errorMessage },
      });

      setRobotState('warning');
      setRobotEmotion('warning');
      setRobotGesture('alert');
      window.setTimeout(() => {
        setRobotState('idle');
        setRobotGesture('idle');
      }, 2200);
    } finally {
      setExecutingPreviewId(null);
    }
  }, [patchAction, setRobotEmotion, setRobotGesture, setRobotState, actions, formatResultForDisplay]);

  const executeAction = useCallback((id: string) => runAction(id), [runAction]);

  const retryAction = useCallback(
    (id: string) => {
      patchAction(id, { status: 'pending', error: undefined });
      return runAction(id);
    },
    [patchAction, runAction],
  );

  // ── Execution preview ────────────────────────────────────────────────────

  const openExecutionPreview = useCallback((action: AIAction) => {
    setExecutionPreview(action);
  }, []);

  const closeExecutionPreview = useCallback(() => {
    setExecutionPreview(null);
  }, []);

  const confirmExecution = useCallback(
    async (id: string) => {
      closeExecutionPreview();
      await runAction(id);
    },
    [closeExecutionPreview, runAction],
  );

  // ── handleCommand — the core robot ↔ AI bridge ───────────────────────────

  const handleCommand = useCallback(
    async (command: Command) => {
      if (isProcessingRef.current) return;

      // Track recency (deduplicated, last 5)
      setRecentCommandIds(prev =>
        [command.id, ...prev.filter(id => id !== command.id)].slice(0, 5),
      );
      closeCommandBar();

      // ── Direct action (navigation, settings, etc.) ─────────────────────
      if (command.action) {
        command.action();
        setRobotState('greeting');
        setRobotEmotion('happy');
        setRobotGesture('wave');
        window.setTimeout(() => {
          setRobotState('idle');
          setRobotGesture('idle');
        }, 1200);
        return;
      }

      if (!command.prompt) return;

      // ── AI prompt ──────────────────────────────────────────────────────
      isProcessingRef.current = true;

      const text = command.prompt;
      const intent = inferIntent(text);
      const { state: robotInitialState, gesture: robotInitialGesture } =
        categoryToRobotState(command.category);

      // Robot enters processing state
      setRobotState(robotInitialState);
      setRobotEmotion('thinking');
      setRobotGesture(robotInitialGesture);

      // Log user message into chat store
      addAiMessage({ role: 'user', content: text, timestamp: new Date(), intent });
      setAiLoading(true);

      try {
        // Read message history at call time (avoids stale closure)
        const history = useAiStore.getState().messages;
        const response = await askAI(text, history);
        const answer = response.answer || fallback(text);
        const responseIntent = response.intent ?? intent;

        // Update robot affect from answer text
        const emotion = detectEmotion(answer);
        const gesture = planGesture(`${text} ${answer}`);
        setRobotEmotion(emotion);
        setRobotGesture(gesture);
        setRobotState('speaking');
        setRobotLastResponse(answer);

        // Log assistant message
        addAiMessage({
          role: 'assistant',
          content: answer,
          timestamp: new Date(),
          intent: responseIntent,
        });

        // Text-to-speech (mirrors AIDock.tsx behaviour exactly)
        const { config } = useRobotStore.getState();
        if (
          config.voiceEnabled &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window
        ) {
          stopSpeaking();
          speak(
            answer,
            () => setRobotSpeaking(true),
            () => {
              setRobotSpeaking(false);
              setRobotState('success');
              setRobotEmotion('success');
              setRobotGesture('celebrate');
              window.setTimeout(() => {
                setRobotState('idle');
                setRobotGesture('idle');
              }, 1100);
            },
          );
        } else {
          setRobotState('success');
          setRobotEmotion('success');
          setRobotGesture('celebrate');
          window.setTimeout(() => {
            setRobotState('idle');
            setRobotGesture('idle');
          }, 1100);
        }
      } catch {
        // Add a graceful fallback message even on error
        addAiMessage({
          role: 'assistant',
          content: fallback(text),
          timestamp: new Date(),
          intent,
        });
        setRobotState('warning');
        setRobotEmotion('warning');
        setRobotGesture('alert');
        window.setTimeout(() => {
          setRobotState('idle');
          setRobotGesture('idle');
        }, 2500);
      } finally {
        setAiLoading(false);
        isProcessingRef.current = false;
      }
    },
    [
      addAiMessage,
      closeCommandBar,
      setAiLoading,
      setRobotEmotion,
      setRobotGesture,
      setRobotLastResponse,
      setRobotSpeaking,
      setRobotState,
    ],
  );

  // ── Context value ────────────────────────────────────────────────────────

  const value: AIWorkspaceContextValue = useMemo(
    () => ({
      isCommandBarOpen,
      recentCommandIds,
      openCommandBar,
      closeCommandBar,
      handleCommand,

      actions,
      addAction,
      executeAction,
      cancelAction,
      retryAction,
      clearCompletedActions,

      executionPreview,
      isExecutingPreviewId,
      openExecutionPreview,
      closeExecutionPreview,
      confirmExecution,
    }),
    [
      isCommandBarOpen,
      recentCommandIds,
      openCommandBar,
      closeCommandBar,
      handleCommand,
      actions,
      addAction,
      executeAction,
      cancelAction,
      retryAction,
      clearCompletedActions,
      executionPreview,
      isExecutingPreviewId,
      openExecutionPreview,
      closeExecutionPreview,
      confirmExecution,
    ],
  );

  return (
    <AIWorkspaceContext.Provider value={value}>
      {children}
    </AIWorkspaceContext.Provider>
  );
}
