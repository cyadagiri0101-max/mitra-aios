import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle, CheckCircle, Clock, BarChart3, Wrench, Download } from 'lucide-react';


interface BOMItem {
  id: string;
  partNumber: string;
  material: string;
  quantity: number;
  vendor: string;
  leadTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  substituteSuggestions: string[];
}

interface RiskArea {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

const SIMULATED_BOM_ITEMS: BOMItem[] = [
  { id: '1', partNumber: 'PRT-001-A', material: 'H13 Tool Steel', quantity: 2, vendor: 'ThyssenKrupp', leadTime: '3 weeks', riskLevel: 'low', substituteSuggestions: ['D2 Steel', 'A2 Steel'] },
  { id: '2', partNumber: 'PRT-002-B', material: 'Aluminum 7075-T6', quantity: 4, vendor: 'Kaiser Aluminum', leadTime: '2 weeks', riskLevel: 'low', substituteSuggestions: ['6061-T6'] },
  { id: '3', partNumber: 'PRT-003-C', material: 'P20 Mold Steel', quantity: 1, vendor: 'Bohler Uddeholm', leadTime: '6 weeks', riskLevel: 'high', substituteSuggestions: ['H13', 'NAK80'] },
  { id: '4', partNumber: 'PRT-004-D', material: 'Copper Beryllium', quantity: 8, vendor: 'Materion', leadTime: '4 weeks', riskLevel: 'medium', substituteSuggestions: ['Aluminum Bronze'] },
  { id: '5', partNumber: 'PRT-005-E', material: 'Stainless 420SS', quantity: 6, vendor: 'Outokumpu', leadTime: '5 weeks', riskLevel: 'high', substituteSuggestions: ['440C', '17-4PH'] },
  { id: '6', partNumber: 'PRT-006-F', material: 'Titanium Ti-6Al-4V', quantity: 2, vendor: 'VSMPO-AVISMA', leadTime: '8 weeks', riskLevel: 'medium', substituteSuggestions: ['Ti-5Al-2.5Sn'] },
];

const SIMULATED_RISK_AREAS: RiskArea[] = [
  { id: 'r1', title: 'Long Lead Time Material', severity: 'high', description: 'P20 Mold Steel from Bohler Uddeholm has a 6-week lead time, potentially delaying project PRJ-1248.' },
  { id: 'r2', title: 'Single Source Vendor', severity: 'high', description: 'Copper Beryllium sourced exclusively from Materion. No secondary supplier on record.' },
  { id: 'r3', title: 'Titanium Availability', severity: 'medium', description: 'Ti-6Al-4V availability is tightening in Q3. Consider pre-ordering or alternative alloy.' },
];

const RISK_COLORS = {
  low: { bg: 'rgba(46, 204, 113, 0.15)', text: '#2ECC71', border: 'rgba(46, 204, 113, 0.3)' },
  medium: { bg: 'rgba(243, 156, 18, 0.15)', text: '#F39C12', border: 'rgba(243, 156, 18, 0.3)' },
  high: { bg: 'rgba(231, 76, 60, 0.15)', text: '#E74C3C', border: 'rgba(231, 76, 60, 0.3)' },
};

export function BomAnalysisPage() {
  const [bomText, setBomText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

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
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBomText(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBomText(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!bomText.trim() && !fileName) return;
    setIsAnalyzing(true);
    setShowResults(false);
    try {
      // In production, this would call the real API
      // await api.post('/bom-analysis/analyze', { projectId: 'demo', bomData: bomText });
      await new Promise(r => setTimeout(r, 2000));
      setShowResults(true);
    } finally {
      setIsAnalyzing(false);
    }
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
          BOM Analysis
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          AI-powered Bill of Materials intelligence
        </p>
      </motion.div>

      {/* Import Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="glass-panel rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
            Import BOM Data
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
            accept=".csv,.json,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {fileName ? fileName : 'Drop BOM file or click to browse'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Supported: CSV, JSON, Excel
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
            Or paste BOM data directly
          </label>
          <textarea
            value={bomText}
            onChange={e => setBomText(e.target.value)}
            placeholder={`PartNumber,Material,Quantity,Vendor,LeadTime\nPRT-001-A,H13 Tool Steel,2,ThyssenKrupp,3 weeks\nPRT-002-B,Aluminum 7075-T6,4,Kaiser Aluminum,2 weeks`}
            className="w-full rounded-lg p-3 text-sm font-mono outline-none resize-y transition-all duration-200"
            style={{
              minHeight: '120px',
              backgroundColor: 'var(--color-bg-deep)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!bomText.trim() && !fileName)}
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
                Analyze BOM
              </>
            )}
          </button>
          <button
            onClick={() => { setBomText(''); setFileName(null); setShowResults(false); }}
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
            {/* Summary Card */}
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                  BOM Intelligence Report
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'rgba(17, 34, 64, 0.6)', border: '1px solid rgba(73, 86, 112, 0.4)' }}
                >
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>Part Complexity</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: 'var(--color-accent)' }}>High</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>47 parts | 12 critical</div>
                </div>
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'rgba(17, 34, 64, 0.6)', border: '1px solid rgba(73, 86, 112, 0.4)' }}
                >
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>Estimated Cycle</div>
                  <div className="text-2xl font-bold font-mono" style={{ color: 'var(--color-accent)' }}>14 hrs</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}> machining + assembly</div>
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

            {/* BOM Items Table */}
            <div className="glass-panel rounded-xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                    BOM Items
                  </h3>
                </div>
                <button className="btn-secondary rounded-lg text-xs flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(73, 86, 112, 0.4)' }}>
                      {['Part Number', 'Material', 'Qty', 'Vendor', 'Lead Time', 'Risk', 'Substitutes'].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SIMULATED_BOM_ITEMS.map((item, i) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="transition-colors duration-150"
                        style={{ borderBottom: '1px solid rgba(73, 86, 112, 0.2)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(17, 34, 64, 0.6)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}
                      >
                        <td className="px-3 py-3 font-mono text-xs" style={{ color: 'var(--color-accent)' }}>{item.partNumber}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--color-text)' }}>{item.material}</td>
                        <td className="px-3 py-3 font-mono" style={{ color: 'var(--color-text)' }}>{item.quantity}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--color-text-secondary)' }}>{item.vendor}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" style={{ color: 'var(--color-text-secondary)' }} />
                            <span style={{ color: 'var(--color-text-secondary)' }}>{item.leadTime}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: RISK_COLORS[item.riskLevel].bg,
                              color: RISK_COLORS[item.riskLevel].text,
                              border: `1px solid ${RISK_COLORS[item.riskLevel].border}`,
                            }}
                          >
                            {item.riskLevel}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.substituteSuggestions.map((sub, j) => (
                              <span
                                key={j}
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'rgba(100, 255, 218, 0.1)', color: 'var(--color-accent)', border: '1px solid rgba(100, 255, 218, 0.2)' }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
