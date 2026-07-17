import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'project' | 'drawing' | 'bom' | 'document' | 'customer';
  title: string;
  subtitle: string;
}

const DEMO_RESULTS: SearchResult[] = [
  { id: '1', type: 'project', title: 'PRJ-1250 — ABC Industries Mold Base', subtitle: 'Planning stage • On Track • 12 items' },
  { id: '2', type: 'project', title: 'PRJ-1248 — XYZ Components Insert', subtitle: 'Manufacturing • At Risk • 8 items' },
  { id: '3', type: 'bom', title: 'BOM-2290 — Main Assembly', subtitle: 'Bill of Materials • 47 parts • Updated 2 hrs ago' },
  { id: '4', type: 'drawing', title: 'DRG-1156 — Cavity Plate STEP', subtitle: 'CAD Drawing • 23 features • 14 tolerances' },
  { id: '5', type: 'document', title: 'QAP-442 — Quality Assurance Plan', subtitle: 'Document • Approved • 3 revisions' },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  project: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64FFDA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  drawing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00B4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  bom: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  document: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  customer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F39C12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

type SearchPhase = 'idle' | 'init' | 'analyze' | 'process' | 'generate' | 'stream' | 'complete';

const PHASE_CONFIG: Record<SearchPhase, { label: string; duration: number }> = {
  idle: { label: '', duration: 0 },
  init: { label: 'Initializing Search...', duration: 500 },
  analyze: { label: 'Analyzing Projects...', duration: 1500 },
  process: { label: 'Processing Drawings...', duration: 1500 },
  generate: { label: 'Generating Insights...', duration: 1500 },
  stream: { label: 'Streaming Results...', duration: 2000 },
  complete: { label: '', duration: 0 },
};

// Simple Perlin-like noise using stacked sine waves
function noise(t: number, barIndex: number): number {
  const freq1 = 0.003;
  const freq2 = 0.007;
  const freq3 = 0.011;
  const phase = barIndex * 0.3;
  return (
    Math.sin((t + phase) * freq1) * 0.5 +
    Math.sin((t + phase) * freq2) * 0.3 +
    Math.sin((t + phase) * freq3) * 0.2 +
    1
  ) / 2; // Normalize to 0..1
}

function WaveformBars({ isActive }: { isActive: boolean }) {
  const [heights, setHeights] = useState<number[]>(Array(32).fill(0.5));
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isActive) return;
    startTimeRef.current = Date.now();
    const animate = () => {
      const t = Date.now() - startTimeRef.current;
      const newHeights = Array.from({ length: 32 }, (_, i) => {
        const n = noise(t, i);
        return 0.15 + n * 0.85; // Min height 15%, max 100%
      });
      setHeights(newHeights);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isActive]);

  return (
    <div className="flex items-end justify-center gap-[3px] h-16 w-full max-w-md mx-auto">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[6px] rounded-full transition-all duration-75"
          style={{
            height: `${h * 100}%`,
            backgroundColor: 'var(--color-accent)',
            opacity: isActive ? 0.6 + h * 0.4 : 0.2,
          }}
        />
      ))}
    </div>
  );
}

function TypingText({ text, speed = 40 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor(s => !s), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <span>
      {displayed}
      {showCursor && <span className="inline-block w-[2px] h-[1em] ml-0.5 align-middle" style={{ backgroundColor: 'var(--color-accent)' }} />}
    </span>
  );
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setResults([]);
      setPhase('idle');
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Parent controls open state — we can't open ourselves, but we can notify
          // This component expects the parent to manage isOpen
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search phase progression
  const runSearchPhases = useCallback(() => {
    const phases: SearchPhase[] = ['init', 'analyze', 'process', 'generate', 'stream'];
    let currentPhase = 0;

    const advance = () => {
      if (currentPhase >= phases.length) {
        setPhase('complete');
        setResults(DEMO_RESULTS.filter(r => r.title.toLowerCase().includes(query.toLowerCase())));
        return;
      }
      const p = phases[currentPhase];
      setPhase(p);
      const duration = PHASE_CONFIG[p].duration;
      phaseTimerRef.current = setTimeout(() => {
        currentPhase++;
        advance();
      }, duration);
    };

    advance();
  }, [query]);

  // Submit search on Enter
  const handleSubmit = useCallback(() => {
    if (!query.trim() || phase !== 'idle') return;
    setResults([]);
    setSelectedIndex(-1);
    runSearchPhases();
  }, [query, phase, runSearchPhases]);

  // Query debounce for simple filtering when not in phase mode
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setPhase('idle');
      setSelectedIndex(-1);
      return;
    }
    // If user types and pauses, show simple results without full phase animation
    const timer = setTimeout(() => {
      if (phase === 'idle') {
        setResults(DEMO_RESULTS.filter(r => r.title.toLowerCase().includes(query.toLowerCase())));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, phase]);

  // Keyboard navigation within results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const max = results.length - 1;
          return prev >= max ? 0 : prev + 1;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const max = results.length - 1;
          return prev <= 0 ? max : prev - 1;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'idle' && results.length === 0 && query.trim()) {
          handleSubmit();
        } else if (selectedIndex >= 0 && results[selectedIndex]) {
          // Result selected — in a real app, navigate to it
        } else if (phase === 'idle') {
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, phase, query, handleSubmit]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  const isProcessing = phase !== 'idle' && phase !== 'complete';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.2 },
            backdropFilter: { duration: 0.3 },
          }}
          className="fixed inset-0 z-[60] flex items-start justify-center pt-32"
          style={{ backgroundColor: 'rgba(10, 25, 47, 0.85)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: -10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -10, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl px-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="relative">
              <div
                className="flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: `2px solid ${document.activeElement === inputRef.current ? 'rgba(100, 255, 218, 1)' : 'rgba(100, 255, 218, 0.4)'}`,
                }}
              >
                <Search className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search projects, drawings, or BOMs."
                  className="flex-1 bg-transparent outline-none placeholder:text-[#8892B0]"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '24px',
                    color: 'var(--color-text)',
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                  ESC to close
                </span>
              </div>
            </div>

            {/* Waveform */}
            <div className="mt-6">
              <WaveformBars isActive={isProcessing || phase === 'complete'} />
            </div>

            {/* Phase Status */}
            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 text-center"
                >
                  <span className="text-sm font-mono" style={{ color: 'var(--color-accent)' }}>
                    {phase === 'init' ? (
                      <span>
                        Initializing Search
                        <span className="inline-block ml-1">
                          <span className="animate-pulse">.</span>
                          <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                          <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                        </span>
                      </span>
                    ) : phase === 'stream' ? (
                      <TypingText text={PHASE_CONFIG[phase].label} />
                    ) : (
                      PHASE_CONFIG[phase].label
                    )}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
              {(phase === 'complete' || (phase === 'idle' && query.trim() && results.length > 0)) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(17, 34, 64, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(73, 86, 112, 0.4)',
                  }}
                >
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                    Top Results
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {results.slice(0, 5).map((r, i) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 px-4 transition-all duration-150 cursor-pointer"
                        style={{
                          height: '72px',
                          borderLeft: selectedIndex === i ? '3px solid var(--color-accent)' : '3px solid transparent',
                          backgroundColor: selectedIndex === i ? '#112240' : 'transparent',
                        }}
                        onMouseEnter={() => setSelectedIndex(i)}
                        onClick={() => { /* Navigate to result */ }}
                        onMouseOver={(e) => {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#112240';
                        }}
                        onMouseOut={(e) => {
                          if (selectedIndex !== i) {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                          {TYPE_ICONS[r.type]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.title}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{r.subtitle}</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)' }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </motion.div>
                    ))}
                    {results.length === 0 && query.trim() && (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          No results found for &quot;{query}&quot;
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                          Try a different search term or check spelling
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state — quick commands */}
            {!query.trim() && phase === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-6 rounded-xl p-4"
                style={{
                  backgroundColor: 'rgba(17, 34, 64, 0.6)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(73, 86, 112, 0.4)',
                }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Quick Commands
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Open Dashboard', shortcut: 'D' },
                    { label: 'New Project', shortcut: 'N' },
                    { label: 'AI Copilot', shortcut: 'A' },
                    { label: 'Search Documents', shortcut: 'S' },
                  ].map((cmd, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(17, 34, 64, 0.4)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#112240';
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(100, 255, 218, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(17, 34, 64, 0.4)';
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{cmd.label}</span>
                      <kbd className="px-1.5 py-0.5 text-xs font-mono rounded" style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                        {cmd.shortcut}
                      </kbd>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
