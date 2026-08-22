import { useState } from 'react';
import { AlertTriangle, Search, ArrowUpDown, ChevronRight } from 'lucide-react';

export interface DfmFindingItem {
  id: string;
  ruleId: string;
  ruleVersion: string;
  severity: 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'INFO';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'WAIVED';
  observedValue: number;
  expectedThreshold: number;
  unit: string;
  explanation: string;
  featureId?: string;
  featureType?: string;
  confidence?: number;
}

interface DfmFindingListPanelProps {
  findings: DfmFindingItem[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
}

export function DfmFindingListPanel({
  findings,
  selectedFindingId,
  onSelectFinding,
}: DfmFindingListPanelProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'severity' | 'threshold'>('severity');

  const severityWeight = { CRITICAL: 4, WARNING: 3, ADVISORY: 2, INFO: 1 };

  const filteredFindings = findings
    .filter((f) => {
      if (filterSeverity !== 'ALL' && f.severity !== filterSeverity) return false;
      if (searchTerm && !f.ruleId.toLowerCase().includes(searchTerm.toLowerCase()) && !f.explanation.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      return b.observedValue - a.observedValue;
    });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-950/70 border-red-800 text-red-400';
      case 'WARNING':
        return 'bg-amber-950/70 border-amber-800 text-amber-400';
      case 'ADVISORY':
        return 'bg-blue-950/70 border-blue-800 text-blue-400';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80">
      {/* Header & Stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            DFM Findings ({filteredFindings.length})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
            {findings.filter((f) => f.severity === 'CRITICAL').length} Critical
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
            {findings.filter((f) => f.severity === 'WARNING').length} Warning
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search rule ID or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-gray-500 focus:outline-none focus:border-emerald-400 font-mono"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
            {['ALL', 'CRITICAL', 'WARNING', 'ADVISORY'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2 py-1 rounded transition ${
                  filterSeverity === sev
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-900/90 border border-slate-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortBy(sortBy === 'severity' ? 'threshold' : 'severity')}
            className="flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortBy === 'severity' ? 'Severity' : 'Value'}
          </button>
        </div>
      </div>

      {/* Findings List Items */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[500px]">
        {filteredFindings.map((finding) => {
          const isSelected = selectedFindingId === finding.id;
          return (
            <div
              key={finding.id}
              onClick={() => onSelectFinding(finding.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-950/40 shadow-md ring-1 ring-emerald-500/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {finding.ruleId}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase border ${getSeverityStyle(
                        finding.severity,
                      )}`}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    v{finding.ruleVersion} • {finding.featureType || 'GEOMETRIC_FEATURE'}
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition ${
                    isSelected ? 'text-emerald-400 rotate-90' : 'text-gray-500'
                  }`}
                />
              </div>

              {/* Observed vs Expected Gauge */}
              <div className="grid grid-cols-2 gap-2 my-2 p-2 rounded bg-slate-950/60 border border-slate-800/80 font-mono text-[11px]">
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase">Observed</span>
                  <span className="font-bold text-red-400">
                    {finding.observedValue} {finding.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase">Threshold</span>
                  <span className="font-bold text-emerald-400">
                    ≥ {finding.expectedThreshold} {finding.unit}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-300 line-clamp-2">{finding.explanation}</p>
            </div>
          );
        })}

        {filteredFindings.length === 0 && (
          <div className="p-8 text-center text-xs text-gray-500">
            No DFM findings matching filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
