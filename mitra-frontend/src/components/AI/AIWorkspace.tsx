/**
 * AIWorkspace
 *
 * The overlay shell for the AI workspace. Mounts inside <Layout> and
 * renders portal-level widgets that sit above all page content:
 *
 *   • AICommandBar   — full-screen ⌘K command palette
 *   • AIExecutionPreview — confirmation modal before executing an action
 *
 * All state is owned by AIWorkspaceContext (no local state here).
 * Wire once in Layout.tsx — it renders nothing when nothing is open.
 *
 * Usage:
 *   // Inside <AIWorkspaceProvider>:
 *   <AIWorkspace />
 */

import { useAIWorkspace } from '../../context/AIWorkspaceContext';
import { AICommandBar } from './AICommandBar';
import { AIExecutionPreview } from './AIExecutionPreview';

export function AIWorkspace() {
  const {
    isCommandBarOpen,
    closeCommandBar,
    handleCommand,
    recentCommandIds,

    executionPreview,
    isExecutingPreviewId,
    closeExecutionPreview,
    confirmExecution,
  } = useAIWorkspace();

  return (
    <>
      {/* ── Global AI command palette (⌘K) ────────────────────────────── */}
      <AICommandBar
        isOpen={isCommandBarOpen}
        onClose={closeCommandBar}
        onCommand={command => void handleCommand(command)}
        recentCommandIds={recentCommandIds}
      />

      {/* ── Action execution confirmation modal ─────────────────────────── */}
      <AIExecutionPreview
        action={executionPreview}
        isOpen={executionPreview !== null}
        isExecuting={
          executionPreview !== null &&
          isExecutingPreviewId === executionPreview.id
        }
        onConfirm={id => void confirmExecution(id)}
        onCancel={closeExecutionPreview}
      />
    </>
  );
}
