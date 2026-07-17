import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({ columns, data, loading, onRowClick }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm mt-2">Loading…</p>
      </div>
    );
  }
  if (!data?.length) {
    return (
      <div className="p-12 text-center">
        <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm text-slate-300 font-medium">No data available</p>
        <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/80 shadow-sm shadow-cyan-500/5">
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-slate-900/90">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {data.map((item, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'hover:bg-slate-900/80 cursor-pointer transition-colors' : ''}
            >
              {columns.map(col => (
                <td key={col.key} className="px-6 py-4 text-sm text-slate-200 max-w-xs truncate">
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
