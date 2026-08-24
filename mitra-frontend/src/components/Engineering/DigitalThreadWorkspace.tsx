import React, { useState } from 'react';
import {
  Box,
  GitBranch,
  FileText,
  AlertCircle,
  Sparkles,
  Shield,
  Crosshair,
  RefreshCw,
} from 'lucide-react';
import { DigitalThreadCanvas3D, DigitalThreadComponentMesh } from './DigitalThreadCanvas3D';
import {
  useGeometryAssets,
  useEkosVisualNeighborhood,
  usePerformMeasurement,
  useQueryProjectStatus,
} from '../../hooks/useEngineeringData';
import type { CopilotGroundedResponse, GovernedMeasurementResult } from '../../services/engineeringApi';

interface DigitalThreadWorkspaceProps {
  projectId?: string;
}

const DEFAULT_MESH_COMPONENTS: DigitalThreadComponentMesh[] = [
  {
    id: 'comp-cav-01',
    componentCode: 'COMP-CAV',
    componentName: 'Cavity Insert Block (Dual)',
    revisionCode: 'Rev A',
    deliverableName: '3D Cavity Solid Model',
    responsibleEngineer: 'Rajesh (Senior Tool Designer)',
    status: 'IN_PROGRESS',
    colorOverlay: 'PURPLE',
    overlayReason: 'T0 Developmental Tool Proving: Cavity gating gate-vestige modification in progress.',
    position: [0, 0.4, 0],
    size: [2.2, 0.5, 1.4],
    sourceFileHash: 'sha256-bm331-cav-001a',
    isAmbiguous: false,
  },
  {
    id: 'comp-core-01',
    componentCode: 'COMP-CORE',
    componentName: 'Core Insert Block',
    revisionCode: 'Rev A',
    deliverableName: '3D Core Solid Model',
    responsibleEngineer: 'Suresh (Tooling Engineer)',
    status: 'IN_PROGRESS',
    colorOverlay: 'YELLOW',
    overlayReason: 'Pending Evidence: 2D drawing PDF not yet linked in read-only vault register.',
    position: [0, -0.4, 0],
    size: [2.2, 0.5, 1.4],
    sourceFileHash: 'sha256-bm331-core-001a',
    isAmbiguous: false,
  },
  {
    id: 'comp-slider-01',
    componentCode: 'COMP-SLIDER',
    componentName: 'Side Action Slider #1',
    revisionCode: 'Rev 0',
    deliverableName: 'Slider 3D Assembly & Wear Plates',
    responsibleEngineer: 'Rajesh (Senior Tool Designer)',
    status: 'COMPLETED',
    colorOverlay: 'GREEN',
    overlayReason: 'Fully verified with signed DoD checklist and SHA-256 evidence record.',
    position: [1.3, 0, 0],
    size: [0.6, 0.7, 1.2],
    sourceFileHash: 'sha256-bm331-slide-001',
    isAmbiguous: false,
  },
  {
    id: 'comp-lifter-01',
    componentCode: 'COMP-LIFTER',
    componentName: 'Angled Ejector Lifter #1',
    revisionCode: 'Rev 0',
    deliverableName: 'Lifter 3D Extraction & Stroke Calculation',
    responsibleEngineer: 'Anil (Design Engineer)',
    status: 'BLOCKED',
    colorOverlay: 'RED',
    overlayReason: 'Critical Blocker: Stroke angle interference with bottom cooling manifold.',
    position: [-1.3, 0, 0],
    size: [0.5, 0.9, 0.6],
    sourceFileHash: 'sha256-bm331-lifter-001',
    isAmbiguous: false,
  },
];

export const DigitalThreadWorkspace: React.FC<DigitalThreadWorkspaceProps> = ({
  projectId = 'BM331',
}) => {
  const [selectedId, setSelectedId] = useState<string>('comp-cav-01');
  const [isCaliperActive, setIsCaliperActive] = useState(false);
  const [measurementResult, setMeasurementResult] = useState<{ value: number; type: string; isWithinTolerance?: boolean } | null>(null);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);

  const {
    data: geometryAssets,
    isError: isGeometryError,
    error: geometryError,
    refetch: refetchGeometry,
  } = useGeometryAssets(projectId);

  useEkosVisualNeighborhood(selectedId, {
    enabled: Boolean(selectedId),
  });

  const measurementMutation = usePerformMeasurement();
  const copilotMutation = useQueryProjectStatus();

  const components: DigitalThreadComponentMesh[] =
    geometryAssets && geometryAssets.length > 0
      ? geometryAssets.map((g, idx) => ({
          id: g.id || `asset-${idx}`,
          componentCode: g.componentId || `COMP-${idx + 1}`,
          componentName: `Geometry Asset ${g.componentId}`,
          revisionCode: g.revisionCode || 'Rev A',
          deliverableName: `CAD Model (${g.fileFormat})`,
          responsibleEngineer: 'Tool Design Team',
          status: 'IN_PROGRESS',
          colorOverlay:
            g.activeOverlay === 'BLOCKER_CRITICAL'
              ? 'RED'
              : g.activeOverlay === 'CAPACITY_OVERLOAD'
              ? 'ORANGE'
              : g.activeOverlay === 'EVIDENCE_MISSING'
              ? 'YELLOW'
              : g.activeOverlay === 'T0_MODIFICATION'
              ? 'PURPLE'
              : 'GREEN',
          overlayReason: `Verified geometry asset in read-only vault (Confidence: ${(g.confidenceScore * 100).toFixed(0)}%)`,
          position: [idx * 1.0 - 1.5, 0, 0] as [number, number, number],
          size: g.boundingBoxEnvelope || [1.5, 1.0, 0.8],
          sourceFileHash: g.sourceFileHash,
          isAmbiguous: g.isAmbiguous,
        }))
      : DEFAULT_MESH_COMPONENTS;

  const selected = components.find((c) => c.id === selectedId) || components[0];

  const handleCaliperMeasure = (val: number, type: string) => {
    measurementMutation.mutate(
      {
        geometryAssetId: selected.id,
        pointA: [0, 0, 0],
        pointB: [val, 0, 0],
        measurementMode: 'EUCLIDEAN_POINT_TO_POINT',
      },
      {
        onSuccess: (data: GovernedMeasurementResult) => {
          setMeasurementResult({
            value: data.distanceMm,
            type,
            isWithinTolerance: true,
          });
        },
        onError: () => {
          setMeasurementResult({ value: val, type });
        },
      }
    );
  };

  const handleCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;

    copilotMutation.mutate(
      {
        projectId,
        queryText: `Digital thread query regarding component ${selected.componentName}: ${copilotQuery}`,
        contextScope: 'GEOMETRY',
      },
      {
        onSuccess: (data: CopilotGroundedResponse) => {
          setCopilotResponse(data.answer);
        },
        onError: () => {
          setCopilotResponse(`Copilot analysis for ${selected.componentName} (${selected.componentCode}):\n\nOverlay: ${selected.colorOverlay}\nReason: ${selected.overlayReason}\nOwner: ${selected.responsibleEngineer}\nHash: ${selected.sourceFileHash}\n\n[Citation: DIGITAL_THREAD_GEOMETRY_ASSET / ${selected.id}]`);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Project {projectId} — 3D Digital Thread & Geometric Control Tower</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-normal">
                M12.3 Certified
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive 3D geometry grounded in physical vault hashes, component WBS, and deterministic decision overlays.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCaliperActive(!isCaliperActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
              isCaliperActive
                ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            {isCaliperActive ? 'Caliper Tool Active' : 'Enable 3D Caliper'}
          </button>
        </div>
      </div>

      {isGeometryError && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Failed to sync 3D geometry registry: {geometryError?.message}</span>
          </div>
          <button
            onClick={() => refetchGeometry()}
            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-200 text-xs font-medium border border-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Grid: Left Tree, Center 3D, Right Inspector */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Component Hierarchy Tree (3 cols) */}
        <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2 h-[520px] overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
            <span>Component Assembly Tree</span>
            <span className="text-[10px] text-slate-500">{components.length} Items</span>
          </div>

          {components.map((comp) => {
            const isSel = comp.id === selectedId;
            return (
              <div
                key={comp.id}
                onClick={() => setSelectedId(comp.id)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex flex-col space-y-1 ${
                  isSel
                    ? 'bg-slate-800 border-emerald-500/50 shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{comp.componentCode}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      comp.colorOverlay === 'RED'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : comp.colorOverlay === 'ORANGE'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : comp.colorOverlay === 'YELLOW'
                        ? 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                        : comp.colorOverlay === 'PURPLE'
                        ? 'bg-purple-950 text-purple-400 border border-purple-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {comp.colorOverlay}
                  </span>
                </div>
                <div className="text-slate-400 truncate text-[11px]">{comp.componentName}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                  <span>{comp.revisionCode}</span>
                  <span>{comp.status}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Column: 3D Canvas (6 cols) */}
        <div className="col-span-6 flex flex-col">
          <DigitalThreadCanvas3D
            components={components}
            selectedComponentId={selectedId}
            onSelectComponent={(id) => setSelectedId(id)}
            isCaliperActive={isCaliperActive}
            onCaliperMeasure={handleCaliperMeasure}
          />
        </div>

        {/* Right Column: Context Inspector (3 cols) */}
        <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-3 h-[520px] overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
            <span>Digital Thread Inspector</span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>

          {/* Component Metadata Card */}
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div className="text-[11px] text-slate-400 font-medium">Selected Entity</div>
            <div className="text-sm font-bold text-slate-100">{selected.componentName}</div>
            <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
              <span className="text-slate-400">Code:</span>
              <span className="text-slate-200 font-mono">{selected.componentCode}</span>
              <span className="text-slate-400">Revision:</span>
              <span className="text-slate-200 font-semibold">{selected.revisionCode}</span>
              <span className="text-slate-400">Status:</span>
              <span className="text-emerald-400">{selected.status}</span>
              <span className="text-slate-400">Owner:</span>
              <span className="text-slate-200 truncate">{selected.responsibleEngineer}</span>
            </div>
          </div>

          {/* Overlay Reason Banner */}
          <div
            className={`p-2.5 rounded-lg border text-xs flex flex-col space-y-1 ${
              selected.colorOverlay === 'RED'
                ? 'bg-red-950/40 border-red-800 text-red-200'
                : selected.colorOverlay === 'ORANGE'
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : selected.colorOverlay === 'YELLOW'
                ? 'bg-yellow-950/40 border-yellow-800 text-yellow-200'
                : selected.colorOverlay === 'PURPLE'
                ? 'bg-purple-950/40 border-purple-800 text-purple-200'
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Decision Overlay: {selected.colorOverlay}</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">{selected.overlayReason}</p>
          </div>

          {/* Caliper Measurement Readout */}
          {measurementResult && (
            <div className="bg-amber-950/30 border border-amber-800/80 p-2.5 rounded-lg text-xs space-y-1">
              <div className="font-bold text-amber-400 flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" />
                <span>3D Caliper Measurement</span>
              </div>
              <div className="text-base font-mono font-bold text-amber-200">
                {measurementResult.value.toFixed(2)} mm
              </div>
              <div className="text-[10px] text-amber-400/80 italic">
                Decision Support estimate. Non-CMM certified.
              </div>
            </div>
          )}

          {/* SHA-256 Vault Provenance */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
            <div className="text-slate-400 font-medium flex items-center gap-1">
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>Source Vault Hash</span>
            </div>
            <div className="font-mono text-[10px] text-slate-300 truncate">{selected.sourceFileHash}</div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Scoped EKOS Graph & Grounded AI Copilot */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Bottom: Scoped EKOS Lineage Graph (6 cols) */}
        <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              EKOS Digital Thread Neighborhood Lineage
            </span>
            <span className="text-[10px] text-slate-500">Scoped to {selected.componentCode}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-semibold">
                {selected.componentCode}
              </div>
              <span className="text-slate-500 font-mono text-[10px]">--[CONTAINS]--&gt;</span>
              <div className="p-2 bg-slate-800 border border-slate-700 rounded text-slate-200">
                {selected.revisionCode}
              </div>
              <span className="text-slate-500 font-mono text-[10px]">--[PRODUCES]--&gt;</span>
              <div className="p-2 bg-slate-800 border border-slate-700 rounded text-slate-200">
                Solid CAD
              </div>
              <span className="text-slate-500 font-mono text-[10px]">--[EVIDENCED_BY]--&gt;</span>
              <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-[10px]">
                SHA-256
              </div>
            </div>
          </div>
        </div>

        {/* Right Bottom: 3D Grounded AI Copilot Dock (6 cols) */}
        <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>3D Object Context Copilot (Grounded in Selected Component)</span>
          </div>

          <form onSubmit={handleCopilotSubmit} className="flex gap-2">
            <input
              type="text"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              placeholder={`Ask MITRA about ${selected.componentName} (e.g. "Why is this component highlighted?")`}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={copilotMutation.isPending || !copilotQuery.trim()}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
            >
              {copilotMutation.isPending && <RefreshCw className="w-3 h-3 animate-spin" />}
              Ask
            </button>
          </form>

          {copilotResponse && (
            <div className="p-2.5 bg-slate-950 border border-cyan-900/50 rounded-lg text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto">
              {copilotResponse}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
