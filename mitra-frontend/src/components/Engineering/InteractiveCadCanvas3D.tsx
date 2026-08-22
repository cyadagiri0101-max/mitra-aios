import { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Center, Grid } from '@react-three/drei';
import {
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';

export interface CadFeatureOverlay {
  id: string;
  type: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  name: string;
  measuredValue: number;
  expectedThreshold: number;
  unit: string;
  hasFinding: boolean;
  severity?: 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'INFO';
  findingTitle?: string;
}

interface InteractiveCadCanvas3DProps {
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
  features?: CadFeatureOverlay[];
  isWireframe?: boolean;
  isTransparent?: boolean;
}

const DEFAULT_FEATURES: CadFeatureOverlay[] = [
  {
    id: 'feat-wall-01',
    type: 'WALL_THICKNESS',
    position: [0, 0.4, 0],
    size: [2.2, 0.15, 1.4],
    color: '#E74C3C',
    name: 'Cavity Wall Section #1',
    measuredValue: 0.8,
    expectedThreshold: 1.2,
    unit: 'mm',
    hasFinding: true,
    severity: 'CRITICAL',
    findingTitle: 'Thin wall below 1.2mm threshold',
  },
  {
    id: 'feat-draft-01',
    type: 'DRAFT_ANGLE',
    position: [1.1, 0, 0],
    size: [0.15, 1.0, 1.4],
    color: '#F39C12',
    name: 'Core Side Wall Draft #3',
    measuredValue: 0.5,
    expectedThreshold: 1.0,
    unit: 'deg',
    hasFinding: true,
    severity: 'WARNING',
    findingTitle: 'Insufficient draft angle (0.5° < 1.0°)',
  },
  {
    id: 'feat-rib-01',
    type: 'RIB',
    position: [-0.4, -0.2, 0],
    size: [0.2, 0.6, 1.2],
    color: '#F1C40F',
    name: 'Reinforcement Rib #4',
    measuredValue: 0.75,
    expectedThreshold: 0.5,
    unit: 'ratio',
    hasFinding: true,
    severity: 'WARNING',
    findingTitle: 'Rib root ratio exceeds 0.5 nominal wall',
  },
  {
    id: 'feat-hole-01',
    type: 'HOLE',
    position: [0.6, 0.2, 0.3],
    size: [0.3, 0.7, 0.3],
    color: '#3498DB',
    name: 'Core Pin Blind Hole #2',
    measuredValue: 4.8,
    expectedThreshold: 3.0,
    unit: 'L/D',
    hasFinding: true,
    severity: 'ADVISORY',
    findingTitle: 'Core pin aspect ratio exceeds 3:1 limit',
  },
  {
    id: 'feat-boss-01',
    type: 'BOSS',
    position: [-0.7, 0.3, -0.4],
    size: [0.4, 0.5, 0.4],
    color: '#2ECC71',
    name: 'Fastener Boss #1',
    measuredValue: 2.0,
    expectedThreshold: 2.0,
    unit: 'mm',
    hasFinding: false,
    severity: 'INFO',
    findingTitle: 'Nominal dimension verified',
  },
];

// Fallback component for WebGL / 3D failure
export function CadCanvasFallbackSummary({
  features = DEFAULT_FEATURES,
  selectedFeatureId,
  onSelectFeature,
}: {
  features?: CadFeatureOverlay[];
  selectedFeatureId: string | null;
  onSelectFeature: (id: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-6 flex flex-col justify-between h-full"
      style={{ backgroundColor: 'rgba(17, 34, 64, 0.8)', border: '1px solid rgba(73, 86, 112, 0.4)' }}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-amber-300">
              3D WebGL Fallback Mode — Structured 2D View
            </span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            REVIEW NON-BLOCKING
          </span>
        </div>
        <p className="text-xs text-gray-300 mb-4">
          Hardware acceleration unavailable or non-3D display requested. All canonical geometric features, DFM findings, and reasoning controls remain 100% accessible.
        </p>

        <div className="space-y-2">
          {features.map((feat) => {
            const isSelected = selectedFeatureId === feat.id;
            return (
              <div
                key={feat.id}
                onClick={() => onSelectFeature(feat.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-950/40 shadow-lg'
                    : 'border-slate-700/50 bg-slate-900/60 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: feat.color }}
                    />
                    <span className="text-xs font-semibold text-white">{feat.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {feat.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-300">
                      {feat.measuredValue} {feat.unit} (spec: ≥{feat.expectedThreshold})
                    </span>
                    {feat.hasFinding && feat.severity && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          feat.severity === 'CRITICAL'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {feat.severity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-[11px] text-gray-400 mt-4 border-t border-slate-700/50 pt-2 flex items-center justify-between">
        <span>Geometric Features: {features.length}</span>
        <span>Revision: Rev B (Verified)</span>
      </div>
    </div>
  );
}

// 3D Model Mesh Component
function CadGeometryMesh({
  features,
  selectedFeatureId,
  onSelectFeature,
  isWireframe,
  isTransparent,
}: {
  features: CadFeatureOverlay[];
  selectedFeatureId: string | null;
  onSelectFeature: (id: string) => void;
  isWireframe: boolean;
  isTransparent: boolean;
}) {
  return (
    <group>
      {/* Base Part Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.4, 0.8, 1.6]} />
        <meshStandardMaterial
          color="#2A3B5C"
          metalness={0.8}
          roughness={0.25}
          wireframe={isWireframe}
          transparent={isTransparent}
          opacity={isTransparent ? 0.35 : 0.85}
        />
      </mesh>

      {/* Feature Overlays and Spatial Pins */}
      {features.map((feat) => {
        const isSelected = selectedFeatureId === feat.id;
        return (
          <group key={feat.id} position={feat.position}>
            {/* Feature Sub-Geometry */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectFeature(feat.id);
              }}
            >
              <boxGeometry args={feat.size} />
              <meshStandardMaterial
                color={isSelected ? '#64FFDA' : feat.color}
                metalness={0.7}
                roughness={0.3}
                wireframe={isWireframe}
                transparent={isTransparent}
                opacity={isSelected ? 0.95 : isTransparent ? 0.6 : 0.75}
                emissive={isSelected ? '#64FFDA' : feat.hasFinding ? feat.color : '#000000'}
                emissiveIntensity={isSelected ? 0.4 : feat.hasFinding ? 0.2 : 0}
              />
            </mesh>

            {/* Pulsating Spatial DFM Pin for Findings */}
            {feat.hasFinding && (
              <mesh position={[0, feat.size[1] / 2 + 0.15, 0]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial
                  color={feat.severity === 'CRITICAL' ? '#FF4D4D' : '#FFA500'}
                  emissive={feat.severity === 'CRITICAL' ? '#FF4D4D' : '#FFA500'}
                  emissiveIntensity={0.8}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function InteractiveCadCanvas3D({
  selectedFeatureId,
  onSelectFeature,
  features = DEFAULT_FEATURES,
}: InteractiveCadCanvas3DProps) {
  const [wireframe, setWireframe] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [hasError, setHasError] = useState(false);
  const controlsRef = useRef<any>(null);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const setViewPreset = (view: 'iso' | 'front' | 'top' | 'right') => {
    if (!controlsRef.current) return;
    const camera = controlsRef.current.object;
    if (view === 'iso') {
      camera.position.set(4, 3, 4);
    } else if (view === 'front') {
      camera.position.set(0, 0, 5);
    } else if (view === 'top') {
      camera.position.set(0, 5, 0);
    } else if (view === 'right') {
      camera.position.set(5, 0, 0);
    }
    controlsRef.current.update();
  };

  if (hasError) {
    return (
      <CadCanvasFallbackSummary
        features={features}
        selectedFeatureId={selectedFeatureId}
        onSelectFeature={onSelectFeature}
      />
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden glass-panel border border-slate-700/60 bg-slate-950/80">
      {/* 3D Canvas Viewport Controls Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="px-2.5 py-1 text-xs font-mono font-bold uppercase rounded bg-slate-900/80 border border-slate-700 text-emerald-400">
          3D WebGL Canvas
        </span>
        <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => setViewPreset('iso')}
            className="px-2 py-0.5 text-[11px] font-mono text-gray-300 hover:text-white rounded hover:bg-slate-800 transition"
          >
            ISO
          </button>
          <button
            onClick={() => setViewPreset('front')}
            className="px-2 py-0.5 text-[11px] font-mono text-gray-300 hover:text-white rounded hover:bg-slate-800 transition"
          >
            FRONT
          </button>
          <button
            onClick={() => setViewPreset('top')}
            className="px-2 py-0.5 text-[11px] font-mono text-gray-300 hover:text-white rounded hover:bg-slate-800 transition"
          >
            TOP
          </button>
          <button
            onClick={() => setViewPreset('right')}
            className="px-2 py-0.5 text-[11px] font-mono text-gray-300 hover:text-white rounded hover:bg-slate-800 transition"
          >
            RIGHT
          </button>
        </div>
      </div>

      {/* Render Mode Toggles Overlay */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setWireframe(!wireframe)}
          title="Toggle Wireframe Mode"
          className={`p-1.5 rounded-lg border transition ${
            wireframe
              ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
              : 'bg-slate-900/80 border-slate-700 text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransparent(!transparent)}
          title="Toggle X-Ray Transparency"
          className={`p-1.5 rounded-lg border transition ${
            transparent
              ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
              : 'bg-slate-900/80 border-slate-700 text-gray-400 hover:text-white'
          }`}
        >
          {transparent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={resetCamera}
          title="Reset Camera"
          className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-gray-400 hover:text-white transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* React Three Fiber 3D Canvas */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-2" />
            Loading 3D CAD Geometry...
          </div>
        }
      >
        <Canvas
          onError={() => setHasError(true)}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <PerspectiveCamera makeDefault position={[3.5, 2.5, 3.5]} fov={45} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <directionalLight position={[-10, -10, -5]} intensity={0.4} />

          <Center>
            <CadGeometryMesh
              features={features}
              selectedFeatureId={selectedFeatureId}
              onSelectFeature={onSelectFeature}
              isWireframe={wireframe}
              isTransparent={transparent}
            />
          </Center>

          <Grid
            args={[10, 10]}
            position={[0, -0.6, 0]}
            cellColor="#1E293B"
            sectionColor="#334155"
            fadeDistance={25}
          />
          <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />
        </Canvas>
      </Suspense>

      {/* Bottom Status Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-gray-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Critical Finding
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Verified Pass
          </span>
        </div>
        <div className="font-mono">
          {selectedFeatureId ? `Selected: ${selectedFeatureId}` : 'Click 3D feature to inspect'}
        </div>
      </div>
    </div>
  );
}
