import { ReactNode } from 'react';

export const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  ACKNOWLEDGED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  CLOSED: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  CANCELLED: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  SUBMITTED: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  UNDER_REVIEW: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  REJECTED: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  SCHEDULED: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  HOLD: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  EXPIRED: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  CLAIMED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  EXTENDED: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  PLANNING: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  PACKED: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  SHIPPED: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  DELIVERED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
};

export function StatusBadge({ status, fallback = 'bg-slate-500/15 text-slate-300 border-slate-500/40' }: { status?: string | null; fallback?: string }) {
  const s = status ?? '';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${STATUS_BADGE[s.toUpperCase()] ?? fallback}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 text-slate-100 text-sm">{children}</div>
    </div>
  );
}

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

export const fmtMoney = (n?: number | null) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-300 flex items-center gap-2">
      <AlertTriangleIcon /> {message}
    </div>
  );
}

function AlertTriangleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function KpiTile({ label, value, tone = 'text-slate-300', hint }: { label: string; value: ReactNode; tone?: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputCls = 'w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500';

export const labelCls = 'block text-xs text-slate-400 mb-1';

export function ModalFooter({ onCancel, onConfirm, saving, confirmLabel = 'Save', danger = false }: {
  onCancel: () => void;
  onConfirm: () => void;
  saving?: boolean;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
      <button
        onClick={onConfirm}
        disabled={saving}
        className={`px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 ${
          danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
        }`}
      >
        {saving ? 'Saving…' : confirmLabel}
      </button>
    </div>
  );
}