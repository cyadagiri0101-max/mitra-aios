import { useState } from 'react';
import { RevisionSafetyBanner } from './RevisionSafetyBanner';
import { InteractiveCadCanvas3D } from './InteractiveCadCanvas3D';
import { DfmFindingListPanel, DfmFindingItem } from './DfmFindingListPanel';
import { EngineeringReasoningPanel } from './EngineeringReasoningPanel';
import { EvidenceLineagePanel } from './EvidenceLineagePanel';
import { ContradictionAssumptionPanel } from './ContradictionAssumptionPanel';
import { GovernedCostImpactPanel } from './GovernedCostImpactPanel';
import { HumanReviewActionCenter } from './HumanReviewActionCenter';

interface DfmReviewWorkspaceProps {
  drawingId?: string;
  activeRevision?: string;
  analysisRevision?: string;
}

const SAMPLE_FINDINGS: DfmFindingItem[] = [
  {
    id: 'FIND-DFM-WALL-001',
    ruleId: 'DFM-WALL-001',
    ruleVersion: '1.0',
    severity: 'CRITICAL',
    status: 'OPEN',
    observedValue: 0.80,
    expectedThreshold: 1.20,
    unit: 'mm',
    explanation: 'Localized cavity wall thickness is 0.80mm, violating minimum design limit of 1.20mm.',
    featureId: 'feat-wall-01',
    featureType: 'WALL_THICKNESS',
    confidence: 0.95,
  },
  {
    id: 'FIND-DFM-DRAFT-001',
    ruleId: 'DFM-DRAFT-001',
    ruleVersion: '1.0',
    severity: 'WARNING',
    status: 'OPEN',
    observedValue: 0.50,
    expectedThreshold: 1.00,
    unit: 'deg',
    explanation: 'Core side draft angle is 0.50°, risking surface scuffing during mold ejection.',
    featureId: 'feat-draft-01',
    featureType: 'DRAFT_ANGLE',
    confidence: 0.90,
  },
  {
    id: 'FIND-DFM-RIB-001',
    ruleId: 'DFM-RIB-001',
    ruleVersion: '1.0',
    severity: 'WARNING',
    status: 'OPEN',
    observedValue: 0.75,
    expectedThreshold: 0.50,
    unit: 'ratio',
    explanation: 'Rib root thickness ratio is 0.75 of nominal wall, causing high risk of cosmetic sink marks.',
    featureId: 'feat-rib-01',
    featureType: 'RIB',
    confidence: 0.88,
  },
  {
    id: 'FIND-DFM-HOLE-001',
    ruleId: 'DFM-HOLE-001',
    ruleVersion: '1.0',
    severity: 'ADVISORY',
    status: 'OPEN',
    observedValue: 4.80,
    expectedThreshold: 3.00,
    unit: 'L/D',
    explanation: 'Blind hole depth ratio is 4.8:1, risking slender core pin deflection under melt pressure.',
    featureId: 'feat-hole-01',
    featureType: 'HOLE',
    confidence: 0.85,
  },
];

export function DfmReviewWorkspace({
  drawingId = '80000000-0000-0000-0000-000000000002',
  activeRevision = 'Rev B',
  analysisRevision = 'Rev B',
}: DfmReviewWorkspaceProps) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>('feat-wall-01');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>('FIND-DFM-WALL-001');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'reasoning' | 'evidence' | 'cost'>('reasoning');

  const handleSelectFeature = (featureId: string) => {
    setSelectedFeatureId(featureId);
    const matchedFinding = SAMPLE_FINDINGS.find((f) => f.featureId === featureId);
    if (matchedFinding) {
      setSelectedFindingId(matchedFinding.id);
    }
  };

  const handleSelectFinding = (findingId: string) => {
    setSelectedFindingId(findingId);
    const matchedFinding = SAMPLE_FINDINGS.find((f) => f.id === findingId);
    if (matchedFinding?.featureId) {
      setSelectedFeatureId(matchedFinding.featureId);
    }
  };

  const handleReviewDecision = (decision: string, notes: string) => {
    alert(`Human Engineering Decision [${decision}] successfully recorded to audit ledger.\nNotes: ${notes}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Revision Safety Top Banner */}
      <RevisionSafetyBanner
        drawingId={drawingId}
        drawingName="TOOL-2026-CORE-CAVITY-MOLD"
        activeRevision={activeRevision}
        analysisRevision={analysisRevision}
      />

      {/* 2. Primary 3D Canvas + Findings Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive 3D WebGL Canvas */}
        <div className="lg:col-span-2 h-[480px]">
          <InteractiveCadCanvas3D
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={handleSelectFeature}
          />
        </div>

        {/* Right 1 Col: Filterable DFM Findings List */}
        <div className="h-[480px]">
          <DfmFindingListPanel
            findings={SAMPLE_FINDINGS}
            selectedFindingId={selectedFindingId}
            onSelectFinding={handleSelectFinding}
          />
        </div>
      </div>

      {/* 3. Contradictions, Assumptions & Confidence Grid */}
      <ContradictionAssumptionPanel />

      {/* 4. Tabbed Deep-Dive Area: Multi-Step Reasoning / Evidence & Lineage / Governed Cost & Impact */}
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 font-mono text-xs">
          <button
            onClick={() => setActiveWorkspaceTab('reasoning')}
            className={`px-3 py-1.5 rounded-lg transition font-bold ${
              activeWorkspaceTab === 'reasoning'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'text-gray-400 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
          >
            1. Multi-Step Reasoning (9 Steps)
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('cost')}
            className={`px-3 py-1.5 rounded-lg transition font-bold ${
              activeWorkspaceTab === 'cost'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'text-gray-400 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
          >
            2. Governed Cost & Impact Synthesis
          </button>
          <button
            onClick={() => setActiveWorkspaceTab('evidence')}
            className={`px-3 py-1.5 rounded-lg transition font-bold ${
              activeWorkspaceTab === 'evidence'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'text-gray-400 hover:text-white bg-slate-900/60 border border-slate-800'
            }`}
          >
            3. Grounded Evidence & EKOS Lineage
          </button>
        </div>

        {/* Active Tab View */}
        {activeWorkspaceTab === 'reasoning' && <EngineeringReasoningPanel />}
        {activeWorkspaceTab === 'cost' && <GovernedCostImpactPanel />}
        {activeWorkspaceTab === 'evidence' && <EvidenceLineagePanel />}
      </div>

      {/* 5. Human Engineering Review & Action Center */}
      <HumanReviewActionCenter onReviewDecision={handleReviewDecision} />
    </div>
  );
}
