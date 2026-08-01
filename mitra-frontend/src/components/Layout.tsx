/**
 * Layout — Application shell
 *
 * Changes from the original (all minimal):
 *  1. Wrapped in <AIWorkspaceProvider> so all pages have workspace access
 *  2. LayoutInner reads openCommandBar from context and passes it to Header
 *     → ⌘K now opens the AI Command Bar instead of SearchOverlay
 *  3. <AIWorkspace /> mounted at the end: renders the command-bar overlay
 *     and the execution-preview modal (both portal-level, z-50+)
 *
 * SearchOverlay is kept mounted (accessible via direct search click in Header)
 * to avoid breaking any existing search-result references.
 */

import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SystemStatusBar } from './SystemStatusBar';
import {
  AIWorkspaceProvider,
  useAIWorkspace,
} from '../context/AIWorkspaceContext';

// AI overlays are heavy (three.js robot, speech recognition) — load on demand
const AIDock = lazy(() => import('./AI/AIDock').then((m) => ({ default: m.AIDock })));
const AIWorkspace = lazy(() => import('./AI/AIWorkspace').then((m) => ({ default: m.AIWorkspace })));
// Search overlay is only needed when the user opens search
const SearchOverlay = lazy(() => import('./SearchOverlay').then((m) => ({ default: m.SearchOverlay })));

// ─── Inner layout (consumes AIWorkspaceContext) ───────────────────────────────

function LayoutInner() {
  const { openCommandBar } = useAIWorkspace();
  const location = useLocation();

  // SearchOverlay kept for any direct programmatic triggers
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen relative" style={{ backgroundColor: '#0A192F' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/*
         * onSearchOpen is now openCommandBar.
         * Header's ⌘K listener calls this → opens AI Command Bar.
         * The search-bar button also calls this → AI Command Bar
         * (which subsumes search, analysis commands, and navigation).
         */}
        <Header onSearchOpen={openCommandBar} />

        <main
          className="flex-1 overflow-y-auto p-6 xl:pr-[392px]"
          style={{ backgroundColor: '#0A192F' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <SystemStatusBar
          status={{
            system: 'healthy',
            database: 'connected',
            minio: 'online',
            ai: 'running',
            version: 'v3.2.0',
            uptime: '14d 2h',
          }}
        />
      </div>

      {/* Existing right-rail AI assistant — unchanged */}
      <Suspense fallback={null}>
        <AIDock />
      </Suspense>

      {/* SearchOverlay: kept for programmatic access */}
      <Suspense fallback={null}>
        <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </Suspense>

      {/*
       * AIWorkspace: renders the ⌘K command palette overlay and the
       * execution-preview confirmation modal. Both are invisible when closed.
       */}
      <Suspense fallback={null}>
        <AIWorkspace />
      </Suspense>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function Layout() {
  return (
    <AIWorkspaceProvider>
      <LayoutInner />
    </AIWorkspaceProvider>
  );
}
