import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-panel rounded-3xl border-white/10 shadow-sm shadow-cyan-500/10 ${className}`.trim()}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-b border-white/10 text-slate-100 ${className}`.trim()}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-white ${className}`.trim()}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 text-slate-300 ${className}`.trim()}>
      {children}
    </div>
  );
}
