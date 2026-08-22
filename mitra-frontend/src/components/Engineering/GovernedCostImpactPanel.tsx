import { DollarSign, Activity } from 'lucide-react';

export interface CostRow {
  category: string;
  description: string;
  quantity: string;
  rateSource: string;
  rate: string;
  cost: string | null;
  status: 'KNOWN' | 'ESTIMATED' | 'ASSUMED' | 'COST_NOT_CONFIGURED';
}

export interface ImpactRow {
  category: string;
  description: string;
  magnitude: 'HIGH' | 'MEDIUM' | 'LOW';
  certainty: 'OBSERVED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN';
}

interface GovernedCostImpactPanelProps {
  costRows?: CostRow[];
  totalExpected?: number | null;
  totalLow?: number | null;
  totalHigh?: number | null;
  currency?: string;
  impacts?: ImpactRow[];
}

const DEFAULT_COST_ROWS: CostRow[] = [
  {
    category: 'Material',
    description: 'ABS Resin volume adjustment (0.25 KG)',
    quantity: '0.25 KG',
    rateSource: 'Resin Master 2026',
    rate: '₹280/KG',
    cost: '₹70.00',
    status: 'KNOWN',
  },
  {
    category: 'Machining',
    description: 'Electrode EDM & CNC cavity rework',
    quantity: '3.50 HRS',
    rateSource: 'CNC 5-Axis Rate',
    rate: '₹1,500/HR',
    cost: '₹5,250.00',
    status: 'ESTIMATED',
  },
  {
    category: 'Tooling',
    description: 'Core pin & mold insert modification',
    quantity: '6.00 HRS',
    rateSource: 'Tooling Rate Master',
    rate: '₹450/HR',
    cost: '₹2,700.00',
    status: 'ESTIMATED',
  },
  {
    category: 'Quality',
    description: 'CMM first article dimensional inspection',
    quantity: '2.00 HRS',
    rateSource: 'Quality Lab Standard',
    rate: '₹400/HR',
    cost: '₹800.00',
    status: 'ESTIMATED',
  },
  {
    category: 'Schedule',
    description: '+4.5s cooling cycle overhead (1,000 shots)',
    quantity: '1.25 HRS',
    rateSource: 'Machine Overhead',
    rate: '₹400/HR',
    cost: '₹500.00',
    status: 'ESTIMATED',
  },
  {
    category: 'Rework',
    description: 'Bench polishing & fitment calibration',
    quantity: '2.00 HRS',
    rateSource: 'Shop Floor Rework Rate',
    rate: '₹340/HR',
    cost: '₹680.00',
    status: 'ESTIMATED',
  },
];

const DEFAULT_IMPACTS: ImpactRow[] = [
  {
    category: 'Manufacturability',
    description: 'Elevated polymer freeze-off and short-shot risk in thin 0.8mm wall sections.',
    magnitude: 'HIGH',
    certainty: 'LIKELY',
  },
  {
    category: 'Tooling Complexity',
    description: 'Requires EDM spark erosion electrode for core cavity modification.',
    magnitude: 'MEDIUM',
    certainty: 'LIKELY',
  },
  {
    category: 'Cycle Time',
    description: '+4.5s holding pressure and cooling delay per molding shot.',
    magnitude: 'LOW',
    certainty: 'POSSIBLE',
  },
  {
    category: 'Quality Risk',
    description: 'High probability of FADIR dimensional inspection rejection.',
    magnitude: 'HIGH',
    certainty: 'OBSERVED',
  },
];

export function GovernedCostImpactPanel({
  costRows = DEFAULT_COST_ROWS,
  totalExpected = 10000,
  totalLow = 8500,
  totalHigh = 12500,
  currency = 'INR',
  impacts = DEFAULT_IMPACTS,
}: GovernedCostImpactPanelProps) {
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const getCostStatusBadge = (status: string) => {
    switch (status) {
      case 'KNOWN':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'ESTIMATED':
        return 'bg-blue-950 text-blue-400 border-blue-800';
      case 'ASSUMED':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      case 'COST_NOT_CONFIGURED':
      default:
        return 'bg-rose-950 text-rose-400 border-rose-800';
    }
  };

  const getCertaintyBadge = (certainty: string) => {
    switch (certainty) {
      case 'OBSERVED':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'LIKELY':
        return 'bg-cyan-950 text-cyan-400 border-cyan-800';
      case 'POSSIBLE':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      default:
        return 'bg-slate-900 text-gray-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* 6-Category Governed Cost Synthesis */}
      <div className="glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Governed 6-Category Cost Synthesis
            </h3>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-gray-400">
              3-Point Range ({currency}):{' '}
              <span className="text-amber-400 font-bold">{currencySymbol}{totalLow?.toLocaleString() ?? '—'}</span> (Low) —{' '}
              <span className="text-emerald-400 font-bold">{currencySymbol}{totalExpected?.toLocaleString() ?? '—'}</span> (Expected) —{' '}
              <span className="text-rose-400 font-bold">{currencySymbol}{totalHigh?.toLocaleString() ?? '—'}</span> (High)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-gray-400">
              <tr>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Description</th>
                <th className="p-2.5">Quantity</th>
                <th className="p-2.5">Rate Source</th>
                <th className="p-2.5">Rate</th>
                <th className="p-2.5">Calculated Cost</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/50 text-slate-200">
              {costRows.map((row) => (
                <tr key={row.category} className="hover:bg-slate-900/40">
                  <td className="p-2.5 font-semibold text-white">{row.category}</td>
                  <td className="p-2.5 text-gray-300">{row.description}</td>
                  <td className="p-2.5 font-mono text-gray-400">{row.quantity}</td>
                  <td className="p-2.5 font-mono text-gray-400">{row.rateSource}</td>
                  <td className="p-2.5 font-mono text-gray-300">{row.rate}</td>
                  <td className="p-2.5 font-mono font-bold text-emerald-400">
                    {row.cost ?? 'COST_NOT_CONFIGURED'}
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getCostStatusBadge(
                        row.status,
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engineering Impact Matrix */}
      <div className="glass-panel rounded-xl p-4 border border-slate-700/60 bg-slate-950/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Cross-Domain Engineering Impact Assessment
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {impacts.length} Impact Domains Evaluated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {impacts.map((imp) => (
            <div
              key={imp.category}
              className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-100">{imp.category}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${
                        imp.magnitude === 'HIGH'
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      {imp.magnitude}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${getCertaintyBadge(
                        imp.certainty,
                      )}`}
                    >
                      {imp.certainty}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-300">{imp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
