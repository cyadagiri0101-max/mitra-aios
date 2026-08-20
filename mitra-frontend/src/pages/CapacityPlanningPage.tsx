import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Activity,
  AlertTriangle,
  Zap,
  TrendingUp,
  Sliders,
  ShieldAlert,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/Card';

interface CapacitySummary {
  horizon: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
  totalDesignDemandHours: number;
  theoreticalWorkstationCapacityHours: number;
  availableWorkstationCapacityHours: number;
  totalEngineerAvailableHours: number;
  skillConstrainedEligibleHours: number;
  allocatedHours: number;
  actualLoggedHours: number;
  remainingCapacityHours: number;
  capacityGapHours: number;
  averageEngineerUtilizationPct: number;
  averageWorkstationUtilizationPct: number;
  activeProjectsCount: number;
  activeWorkstationsCount: number;
  activeDesignEngineersCount: number;
  overloadedWorkstationsCount: number;
}

interface TimelineBucket {
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  demandHours: number;
  engineerCapacityHours: number;
  workstationCapacityHours: number;
  eligibleSkillCapacityHours: number;
  capacityGapHours: number;
  utilizationPct: number;
  status: 'OPTIMAL' | 'NEAR_CAPACITY' | 'OVERLOADED';
}

interface EngineerUtilization {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  department: string;
  skills: Array<{ skillName: string; proficiency: string }>;
  availableHours: number;
  allocatedHours: number;
  actualHours: number;
  allocatedUtilizationPct: number;
  actualUtilizationPct: number;
  remainingHours: number;
  isOverloaded: boolean;
  status: 'UNDERUTILIZED' | 'HEALTHY' | 'OVERLOADED';
}

interface Recommendation {
  id: string;
  recommendationType: string;
  title: string;
  reason: string;
  capacityGapHours: number;
  estimatedImpact: string;
  requiresApproval: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RiskAlert {
  id: string;
  riskType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  gapHours: number;
  recommendedMitigation: string;
}

export const CapacityPlanningPage: React.FC = () => {
  const [horizon, setHorizon] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [summary, setSummary] = useState<CapacitySummary | null>(null);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [utilization, setUtilization] = useState<EngineerUtilization[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [risks, setRisks] = useState<RiskAlert[]>([]);

  // What-if simulator states
  const [simAddEngineers, setSimAddEngineers] = useState<number>(1);
  const [simWeeklyHours, setSimWeeklyHours] = useState<number>(40);
  const [simAddWorkstations, setSimAddWorkstations] = useState<number>(0);
  const [simOutsourceHours, setSimOutsourceHours] = useState<number>(0);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const token = localStorage.getItem('token');
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  useEffect(() => {
    fetchAllData();
  }, [horizon]);

  const fetchAllData = async () => {
    try {
      const [sumRes, timeRes, utilRes, recRes, riskRes] = await Promise.all([
        api.get('/planning/capacity/summary', { params: { horizon } }),
        api.get('/planning/capacity/timeline', { params: { horizon } }),
        api.get('/planning/capacity/utilization'),
        api.get('/planning/capacity/recommendations'),
        api.get('/planning/capacity/risks'),
      ]);

      setSummary(sumRes.data);
      setTimeline(timeRes.data || []);
      setUtilization(utilRes.data || []);
      setRecommendations(recRes.data || []);
      setRisks(riskRes.data || []);
    } catch (err) {
      console.error('Failed to fetch capacity data', err);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await api.post('/planning/capacity/what-if', {
        addEngineers: Number(simAddEngineers),
        engineerWeeklyHours: Number(simWeeklyHours),
        addWorkstations: Number(simAddWorkstations),
        outsourceHours: Number(simOutsourceHours),
      });
      setSimulationResult(res.data);
    } catch (err) {
      console.error('Failed to run simulation', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Design Capacity Intelligence & Workload Leveling
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              Indicative demand curves
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Indicative time-distributed design demand curves, skill-constrained capacity, engineer utilization, and deterministic what-if simulations.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                horizon === h
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Capacity Overview Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Design Demand
              </span>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {summary.totalDesignDemandHours} hrs
              </span>
              <span className="text-xs text-slate-500">
                ({summary.activeProjectsCount} active projects)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logged Actuals: {summary.actualLoggedHours} hrs
            </p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Eligible Skill Capacity
              </span>
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">
                {summary.skillConstrainedEligibleHours} hrs
              </span>
              <span className="text-xs text-slate-500">
                ({summary.activeDesignEngineersCount} engineers)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Available Workstations: {summary.availableWorkstationCapacityHours} hrs
            </p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Capacity Deficit / Gap
              </span>
              <AlertTriangle
                className={`w-5 h-5 ${summary.capacityGapHours > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${summary.capacityGapHours > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
              >
                {summary.capacityGapHours} hrs
              </span>
              <span className="text-xs text-slate-500">
                {summary.capacityGapHours > 0 ? 'SHORTAGE' : 'BALANCED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Remaining Headroom: {summary.remainingCapacityHours} hrs
            </p>
          </Card>

          <Card className="p-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Average Utilization
              </span>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  summary.averageEngineerUtilizationPct > 100
                    ? 'text-rose-400'
                    : 'text-white'
                }`}
              >
                {summary.averageEngineerUtilizationPct}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  summary.averageEngineerUtilizationPct > 100
                    ? 'bg-rose-500'
                    : summary.averageEngineerUtilizationPct > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, summary.averageEngineerUtilizationPct)}%`,
                }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Multi-Project Demand vs Capacity Timeline Table */}
      <Card className="p-6 bg-slate-900/80 border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Indicative Time-Distributed Demand vs Capacity Curve ({horizon})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Period</th>
                <th className="p-3">Project Demand</th>
                <th className="p-3">Eligible Capacity</th>
                <th className="p-3">CAD Studio Capacity</th>
                <th className="p-3">Capacity Gap</th>
                <th className="p-3">Utilization %</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {timeline.map((bucket, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="p-3 font-medium text-white">{bucket.label}</td>
                  <td className="p-3 text-xs text-blue-400 font-semibold">
                    {bucket.demandHours} hrs
                  </td>
                  <td className="p-3 text-xs text-emerald-400 font-semibold">
                    {bucket.eligibleSkillCapacityHours} hrs
                  </td>
                  <td className="p-3 text-xs text-slate-400">
                    {bucket.workstationCapacityHours} hrs
                  </td>
                  <td className="p-3 text-xs">
                    <span
                      className={`font-semibold ${
                        bucket.capacityGapHours > 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {bucket.capacityGapHours > 0
                        ? `+${bucket.capacityGapHours}h deficit`
                        : '0h'}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-semibold">
                    <span
                      className={
                        bucket.utilizationPct > 100
                          ? 'text-rose-400'
                          : bucket.utilizationPct > 80
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {bucket.utilizationPct}%
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                        bucket.status === 'OVERLOADED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : bucket.status === 'NEAR_CAPACITY'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {bucket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Live Engineer Utilization Table */}
      <Card className="p-6 bg-slate-900/80 border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          Live Engineer Workload & Skill Matrix Utilization
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Engineer</th>
                <th className="p-3">Department / Role</th>
                <th className="p-3">Verified Skills</th>
                <th className="p-3">Allocated / Available</th>
                <th className="p-3">Utilization</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {utilization.map((u) => (
                <tr key={u.employeeId} className="hover:bg-slate-800/30">
                  <td className="p-3">
                    <div className="font-medium text-white">{u.fullName}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {u.employeeCode}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-slate-400">
                    <div>{u.department}</div>
                    <div className="text-slate-500">{u.designation}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {u.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-800 border border-slate-700 text-blue-300 px-1.5 py-0.5 rounded"
                        >
                          {s.skillName} ({s.proficiency})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    <span className="font-semibold text-white">
                      {u.allocatedHours}h
                    </span>{' '}
                    / {u.availableHours}h
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          u.isOverloaded ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {u.allocatedUtilizationPct}%
                      </span>
                      <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            u.isOverloaded
                              ? 'bg-rose-500'
                              : u.allocatedUtilizationPct > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, u.allocatedUtilizationPct)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                        u.status === 'OVERLOADED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : u.status === 'UNDERUTILIZED'
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* What-If Simulator & Recommendations Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interactive What-If Simulator */}
        <Card className="p-6 bg-slate-900/80 border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            Deterministic What-If Scenario Simulator
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Simulate staffing adjustments, CAD workstations, or stage outsourcing without modifying production planning data.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Add Engineers (+N)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={simAddEngineers}
                  onChange={(e) => setSimAddEngineers(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Hours / Week / Engineer
                </label>
                <input
                  type="number"
                  min="10"
                  max="60"
                  value={simWeeklyHours}
                  onChange={(e) => setSimWeeklyHours(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Add CAD Workstations (+N)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={simAddWorkstations}
                  onChange={(e) => setSimAddWorkstations(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Outsource Workload (-Hours)
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={simOutsourceHours}
                  onChange={(e) => setSimOutsourceHours(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {isSimulating ? 'Simulating...' : 'Run What-If Simulation'}
            </button>

            {/* Simulation Results Output */}
            {simulationResult && (
              <div className="p-4 bg-purple-950/40 border border-purple-800/50 rounded-xl space-y-2 mt-4 text-xs">
                <div className="flex items-center justify-between font-semibold text-purple-300">
                  <span>Simulation Summary</span>
                  <span>
                    Net Gap Resolved: {simulationResult.resolvedGapHours}h
                  </span>
                </div>
                <p className="text-slate-300">{simulationResult.explanation}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-800/40 text-[11px] text-slate-400">
                  <div>
                    Baseline Gap: {simulationResult.baselineSummary.capacityGapHours}h
                  </div>
                  <div>
                    Simulated Gap:{' '}
                    <span className="text-emerald-400 font-bold">
                      {simulationResult.simulatedSummary.capacityGapHours}h
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Deterministic Capacity Recommendations & Risk Alerts */}
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900/80 border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Capacity Recommendations
            </h2>

            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {rec.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        rec.priority === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {rec.recommendationType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{rec.reason}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">
                    Impact: {rec.estimatedImpact}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-slate-900/80 border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Active Capacity Risk Alerts
            </h2>

            <div className="space-y-3">
              {risks.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No active capacity risks detected.
                </div>
              ) : (
                risks.map((risk) => (
                  <div
                    key={risk.id}
                    className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-300">
                        {risk.title}
                      </span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold">
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {risk.description}
                    </p>
                    <p className="text-[11px] text-amber-300 mt-1">
                      Mitigation: {risk.recommendedMitigation}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
