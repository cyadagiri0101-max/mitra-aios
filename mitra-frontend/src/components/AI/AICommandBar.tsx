/**
 * AICommandBar
 *
 * A ⌘K-style global command palette for MITRA AI. Keyboard-first,
 * full-screen overlay with instant fuzzy search across manufacturing
 * commands, AI prompts, and navigation shortcuts.
 *
 * Features:
 * - Keyboard navigation (↑↓ arrows, Enter, Escape)
 * - Fuzzy search across all commands
 * - Category sections (Analysis / Production / Quality / Navigation)
 * - Keyboard shortcut display
 * - Recent commands (first 3 shown by default)
 * - AI prompt commands (send directly to chat)
 *
 * Integration:
 * - Mount once at app level (or inside AIWorkspace)
 * - `isOpen` controlled externally (toggle with ⌘K handler)
 * - `onCommand(cmd)` fires when user selects a command
 * - Wire keyboard listener in parent: useEffect for 'Meta+K'
 *
 * Accessibility:
 * - role="dialog" aria-modal with aria-label
 * - Combobox pattern: input + role="listbox" results
 * - aria-selected per option, aria-activedescendant on input
 * - Escape always closes
 *
 * Animation:
 * - Backdrop: fade
 * - Panel: scale(0.98 → 1) + fade, spring physics
 * - Results: staggered fade-in
 * - Highlighted row: background cross-fade
 */

import { useState, useEffect, useRef, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Boxes,
  FileSearch,
  TrendingUp,
  Wrench,
  Sparkles,
  BarChart3,
  Truck,
  AlertTriangle,
  Settings,
  ChevronRight,
  Clock,
  Hash,
} from 'lucide-react';
import type { Command, CommandCategory } from './workspace/ai.workspace.types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AICommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: Command) => void;
  recentCommandIds?: string[];
  additionalCommands?: Command[];
}

// ─── Default commands ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Boxes, FileSearch, TrendingUp, Wrench, Sparkles, BarChart3,
  Truck, AlertTriangle, Settings, Hash,
};

const DEFAULT_COMMANDS: Command[] = [
  // AI Analysis
  { id: 'bom-risk',    label: 'Analyze BOM Risk',        description: 'Material, lead-time & alternate-part risks',  category: 'analysis',   icon: 'Boxes',        shortcut: '⌘1',  prompt: 'Analyze the latest BOM for material, lead-time, and alternate-part risks.' },
  { id: 'drawing',     label: 'Check Drawing',           description: 'Tolerance, manufacturability & release risk',  category: 'analysis',   icon: 'FileSearch',   shortcut: '⌘2',  prompt: 'Review the latest drawing for tolerance, manufacturability, and release risks.' },
  { id: 'delay-risk',  label: 'Predict Delay Risks',     description: 'Rank top blockers across active projects',     category: 'analysis',   icon: 'TrendingUp',   shortcut: '⌘3',  prompt: 'Predict delay risks across all active projects and rank the top blockers.' },
  { id: 'root-cause',  label: 'Root Cause Analysis',     description: 'Production & quality exception root causes',   category: 'quality',    icon: 'Wrench',       shortcut: '⌘4',  prompt: 'Find likely root causes for current production and quality exceptions.' },
  { id: 'recommend',   label: 'Get Recommendations',     description: 'Next best actions for today',                  category: 'analysis',   icon: 'Sparkles',     shortcut: '⌘5',  prompt: 'Recommend the next best actions to keep all active projects on track today.' },
  { id: 'quality',     label: 'Quality Trend Report',    description: 'Rising defects and trend summary',             category: 'quality',    icon: 'BarChart3',               prompt: 'Summarise current quality trends and flag any rising defect categories.' },
  { id: 'dispatch',    label: 'Dispatch Risk Check',     description: 'Orders at risk of missing schedule',          category: 'production', icon: 'Truck',                   prompt: 'Review pending dispatch orders and flag any at risk of missing schedule.' },
  { id: 'alerts',      label: 'Summarise Live Alerts',   description: 'All active production alerts by severity',     category: 'production', icon: 'AlertTriangle',           prompt: 'Summarise all active production alerts and their current severity.' },
  { id: 'maintenance', label: 'Maintenance Forecast',    description: 'Upcoming maintenance predictions',             category: 'production', icon: 'Wrench',                  prompt: 'Forecast upcoming maintenance needs based on current machine utilisation.' },
  { id: 'planning',    label: 'Production Plan Review',  description: 'Identify planning conflicts and gaps',         category: 'planning',   icon: 'BarChart3',               prompt: 'Review the current production plan and identify conflicts, gaps, or resource issues.' },
];

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<CommandCategory, { label: string; color: string }> = {
  analysis:   { label: 'AI Analysis',  color: '#64FFDA' },
  production: { label: 'Production',   color: '#F39C12' },
  quality:    { label: 'Quality',      color: '#2ECC71' },
  planning:   { label: 'Planning',     color: '#00B4D8' },
  navigation: { label: 'Navigate',     color: '#8892B0' },
  action:     { label: 'Actions',      color: '#9B59B6' },
};

const CATEGORY_ORDER: CommandCategory[] = ['analysis', 'production', 'quality', 'planning', 'navigation', 'action'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  // Simple substring match first
  if (t.includes(q)) return true;
  // Character sequence match
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AICommandBar({
  isOpen,
  onClose,
  onCommand,
  recentCommandIds = [],
  additionalCommands = [],
}: AICommandBarProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;

  const allCommands = useMemo(
    () => [...DEFAULT_COMMANDS, ...additionalCommands],
    [additionalCommands],
  );

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlighted(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Filtered + grouped results
  const filtered = useMemo(() => {
    const q = query.trim();
    return allCommands.filter(
      (c) => !c.disabled && (fuzzyMatch(c.label, q) || (c.description && fuzzyMatch(c.description, q))),
    );
  }, [allCommands, query]);

  const grouped = useMemo(() => {
    const q = query.trim();
    // If searching, show flat list
    if (q) return null;

    return CATEGORY_ORDER.reduce<Record<string, Command[]>>((acc, cat) => {
      const items = filtered.filter((c) => c.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    }, {});
  }, [filtered, query]);

  const flatList = useMemo(() => grouped ? Object.values(grouped).flat() : filtered, [grouped, filtered]);

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${highlighted}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlighted]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((p) => Math.min(p + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      const cmd = flatList[highlighted];
      if (cmd) handleSelect(cmd);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (cmd: Command) => {
    onCommand(cmd);
    onClose();
  };

  // Reset highlighted when results change
  useEffect(() => setHighlighted(0), [query]);

  // Recent commands
  const recentCommands = useMemo(
    () => allCommands.filter((c) => recentCommandIds.includes(c.id)).slice(0, 3),
    [allCommands, recentCommandIds],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(2,6,18,0.68)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[14vh] px-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="MITRA Command Palette"
              className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: 'linear-gradient(160deg, rgba(17,34,64,0.97) 0%, rgba(6,15,31,0.99) 100%)',
                border: '1px solid rgba(73,86,112,0.6)',
                boxShadow: '0 28px 72px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,255,218,0.06)',
              }}
              initial={{ scale: 0.97, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Search input */}
              <div
                className="flex items-center gap-3 border-b px-4 py-3.5"
                style={{ borderColor: 'rgba(73,86,112,0.4)' }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: '#8892B0' }} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search commands, analyses, modules…"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  style={{ color: '#E6F1FF' }}
                  aria-label="Search commands"
                  aria-controls={listId}
                  aria-activedescendant={`${uid}-item-${highlighted}`}
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd
                  className="shrink-0 rounded-md px-2 py-0.5 text-xs font-mono"
                  style={{ background: 'rgba(73,86,112,0.3)', color: '#8892B0' }}
                >
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div
                id={listId}
                ref={listRef}
                role="listbox"
                aria-label="Command results"
                className="max-h-[360px] overflow-y-auto p-2 scrollbar-hide"
              >
                {/* Recent commands (when not searching) */}
                {!query && recentCommands.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#495670' }}>
                      Recent
                    </p>
                    {recentCommands.map((cmd) => {
                      const Icon = ICON_MAP[cmd.icon ?? ''] ?? Sparkles;
                      const flatIdx = flatList.indexOf(cmd);
                      const isHi = highlighted === flatIdx;
                      return (
                        <CommandItem
                          key={cmd.id}
                          cmd={cmd}
                          Icon={Icon}
                          isHighlighted={isHi}
                          index={flatIdx}
                          uid={uid}
                          onSelect={handleSelect}
                          prefix={<Clock className="h-3 w-3 shrink-0" aria-hidden="true" />}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Grouped results */}
                {grouped
                  ? CATEGORY_ORDER.filter((c) => grouped[c]).map((cat) => {
                      const catCfg = CATEGORY_CONFIG[cat as CommandCategory];
                      return (
                        <div key={cat} className="mb-2">
                          <p
                            className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: catCfg.color, opacity: 0.7 }}
                          >
                            {catCfg.label}
                          </p>
                          {grouped[cat].map((cmd) => {
                            const Icon = ICON_MAP[cmd.icon ?? ''] ?? Sparkles;
                            const flatIdx = flatList.indexOf(cmd);
                            return (
                              <CommandItem
                                key={cmd.id}
                                cmd={cmd}
                                Icon={Icon}
                                isHighlighted={highlighted === flatIdx}
                                index={flatIdx}
                                uid={uid}
                                onSelect={handleSelect}
                              />
                            );
                          })}
                        </div>
                      );
                    })
                  : filtered.map((cmd, i) => {
                      const Icon = ICON_MAP[cmd.icon ?? ''] ?? Sparkles;
                      return (
                        <CommandItem
                          key={cmd.id}
                          cmd={cmd}
                          Icon={Icon}
                          isHighlighted={highlighted === i}
                          index={i}
                          uid={uid}
                          onSelect={handleSelect}
                        />
                      );
                    })
                }

                {/* Empty state */}
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-center" role="status">
                    <p className="text-sm" style={{ color: '#8892B0' }}>No commands match</p>
                    <p className="mt-0.5 text-xs" style={{ color: '#495670' }}>
                      Try "BOM", "quality", "delay" or "dispatch"
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between border-t px-4 py-2"
                style={{ borderColor: 'rgba(73,86,112,0.3)' }}
              >
                <div className="flex items-center gap-3 text-[10px]" style={{ color: '#495670' }}>
                  <span>↑↓ navigate</span>
                  <span>↵ select</span>
                  <span>Esc close</span>
                </div>
                <span className="text-[10px]" style={{ color: '#233554' }}>
                  MITRA AI · {filtered.length} commands
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── CommandItem ──────────────────────────────────────────────────────────────

interface CommandItemProps {
  cmd: Command;
  Icon: React.ElementType;
  isHighlighted: boolean;
  index: number;
  uid: string;
  onSelect: (cmd: Command) => void;
  prefix?: React.ReactNode;
}

function CommandItem({ cmd, Icon, isHighlighted, index, uid, onSelect, prefix }: CommandItemProps) {
  return (
    <button
      id={`${uid}-item-${index}`}
      role="option"
      aria-selected={isHighlighted}
      data-index={index}
      type="button"
      onClick={() => onSelect(cmd)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
      style={{
        background: isHighlighted ? 'rgba(100,255,218,0.07)' : 'transparent',
        border: isHighlighted ? '1px solid rgba(100,255,218,0.14)' : '1px solid transparent',
      }}
    >
      {/* Prefix (e.g. Clock for recent) */}
      {prefix && (
        <span style={{ color: '#495670' }}>{prefix}</span>
      )}

      {/* Icon */}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: isHighlighted ? 'rgba(100,255,218,0.12)' : 'rgba(73,86,112,0.25)',
        }}
        aria-hidden="true"
      >
        <Icon
          className="h-3.5 w-3.5"
          style={{ color: isHighlighted ? '#64FFDA' : '#8892B0' }}
        />
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium truncate"
          style={{ color: isHighlighted ? '#E6F1FF' : '#8892B0' }}
        >
          {cmd.label}
        </p>
        {cmd.description && (
          <p className="truncate text-[10px]" style={{ color: '#495670' }}>
            {cmd.description}
          </p>
        )}
      </div>

      {/* Shortcut */}
      {cmd.shortcut && (
        <kbd
          className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
          style={{
            background: 'rgba(73,86,112,0.3)',
            color: isHighlighted ? '#8892B0' : '#495670',
          }}
        >
          {cmd.shortcut}
        </kbd>
      )}

      {/* Arrow */}
      {isHighlighted && (
        <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: '#64FFDA' }} aria-hidden="true" />
      )}
    </button>
  );
}
