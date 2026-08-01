import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listTeams, createTeam, removeTeam, addTeamMember, removeTeamMember, getTeamAvailability, listDepartments, getProject } from '../utils/projectApi';
import { Card, CardContent } from '../components/Card';
import { Modal } from '../components/Modal';
import { ArrowLeft, Plus, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const teamSchema = z.object({
  name: z.string().min(2, 'Team name required').max(100),
  department: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

const memberSchema = z.object({
  userId: z.string().min(1, 'User required'),
  role: z.string().optional().or(z.literal('')),
  capacityPct: z.string().optional().or(z.literal('')),
});

export function ProjectTeamsPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [teamModal, setTeamModal] = useState(false);
  const [memberTeamId, setMemberTeamId] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ['teams', id], queryFn: () => listTeams(id).then(r => r.data) });
  const { data: availabilityData } = useQuery({ queryKey: ['availability', id], queryFn: () => getTeamAvailability(id).then(r => r.data), enabled: !!id });
  const { data: departmentsData } = useQuery({ queryKey: ['departments'], queryFn: () => listDepartments().then(r => r.data) });
  const { data: projectData } = useQuery({ queryKey: ['project', id], queryFn: () => getProject(id).then(r => r.data) });

  const teams = data?.data ?? data ?? [];
  const availability = Array.isArray(availabilityData) ? availabilityData : availabilityData?.data ?? [];
  const departments = departmentsData?.data ?? departmentsData ?? [];
  const project = projectData?.data ?? projectData;

  const teamForm = useForm({ resolver: zodResolver(teamSchema) });
  const memberForm = useForm({ resolver: zodResolver(memberSchema) });

  const createMutation = useMutation({
    mutationFn: (payload: any) => createTeam(id, payload),
    onSuccess: () => { toast.success('Team created'); queryClient.invalidateQueries({ queryKey: ['teams', id] }); queryClient.invalidateQueries({ queryKey: ['availability', id] }); setTeamModal(false); teamForm.reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Create failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (tid: string) => removeTeam(id, tid),
    onSuccess: () => { toast.success('Team removed'); queryClient.invalidateQueries({ queryKey: ['teams', id] }); queryClient.invalidateQueries({ queryKey: ['availability', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Remove failed'),
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload: any) => addTeamMember(id, memberTeamId!, payload),
    onSuccess: () => { toast.success('Member added'); queryClient.invalidateQueries({ queryKey: ['teams', id] }); queryClient.invalidateQueries({ queryKey: ['availability', id] }); setMemberTeamId(null); memberForm.reset(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Add member failed'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ memberId }: any) => removeTeamMember(id, memberId),
    onSuccess: () => { toast.success('Member removed'); queryClient.invalidateQueries({ queryKey: ['teams', id] }); queryClient.invalidateQueries({ queryKey: ['availability', id] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Remove member failed'),
  });

  return (
    <div className="space-y-6">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name ?? 'project'}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams & Capacity</h1>
          <p className="mt-2 text-sm text-slate-400">{teams.length} teams · capacity and utilization per member.</p>
        </div>
        <button className="btn-primary" onClick={() => setTeamModal(true)}><Plus className="w-4 h-4 mr-2" /> New Team</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teams.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="py-10 text-center text-slate-400">No teams yet — create one to start planning capacity.</CardContent></Card>
        )}
        {teams.map((team: any) => {
          const members = team.members ?? [];
          const load = availability.filter((a: any) => a.teamId === team.id || a.team?.id === team.id);
          return (
            <Card key={team.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{team.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{team.department ?? 'General'} · {team.description ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-sky-300" title="Add member" onClick={() => { setMemberTeamId(team.id); memberForm.reset(); }}>
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-rose-300" title="Delete team" onClick={() => { if (confirm('Delete team?')) removeMutation.mutate(team.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {members.length === 0 && <p className="text-sm text-slate-600">No members.</p>}
                  {members.map((m: any) => {
                    const av = load.find((a: any) => (a.userId === m.userId) || (a.user?.id === m.userId));
                    const pct = av?.availablePct ?? av?.availabilityPct ?? null;
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/70 border border-white/5 px-3 py-2">
                        <div>
                          <p className="text-sm text-slate-200">{m.user?.name ?? m.user?.username ?? m.user?.email ?? 'Member'}</p>
                          <p className="text-xs text-slate-500">{m.role ?? 'Member'} {m.capacityPct != null && `· ${m.capacityPct}% capacity`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pct != null && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div className={`h-full ${pct >= 60 ? 'bg-green-500' : pct >= 30 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                              <span className="text-xs text-slate-400">{pct}%</span>
                            </div>
                          )}
                          {pct != null && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pct < 30 ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>{pct < 30 ? 'OVERLOADED' : 'AVAILABLE'}</span>}
                          <button className="p-1 rounded-md border border-white/10 text-slate-400 hover:text-rose-300" onClick={() => removeMemberMutation.mutate({ teamId: team.id, memberId: m.id })}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={teamModal} onClose={() => setTeamModal(false)} title="New Team">
        <form onSubmit={teamForm.handleSubmit((d) => createMutation.mutate({ ...d, department: d.department || null }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team name *</label>
            <input {...teamForm.register('name')} className="input-field" placeholder="e.g. Mold Design Team" />
            {teamForm.formState.errors.name && <p className="mt-1 text-xs text-red-600">{teamForm.formState.errors.name.message?.toString()}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select {...teamForm.register('department')} className="input-field">
              <option value="">None</option>
              {departments.map((d: any) => <option key={d.id} value={d.code ?? d.name}>{d.code ?? d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input {...teamForm.register('description')} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setTeamModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>Create</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!memberTeamId} onClose={() => setMemberTeamId(null)} title="Add Team Member">
        <form onSubmit={memberForm.handleSubmit((d) => addMemberMutation.mutate({ ...d, role: d.role || null, capacityPct: d.capacityPct ? Number(d.capacityPct) : null }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
            <input {...memberForm.register('userId')} className="input-field" placeholder="UUID of the user (from user management)" />
            {memberForm.formState.errors.userId && <p className="mt-1 text-xs text-red-600">{memberForm.formState.errors.userId.message?.toString()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input {...memberForm.register('role')} className="input-field" placeholder="e.g. Lead" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity %</label>
              <input type="number" min="0" max="100" {...memberForm.register('capacityPct')} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setMemberTeamId(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={addMemberMutation.isPending}>Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
