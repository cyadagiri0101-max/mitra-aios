import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle, CheckCircle, BarChart3, Layers, Ruler, Box, Download } from 'lucide-react';


interface RiskArea {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface Feature {
  name: string;
  count: number;
  critical: number;
}

const RISK_COLORS = {
  low: { bg: 'rgba(46, 204, 113, 0.15)', text: '#2ECC71', border: 'rgba(46, 204, 113, 0.3)' },
  medium: { bg: 'rgba(243, 156, 18, 0.15)', text: '#F39C12', border: 'rgba(243, 156, 18, 0.3)' },
  high: { bg: 'rgba(231, 76, 60, 0.15)', text: '#E74C3C', border: 'rgba(231, 76, 60, 0.3)' },
};

const SIMULATED_RISK_AREAS: RiskArea[] = [
  { id: 'r1', title: 'Thin Wall Section', severity: 'high', description: 'Detected wall thickness of 0.8mm in cavity region. Recommended minimum is 1.2mm for H13 steel.' },
  { id: 'r2', title: 'Deep Pocket Geometry', severity: 'medium', description: 'Pocket depth-to-width ratio exceeds 4:1. Consider stepped machining or EDM.' },
  { id: 'r3', title: 'Sharp Internal Corner', severity: 'medium', description: 'R0.2 internal corner detected at feature #17. Minimum recommended radius is R0.5 for stress distribution.' },
  { id: 'r4', title: 'Tight Tolerance Stack', severity: 'high', description: 'Cumulative tolerance across 8 datums exceeds 0.05mm. Review datum scheme.' },
];

const SIMULATED_FEATURES: Feature[] = [
  { name: 'Holes', count: 12, critical: 2 },
  { name: 'Pockets', count: 6, critical: 1 },
  { name: 'Bosses', count: 3, critical: 1 },
  { name: 'Threads', count: 2, critical: 0 },
];

export function DrawingAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size <= 50 * 1024 * 1024) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size <= 50 * 1024 * 1024) {
        setFile(selectedFile);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setShowResults(false);
    try {
      // In production: await api.uploadDrawing('demo', file);
      await new Promise(r => setTimeout(r, 2500));
      setShowResults(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-bold" style={{ fontSize: '32px', color: 'var(--color-text)' }}>
          Drawing Analysis
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          AI-powered CAD drawing intelligence
        </p>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="glass-panel rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
            Upload CAD Drawing
          </h3>
        </div>

        <div
          className="relative rounded-lg border-2 border-dashed transition-all duration-200 p-8"
          style={{
            borderColor: dragActive ? 'var(--color-accent)' : 'rgba(73, 86, 112, 0.4)',
            backgroundColor: dragActive ? 'rgba(100, 255, 218, 0.05)' : 'rgba(17, 34, 64, 0.4)',
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".step,.stp,.iges,.igs,.pdf,.dwg"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {file ? file.name : 'Drop drawing file or click to browse'}
            </p>
            {file && (
              <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                {formatFileSize(file.size)} | {file.type || 'CAD File'}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Accepted: STEP, IGES, PDF, DWG | Max 50 MB
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !file}
            className="btn-primary rounded-lg flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Analyze Drawing
              </>
            )}
          </button>
          <button
            onClick={() => { setFile(null); setShowResults(false); }}
            className="btn-secondary rounded-lg"
          >
            Clear
          </button>
        </div>
      </motion.div>

      {/* Results Panel */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Report Header */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                    Drawing Intelligence Report
                  </h3>
                </div>
                <button className="btn-secondary rounded-lg text-xs flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>

              {/* Summary Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'rgba(17, 34, 64, 0.6)', border: '1px solid rgba(73, 86, 112, 0.4)' }}
                >
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>Part Complexity</div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgba(73, 86, 112, 0.4)"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="var(--color-accent)"
                          strokeWidth="3"
                          strokeDasharray="75, 100"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold font-mono" style={{ color: 'var(--color-accent)' }}>75%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono" style={{ color: 'var(--color-accent)' }}>High</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>23 features | 4 critical</div>
                    </div>
                  </div>
                </div>
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'rgba(17, 34, 64, 0.6)', border: '1px solid rgba(73, 86, 112, 0.4)' }}
                >
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>Suggested Machining Time</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: 'var(--color-accent)' }}>14 hrs</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>CNC + EDM + finishing</div>
                </div>
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'rgba(17, 34, 64, 0.6)', border: '1px solid rgba(73, 86, 112, 0.4)' }}
                >
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>Confidence</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: 'var(--color-accent)' }}>87%</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>AI model confidence</div>
                </div>
              </div>
            </div>

            {/* Risk Areas */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                  Risk Areas Detected: {SIMULATED_RISK_AREAS.length}
                </h3>
              </div>
              <div className="space-y-3">
                {SIMULATED_RISK_AREAS.map((risk, i) => (
                  <motion.div
                    key={risk.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: RISK_COLORS[risk.severity].bg,
                      border: `1px solid ${RISK_COLORS[risk.severity].border}`,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: RISK_COLORS[risk.severity].text }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{risk.title}</span>
                        <span
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: RISK_COLORS[risk.severity].bg, color: RISK_COLORS[risk.severity].text, border: `1px solid ${RISK_COLORS[risk.severity].border}` }}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{risk.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Features & Tolerance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Features Detected */}
              <div className="glass-panel rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                    Features Detected
                  </h3>
                </div>
                <div className="text-2xl font-bold font-mono mb-1" style={{ color: 'var(--color-accent)' }}>
                  23 Features
                </div>
                <div className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Critical: <span style={{ color: 'var(--color-error)' }}>4</span>
                </div>
                <div className="space-y-2">
                  {SIMULATED_FEATURES.map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(17, 34, 64, 0.4)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{f.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{f.count}</span>
                        {f.critical > 0 && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(231, 76, 60, 0.15)', color: 'var(--color-error)', border: '1px solid rgba(231, 76, 60, 0.3)' }}
                          >
                            {f.critical} critical
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Tolerance Analysis */}
              <div className="glass-panel rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Ruler className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                    Tolerance Analysis
                  </h3>
                </div>
                <div className="text-2xl font-bold font-mono mb-1" style={{ color: 'var(--color-accent)' }}>
                  8 Levels
                </div>
                <div className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  Risk: <span style={{ color: 'var(--color-warning)' }}>2</span> stacks exceed limit
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Datum A → B</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-success)' }}>0.012 mm</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                      <div className="h-full rounded-full" style={{ width: '25%', backgroundColor: 'var(--color-success)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Datum B → C</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-success)' }}>0.018 mm</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                      <div className="h-full rounded-full" style={{ width: '38%', backgroundColor: 'var(--color-success)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Datum C → D</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-warning)' }}>0.042 mm</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                      <div className="h-full rounded-full" style={{ width: '84%', backgroundColor: 'var(--color-warning)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Datum D → E</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-error)' }}>0.058 mm</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                      <div className="h-full rounded-full" style={{ width: '95%', backgroundColor: 'var(--color-error)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Material Match */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Box className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                  Material Match
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(100, 255, 218, 0.1)', border: '1px solid rgba(100, 255, 218, 0.2)' }}
                >
                  <Box className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
                </div>
                <div>
                  <div className="text-lg font-bold font-mono" style={{ color: 'var(--color-accent)' }}>
                    H13 Steel
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Grade: Tooling | Confidence: 92%
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Hardness: 48-52 HRC | Suitable for high-volume injection molding
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
