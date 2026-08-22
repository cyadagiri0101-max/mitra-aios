import { useState } from 'react';
import { Database, Link2, TrendingUp, Award } from 'lucide-react';

export interface EvidenceRecord {
  id: string;
  type: string;
  sourceEntity: string;
  sourceId: string;
  revision: string;
  date: string;
  authority: string;
  summary: string;
}

interface EvidenceLineagePanelProps {
  evidence?: EvidenceRecord[];
  isG12Candidate?: boolean;
}

const DEFAULT_EVIDENCE: EvidenceRecord[] = [
  {
    id: 'ev-1',
    type: 'GEOMETRIC_FEATURE',
    sourceEntity: 'geometric_features',
    sourceId: 'FEAT-WALL-01',
    revision: 'Rev B',
    date: '2026-08-22',
    authority: 'CAD_GEOMETRY_PARSER (Authoritative)',
    summary: '0.80mm cavity wall thickness measurement from 3D STEP solid.',
  },
  {
    id: 'ev-2',
    type: 'DFM_FINDING',
    sourceEntity: 'dfm_findings',
    sourceId: 'FIND-DFM-WALL-001',
    revision: 'Rev B',
    date: '2026-08-22',
    authority: 'DFM Rule Engine v1.0',
    summary: 'Violation of nominal wall thickness design rule (0.80mm < 1.20mm).',
  },
  {
    id: 'ev-3',
    type: 'HISTORICAL_NCR',
    sourceEntity: 'historical_defect_correlations',
    sourceId: 'NCR-SHORT-SHOT-01',
    revision: 'Rev A',
    date: '2025-11-14',
    authority: 'QMS Inspection Audit',
    summary: '85% short-shot non-conformance rate during injection batch #2025-08.',
  },
  {
    id: 'ev-4',
    type: 'TRIAL_OBSERVATION',
    sourceEntity: 'manufacturing_observations',
    sourceId: 'TRIAL-RUN-HIST-02',
    revision: 'Rev A',
    date: '2025-11-16',
    authority: 'Shop Floor Telemetry',
    summary: 'Holding pressure drop caused freeze-off and localized structural weakness.',
  },
];

export function EvidenceLineagePanel({
  evidence = DEFAULT_EVIDENCE,
  isG12Candidate = true,
}: EvidenceLineagePanelProps) {
  const [activeTab, setActiveTab] = useState<'evidence' | 'ekos' | 'g14'>('evidence');

  return (
    <div className="glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80 space-y-4">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            Evidence, EKOS Lineage & Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'evidence'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Evidence ({evidence.length})
          </button>
          <button
            onClick={() => setActiveTab('ekos')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'ekos'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            EKOS Lineage
          </button>
          <button
            onClick={() => setActiveTab('g14')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'g14'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            G12/G14 Context
          </button>
        </div>
      </div>

      {/* Tab 1: Evidence List & G13 Citations */}
      {activeTab === 'evidence' && (
        <div className="space-y-2.5">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {ev.sourceId}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {ev.type}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">{ev.revision}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{ev.authority}</div>
                </div>
                <button
                  title="Resolve G13 Authoritative Citation"
                  className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800"
                >
                  <Link2 className="w-3 h-3" /> G13 Cite
                </button>
              </div>
              <p className="text-xs text-gray-300 mt-1">{ev.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: EKOS Graph Lineage */}
      {activeTab === 'ekos' && (
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-gray-400 border-b border-slate-800 pb-2">
            <span>EKOS Multi-Hop Provenance Path</span>
            <span className="text-emerald-400">Validated 100% Traceable</span>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>RFQ / Customer Part Spec</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">Drawing TOOL-2026-X (Rev B)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 pl-4 border-l border-slate-700">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Geometric Feature (FEAT-WALL-01)</span>
              <span className="text-gray-500">→</span>
              <span className="text-amber-400">DFM Finding (FIND-DFM-WALL-001)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 pl-8 border-l border-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Historical Defect Correlation (SHORT_SHOT)</span>
              <span className="text-gray-500">→</span>
              <span className="text-emerald-400">Reasoning Result (REAS-01)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 pl-12 border-l border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Governed Cost Synthesis</span>
              <span className="text-gray-500">→</span>
              <span className="text-emerald-300 font-bold">Advisory Recommendation (REC-01)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: G12 Knowledge & G14 Predictive Signals */}
      {activeTab === 'g14' && (
        <div className="space-y-3">
          {/* G12 Knowledge Promotion Status */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase text-slate-200">
                  G12 Knowledge Candidate
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {isG12Candidate ? 'ELIGIBLE' : 'NOT_ELIGIBLE'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Eligible for promotion into enterprise design rules upon verified human acceptance. Zero automatic unverified publication.
              </p>
            </div>
          </div>

          {/* G14 Contextual Signals */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase text-slate-200">
                G14 Advisory Predictive Context
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-gray-500 block text-[10px]">DFM Risk Index</span>
                <span className="font-bold text-red-400">0.82 (High)</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-gray-500 block text-[10px]">Recurrence Prob</span>
                <span className="font-bold text-amber-400">78.5%</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-gray-500 block text-[10px]">Cycle Overhead</span>
                <span className="font-bold text-cyan-400">+4.5s / shot</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 text-right">
              Advisory Signals • Predictive model weights remain immutable
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
