import { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Center, Grid, ContactShadows } from '@react-three/drei';
import {
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  Compass,
  AlertTriangle,
} from 'lucide-react';

export interface DigitalThreadComponentMesh {
  id: string;
  componentCode: string;
  componentName: string;
  revisionCode: string;
  deliverableName: string;
  responsibleEngineer: string;
  status: string;
  colorOverlay: 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'PURPLE' | 'GREEN' | 'NONE';
  overlayReason?: string;
  position: [number, number, number];
  size: [number, number, number];
  sourceFileHash: string;
  isAmbiguous?: boolean;
}

interface DigitalThreadCanvas3DProps {
  components: DigitalThreadComponentMesh[];
  selectedComponentId: string | null;
  onSelectComponent: (componentId: string) => void;
  isCaliperActive?: boolean;
  onCaliperMeasure?: (value: number, type: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  RED: '#E74C3C',
  ORANGE: '#E67E22',
  YELLOW: '#F1C40F',
  BLUE: '#3498DB',
  PURPLE: '#9B59B6',
  GREEN: '#2ECC71',
  NONE: '#95A5A6',
};

function ComponentMeshBox({
  item,
  isSelected,
  onSelect,
  isIsolated,
}: {
  item: DigitalThreadComponentMesh;
  isSelected: boolean;
  onSelect: () => void;
  isIsolated: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const color = COLOR_MAP[item.colorOverlay] || '#3498DB';

  if (isIsolated && !isSelected) return null;

  return (
    <mesh
      position={item.position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={item.size} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.2}
        transparent={true}
        opacity={isSelected ? 1.0 : hovered ? 0.9 : 0.75}
        wireframe={false}
      />
    </mesh>
  );
}

export const DigitalThreadCanvas3D = ({
  components,
  selectedComponentId,
  onSelectComponent,
  isCaliperActive = false,
  onCaliperMeasure,
}: DigitalThreadCanvas3DProps) => {
  const [isIsolated, setIsIsolated] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [activeOverlayFilter, setActiveOverlayFilter] = useState<string>('ALL');
  const controlsRef = useRef<any>(null);

  const filteredComponents = components.filter((c) => {
    if (activeOverlayFilter === 'ALL') return true;
    return c.colorOverlay === activeOverlayFilter;
  });

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleCaliperClick = () => {
    if (onCaliperMeasure && selectedComponentId) {
      const selected = components.find((c) => c.id === selectedComponentId);
      const measuredExtent = selected ? Number((selected.size[0] * 25.4).toFixed(2)) : 42.5;
      onCaliperMeasure(measuredExtent, 'POINT_TO_POINT');
    }
  };

  return (
    <div className="relative w-full h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D Viewport Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg text-xs">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-emerald-400" />
          3D Digital Thread
        </span>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <button
          onClick={handleResetCamera}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          onClick={() => setIsIsolated(!isIsolated)}
          className={`px-2 py-1 rounded flex items-center gap-1 transition ${
            isIsolated ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Isolate Selected Component"
        >
          {isIsolated ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {isIsolated ? 'Isolated' : 'Isolate'}
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-2 py-1 rounded flex items-center gap-1 transition ${
            showGrid ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-400'
          }`}
          title="Toggle Ground Grid"
        >
          <Layers className="w-3.5 h-3.5" />
          Grid
        </button>
        {isCaliperActive && (
          <button
            onClick={handleCaliperClick}
            className="px-2 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded flex items-center gap-1 animate-pulse"
            title="Measure Selected Feature"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Click to Caliper
          </button>
        )}
      </div>

      {/* Decision Overlay Filter Pills */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700 shadow-lg text-[11px]">
        <span className="text-slate-400 font-medium mr-1">Overlays:</span>
        <button
          onClick={() => setActiveOverlayFilter('ALL')}
          className={`px-2 py-0.5 rounded transition ${
            activeOverlayFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveOverlayFilter('RED')}
          className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
            activeOverlayFilter === 'RED' ? 'bg-red-950 text-red-300 border border-red-800' : 'text-red-400 hover:bg-red-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Blockers
        </button>
        <button
          onClick={() => setActiveOverlayFilter('ORANGE')}
          className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
            activeOverlayFilter === 'ORANGE' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-amber-400 hover:bg-amber-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Capacity
        </button>
        <button
          onClick={() => setActiveOverlayFilter('YELLOW')}
          className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
            activeOverlayFilter === 'YELLOW' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' : 'text-yellow-400 hover:bg-yellow-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          Evidence
        </button>
        <button
          onClick={() => setActiveOverlayFilter('PURPLE')}
          className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
            activeOverlayFilter === 'PURPLE' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'text-purple-400 hover:bg-purple-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          T0 Mod
        </button>
      </div>

      {/* Main React Three Fiber Canvas */}
      <div className="w-full h-full">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[5, 4, 6]} fov={50} />
          <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
          <directionalLight position={[-10, -10, -5]} intensity={0.4} color="#90CAF9" />

          <Suspense fallback={null}>
            <Center top>
              <group>
                {filteredComponents.map((item) => (
                  <ComponentMeshBox
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedComponentId}
                    onSelect={() => onSelectComponent(item.id)}
                    isIsolated={isIsolated}
                  />
                ))}
              </group>
            </Center>
            {showGrid && (
              <Grid
                position={[0, -0.01, 0]}
                args={[20, 20]}
                cellSize={0.5}
                cellThickness={0.6}
                cellColor="#334155"
                sectionSize={2.0}
                sectionThickness={1.2}
                sectionColor="#475569"
                fadeDistance={15}
                fadeStrength={1}
              />
            )}
            <ContactShadows position={[0, -0.02, 0]} opacity={0.6} scale={12} blur={2} far={4} />
          </Suspense>
        </Canvas>
      </div>

      {/* Mandatory Metrology & Decision Support Disclaimer */}
      <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>
            <strong className="text-slate-300">Decision Support View:</strong> Colors derived deterministically from MITRA WBS & Evidence. Mesh measurements are visual estimates (non-CMM certified).
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
          <span>Vault: 19,402 Files (READ-ONLY)</span>
          <span>•</span>
          <span>R3F WebGL 2.0</span>
        </div>
      </div>
    </div>
  );
};
