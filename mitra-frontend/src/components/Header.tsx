import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, LogOut, Command, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function Header({ onSearchOpen }: { onSearchOpen: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchOpen]);

  return (
    <header
      className="px-6 py-3 flex items-center justify-between sticky top-0 z-30"
      style={{ backgroundColor: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--color-text)' }}>
            MITRA AI Production Intelligence Engine
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border"
            style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', color: 'var(--color-success)', borderColor: 'rgba(46, 204, 113, 0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)' }} />
            Operational
          </span>
        </div>

        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors border"
          style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-deep)', borderColor: 'var(--color-border)' }}
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search anything...</span>
          <span className="sm:hidden">Search...</span>
          <div className="hidden md:flex items-center gap-1 ml-2">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono border rounded"
              style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>Ctrl</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono border rounded"
              style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>K</kbd>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm hidden md:block font-mono" style={{ color: 'var(--color-text-secondary)' }}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
        </span>

        <button
          onClick={() => navigate('/ai-assistant')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{ backgroundColor: 'rgba(100, 255, 218, 0.1)', color: 'var(--color-accent)', border: '1px solid rgba(100, 255, 218, 0.2)' }}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Copilot</span>
        </button>

        <button className="relative p-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-error)' }} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(s => !s)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
            style={{ color: 'var(--color-text)' }}
            aria-haspopup="true"
            aria-expanded={showDropdown}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg-deep)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{user?.name || 'Admin User'}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{user?.role || 'Administrator'}</p>
            </div>
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl py-2 z-50"
                style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{user?.name || 'Admin User'}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{user?.email || 'admin@mitra.local'}</p>
                </div>
                <button
                  onClick={() => { setShowDropdown(false); navigate('/settings'); }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                  style={{ color: 'var(--color-text)' }}
                >
                  <Command className="w-4 h-4" /> Settings
                </button>
                <button
                  onClick={() => { setShowDropdown(false); logout(); }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                  style={{ color: 'var(--color-error)' }}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
