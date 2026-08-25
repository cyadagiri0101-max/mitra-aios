import React, { useState } from 'react';
import { Network, Plus, Edit2 } from 'lucide-react';
import type {
  CrossProjectAllocationDto,
  CreateCrossProjectAllocationDto,
  UpdateAllocationStatusDto,
} from '../../services/engineeringApi';

interface CrossProjectAllocationPanelProps {
  allocations?: CrossProjectAllocationDto[];
  isLoading?: boolean;
  onCreateAllocation: (dto: CreateCrossProjectAllocationDto) => Promise<void>;
  onUpdateStatus: (allocationId: string, dto: UpdateAllocationStatusDto) => Promise<void>;
}

export const CrossProjectAllocationPanel: React.FC<CrossProjectAllocationPanelProps> = ({
  allocations = [],
  isLoading,
  onCreateAllocation,
  onUpdateStatus,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<CrossProjectAllocationDto | null>(null);

  // Form states
  const [projectId, setProjectId] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [engineerName, setEngineerName] = useState('');
  const [allocationRole, setAllocationRole] = useState('LEAD_DESIGNER');
  const [allocatedHours, setAllocatedHours] = useState(20);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [createRationale, setCreateRationale] = useState('');

  // Status update states
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'RELEASED' | 'OVERRIDDEN'>('RELEASED');
  const [statusRationale, setStatusRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !engineerId) return;

    try {
      setIsSubmitting(true);
      await onCreateAllocation({
        projectId,
        engineerId,
        engineerName: engineerName || `Engineer ${engineerId}`,
        allocationRole,
        allocatedHoursPerWeek: Number(allocatedHours),
        startDate,
        endDate,
        reviewRationale: createRationale || 'Assigned via Portfolio Control Tower',
      });
      setIsCreateOpen(false);
      setProjectId('');
      setEngineerId('');
      setEngineerName('');
      setCreateRationale('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation) return;

    try {
      setIsSubmitting(true);
      await onUpdateStatus(selectedAllocation.id, {
        status: newStatus,
        rationale: statusRationale,
      });
      setSelectedAllocation(null);
      setStatusRationale('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl animate-pulse space-y-3">
        <div className="h-6 w-1/3 bg-slate-800 rounded" />
        <div className="h-32 bg-slate-800/60 rounded" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'RELEASED':
        return 'bg-slate-700/60 text-slate-300 border-slate-600/40';
      case 'OVERRIDDEN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              Cross-Project Resource Allocations
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {allocations.length} Active Records
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Multi-Project Resource Assignments with Human Authorization Audit Trail
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          New Allocation
        </button>
      </div>

      {allocations.length === 0 ? (
        <div className="py-8 text-slate-500 text-center flex flex-col items-center justify-center">
          <Network className="w-8 h-8 mb-2 opacity-50 text-slate-400" />
          <p className="text-sm font-medium text-slate-400">No cross-project allocations registered.</p>
          <p className="text-xs text-slate-500 mt-1">Create an allocation to balance workload across programs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase font-mono text-[11px]">
              <tr>
                <th className="px-3 py-2.5 rounded-l">Engineer</th>
                <th className="px-3 py-2.5">Project</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Weekly Hours</th>
                <th className="px-3 py-2.5">Timeframe</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Reviewed By</th>
                <th className="px-3 py-2.5 text-right rounded-r">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allocations.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-3 font-medium text-slate-200">
                    {alloc.engineerName}
                    <span className="block text-[10px] text-slate-500 font-mono">{alloc.engineerId}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-cyan-300 font-semibold">{alloc.projectId}</td>
                  <td className="px-3 py-3 text-slate-300">{alloc.allocationRole}</td>
                  <td className="px-3 py-3 font-mono font-bold text-slate-200">{alloc.allocatedHoursPerWeek}h</td>
                  <td className="px-3 py-3 text-slate-400 text-[11px]">
                    {new Date(alloc.startDate).toLocaleDateString()} -{' '}
                    {new Date(alloc.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusBadge(alloc.allocationStatus)}`}>
                      {alloc.allocationStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-[11px]">
                    {alloc.reviewedBy || 'SYSTEM'}
                    {alloc.reviewRationale && (
                      <span className="block text-[10px] text-slate-500 truncate max-w-[140px]" title={alloc.reviewRationale}>
                        {alloc.reviewRationale}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedAllocation(alloc);
                        setNewStatus(alloc.allocationStatus === 'PROPOSED' ? 'ACTIVE' : alloc.allocationStatus);
                        setStatusRationale(alloc.reviewRationale || '');
                      }}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Update Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Allocation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-lg font-bold text-slate-100 mb-1">Create Cross-Project Allocation</h4>
            <p className="text-xs text-slate-400 mb-4">
              Assign an engineer to a project with workload hour boundaries.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Project ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BM289"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Engineer ID / Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ENG_SR_01"
                    value={engineerId}
                    onChange={(e) => setEngineerId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Engineer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Allocation Role</label>
                  <select
                    value={allocationRole}
                    onChange={(e) => setAllocationRole(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LEAD_DESIGNER">Lead Designer</option>
                    <option value="TOOL_DESIGNER">Tool Designer</option>
                    <option value="CAVITY_MODELER">Cavity Modeler</option>
                    <option value="DETAILING_ENGINEER">Detailing Engineer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hours / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={allocatedHours}
                    onChange={(e) => setAllocatedHours(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Review Rationale / Justification</label>
                <textarea
                  rows={2}
                  placeholder="State engineering justification for cross-project allocation..."
                  value={createRationale}
                  onChange={(e) => setCreateRationale(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Allocation Status Modal */}
      {selectedAllocation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-lg font-bold text-slate-100 mb-1">Update Allocation Status</h4>
            <p className="text-xs text-slate-400 mb-4">
              Transition status for {selectedAllocation.engineerName} on {selectedAllocation.projectId}.
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Active assignment)</option>
                  <option value="RELEASED">RELEASED (Assignment complete)</option>
                  <option value="OVERRIDDEN">OVERRIDDEN (Manual management override)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status Rationale</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide audit rationale for status change..."
                  value={statusRationale}
                  onChange={(e) => setStatusRationale(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAllocation(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
