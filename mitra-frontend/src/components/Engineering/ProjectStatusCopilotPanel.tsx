import React, { useState } from 'react';
import { Bot, Send, Sparkles, AlertCircle, RefreshCw, ShieldAlert, AlertTriangle, FileText } from 'lucide-react';
import { useQueryProjectStatus } from '../../hooks/useEngineeringData';
import type { CopilotGroundedResponse } from '../../services/engineeringApi';

interface ProjectStatusCopilotPanelProps {
  projectId: string;
  onRunQuery?: (query: string) => Promise<CopilotGroundedResponse>;
}

export const ProjectStatusCopilotPanel: React.FC<ProjectStatusCopilotPanelProps> = ({
  projectId,
  onRunQuery,
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [response, setResponse] = useState<CopilotGroundedResponse | null>(null);

  const queryMutation = useQueryProjectStatus();

  const suggestedPrompts = [
    `What is pending in ${projectId}?`,
    `Why is pending work delayed in ${projectId}?`,
    `Who is responsible for pending items in ${projectId}?`,
    `Which engineers are overloaded in the design team?`,
    `Check tracking sheet discrepancies for ${projectId}`,
  ];

  const handleSend = async (qText?: string) => {
    const textToSubmit = (qText !== undefined ? qText : queryInput).trim();
    if (!textToSubmit) return;

    if (onRunQuery) {
      try {
        const res = await onRunQuery(textToSubmit);
        setResponse(res);
      } catch (err: any) {
        setResponse({
          answer: `Query failed: ${err.message}`,
          confidenceScore: 0,
          detectedIntent: 'ERROR',
          isAutonomousDecision: false,
          groundedEvidence: [],
        });
      }
      return;
    }

    queryMutation.mutate(
      {
        projectId,
        queryText: textToSubmit,
        contextScope: 'PROJECT',
      },
      {
        onSuccess: (data: CopilotGroundedResponse) => {
          setResponse(data);
        },
      }
    );
  };

  const isLoading = queryMutation.isPending;
  const isError = queryMutation.isError;
  const error = queryMutation.error;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide">
              AI Engineering Status Copilot
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Grounded DFM, WBS & Tracking Intelligence | Project: <span className="text-cyan-300 font-bold">{projectId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-1.5">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQueryInput(prompt);
              handleSend(prompt);
            }}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700/80 transition-all flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Input query form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder={`Ask anything about ${projectId}: "What is pending?", "Why delayed?", "Who is assigned?"`}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={isLoading || !queryInput.trim()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
        >
          {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {isLoading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {/* Loading state skeleton */}
      {isLoading && (
        <div className="p-4 rounded-lg bg-slate-850/60 border border-slate-800 animate-pulse space-y-2.5">
          <div className="h-4 w-1/4 bg-slate-800 rounded" />
          <div className="h-3 w-full bg-slate-800/80 rounded" />
          <div className="h-3 w-3/4 bg-slate-800/80 rounded" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-xs text-rose-300">
            {error?.isProjectNotFound ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : error?.isForbidden ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {error?.isProjectNotFound
                ? 'Project Not Found'
                : error?.isForbidden
                ? 'Tenant Access Restricted'
                : 'Copilot Query Failed'}
            </span>
          </div>
          <p className="text-xs text-rose-300/90 font-mono">{error?.message || 'Gateway connection failure.'}</p>
        </div>
      )}

      {/* Copilot Grounded Answer */}
      {response && !isLoading && (
        <div className="p-4 rounded-lg bg-slate-850/80 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 font-mono">
              Grounded AI Response (Intent: {response.detectedIntent})
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Confidence: {((response.confidenceScore || 0.95) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
            {response.answer}
          </div>

          {response.groundedEvidence && response.groundedEvidence.length > 0 && (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <FileText className="w-3 h-3 text-cyan-400" /> Grounding Citations & Evidence:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {response.groundedEvidence.map((c, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 text-[10px]"
                  >
                    {c.sourceType}: {c.title || c.sourceId} ({c.status})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] text-slate-500 italic">
            <AlertCircle className="w-3 h-3 text-slate-500 shrink-0" />
            Zero autonomous execution: Copilot provides grounded explanations and recommendations only. Human sign-off required.
          </div>
        </div>
      )}
    </div>
  );
};
