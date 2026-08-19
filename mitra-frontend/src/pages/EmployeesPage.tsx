import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import {
  Users, Award, Calendar, Plus, Search, Filter,
  AlertTriangle, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'employees' | 'skills' | 'availability';

export function EmployeesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('employees');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showAssignSkillModal, setShowAssignSkillModal] = useState(false);
  const [showAddAvailabilityModal, setShowAddAvailabilityModal] = useState(false);
  const [showEmployeeDetailModal, setShowEmployeeDetailModal] = useState(false);

  const queryClient = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: employeesData, isLoading: loadingEmployees, error: employeesError } = useQuery({
    queryKey: ['employees', search, statusFilter],
    queryFn: () =>
      api
        .get('/employees', {
          params: { search: search || undefined, status: statusFilter || undefined, limit: 50 },
        })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: skillsData, isLoading: loadingSkills, error: skillsError } = useQuery({
    queryKey: ['skills'],
    queryFn: () => api.get('/skills', { params: { limit: 100 } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: employeeSkillsData } = useQuery({
    queryKey: ['employee-skills', selectedEmployee?.id],
    queryFn: () =>
      selectedEmployee?.id
        ? api.get(`/employees/${selectedEmployee.id}/skills`).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!selectedEmployee?.id,
  });

  const { data: availabilityData } = useQuery({
    queryKey: ['availability', selectedEmployee?.id],
    queryFn: () =>
      selectedEmployee?.id
        ? api.get(`/employees/${selectedEmployee.id}/availability`).then((r) => r.data)
        : Promise.resolve({ data: [] }),
    enabled: !!selectedEmployee?.id,
  });

  // ── Form States ────────────────────────────────────────────────────────────
  const [employeeForm, setEmployeeForm] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    designation: 'Mold Design Engineer',
    status: 'ACTIVE',
  });

  const [skillForm, setSkillForm] = useState({
    code: '',
    name: '',
    category: 'Design',
    description: '',
  });

  const [assignSkillForm, setAssignSkillForm] = useState({
    skillId: '',
    proficiencyLevel: 'INTERMEDIATE',
    certification: '',
    notes: '',
  });

  const [availabilityForm, setAvailabilityForm] = useState({
    workDate: new Date().toISOString().split('T')[0],
    availabilityType: 'AVAILABLE',
    availableHours: 8,
    notes: '',
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createEmployeeMutation = useMutation({
    mutationFn: (data: typeof employeeForm) => api.post('/employees', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddEmployeeModal(false);
      setEmployeeForm({
        employeeCode: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: 'Engineering',
        designation: 'Mold Design Engineer',
        status: 'ACTIVE',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create employee');
    },
  });

  const createSkillMutation = useMutation({
    mutationFn: (data: typeof skillForm) => api.post('/skills', data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Skill created successfully');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setShowAddSkillModal(false);
      setSkillForm({ code: '', name: '', category: 'Design', description: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create skill');
    },
  });

  const assignSkillMutation = useMutation({
    mutationFn: (data: typeof assignSkillForm) =>
      api.post(`/employees/${selectedEmployee.id}/skills`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Skill assigned to employee');
      queryClient.invalidateQueries({ queryKey: ['employee-skills', selectedEmployee?.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAssignSkillModal(false);
      setAssignSkillForm({ skillId: '', proficiencyLevel: 'INTERMEDIATE', certification: '', notes: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign skill');
    },
  });

  const removeSkillMutation = useMutation({
    mutationFn: (skillId: string) =>
      api.delete(`/employees/${selectedEmployee.id}/skills/${skillId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Skill removed');
      queryClient.invalidateQueries({ queryKey: ['employee-skills', selectedEmployee?.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove skill');
    },
  });

  const addAvailabilityMutation = useMutation({
    mutationFn: (data: typeof availabilityForm) =>
      api.post(`/employees/${selectedEmployee.id}/availability`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Availability record added');
      queryClient.invalidateQueries({ queryKey: ['availability', selectedEmployee?.id] });
      setShowAddAvailabilityModal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record availability');
    },
  });

  const employees = employeesData?.data || [];
  const skills = skillsData?.data || [];

  // ── Columns ────────────────────────────────────────────────────────────────
  const employeeColumns = [
    {
      key: 'employeeCode',
      header: 'Emp Code',
      render: (e: any) => (
        <span className="font-mono font-semibold text-accent" style={{ color: 'var(--color-accent)' }}>
          {e.employeeCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (e: any) => (
        <div>
          <div className="font-medium text-gray-100">{`${e.firstName} ${e.lastName}`}</div>
          <div className="text-xs text-gray-400">{e.email || 'No email'}</div>
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (e: any) => e.department || '—' },
    { key: 'designation', header: 'Designation', render: (e: any) => e.designation || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (e: any) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
            e.status === 'ACTIVE'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          {e.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (e: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedEmployee(e);
              setShowEmployeeDetailModal(true);
            }}
            className="px-2.5 py-1 text-xs rounded bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-colors"
          >
            Skills & Availability
          </button>
        </div>
      ),
    },
  ];

  const skillColumns = [
    {
      key: 'code',
      header: 'Skill Code',
      render: (s: any) => <span className="font-mono text-accent font-semibold">{s.code}</span>,
    },
    { key: 'name', header: 'Skill Name' },
    {
      key: 'category',
      header: 'Category',
      render: (s: any) => (
        <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {s.category || 'General'}
        </span>
      ),
    },
    { key: 'description', header: 'Description', render: (s: any) => s.description || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (s: any) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            s.status === 'ACTIVE' ? 'text-emerald-400' : 'text-gray-400'
          }`}
        >
          {s.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-accent" style={{ color: 'var(--color-accent)' }} />
            People & Engineering Resources
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Foundational Employee Master, Skill Matrix, and Resource Availability for MITRA Capacity Planning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'employees' && (
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-2 transition-colors shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
          {activeTab === 'skills' && (
            <button
              onClick={() => setShowAddSkillModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-2 transition-colors shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Add Skill
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'employees'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" /> Employees & Engineers ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'skills'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Award className="w-4 h-4" /> Skill Master ({skills.length})
        </button>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-80 bg-slate-900/60 border border-white/10 rounded-lg px-3 py-1.5">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search code, name, designation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-0 text-sm text-gray-100 focus:outline-none w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {employeesError ? (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Failed to load employees.
              </div>
            ) : (
              <DataTable columns={employeeColumns} data={employees} loading={loadingEmployees} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-200">Registered Engineering & Manufacturing Skills</h3>
            </div>
          </CardHeader>
          <CardContent>
            {skillsError ? (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Failed to load skill master.
              </div>
            ) : (
              <DataTable columns={skillColumns} data={skills} loading={loadingSkills} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal: Add Employee */}
      <Modal isOpen={showAddEmployeeModal} onClose={() => setShowAddEmployeeModal(false)} title="Add New Employee / Resource">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createEmployeeMutation.mutate(employeeForm);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Employee Code *</label>
              <input
                type="text"
                required
                placeholder="ENG-1001"
                value={employeeForm.employeeCode}
                onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Department</label>
              <input
                type="text"
                placeholder="Design / Production / Quality"
                value={employeeForm.department}
                onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={employeeForm.firstName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={employeeForm.lastName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                placeholder="engineer@mitra.local"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Designation</label>
              <input
                type="text"
                placeholder="Senior Mold Designer"
                value={employeeForm.designation}
                onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddEmployeeModal(false)}
              className="px-4 py-2 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEmployeeMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            >
              {createEmployeeMutation.isPending ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Skill */}
      <Modal isOpen={showAddSkillModal} onClose={() => setShowAddSkillModal(false)} title="Register New Skill">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSkillMutation.mutate(skillForm);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Skill Code *</label>
              <input
                type="text"
                required
                placeholder="CAD_MOLD_01"
                value={skillForm.code}
                onChange={(e) => setSkillForm({ ...skillForm, code: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Category</label>
              <select
                value={skillForm.category}
                onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              >
                <option value="Design">Design</option>
                <option value="Tooling">Tooling</option>
                <option value="Machining">Machining (CNC/EDM)</option>
                <option value="Quality">Quality & Metrology</option>
                <option value="Process Planning">Process Planning</option>
                <option value="Trials">Trials & Injection</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Skill Name *</label>
            <input
              type="text"
              required
              placeholder="Moldflow Simulation & Cooling Analysis"
              value={skillForm.name}
              onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Detailed skill capability and scope..."
              value={skillForm.description}
              onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddSkillModal(false)}
              className="px-4 py-2 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSkillMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            >
              {createSkillMutation.isPending ? 'Saving...' : 'Save Skill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Employee Profile / Skills & Availability */}
      {selectedEmployee && (
        <Modal
          isOpen={showEmployeeDetailModal}
          onClose={() => setShowEmployeeDetailModal(false)}
          title={`Resource Profile: ${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeCode})`}
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header info */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div><span className="text-gray-400">Designation:</span> <span className="text-gray-100 font-medium">{selectedEmployee.designation || '—'}</span></div>
              <div><span className="text-gray-400">Department:</span> <span className="text-gray-100 font-medium">{selectedEmployee.department || '—'}</span></div>
              <div><span className="text-gray-400">Status:</span> <span className="text-emerald-400 font-medium">{selectedEmployee.status}</span></div>
            </div>

            {/* Skills section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-accent" /> Assigned Skills ({employeeSkillsData?.length || 0})
                </h4>
                <button
                  onClick={() => setShowAssignSkillModal(true)}
                  className="px-2.5 py-1 text-xs rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign Skill
                </button>
              </div>

              {employeeSkillsData?.length === 0 ? (
                <div className="p-3 text-xs text-gray-400 text-center bg-slate-900/40 rounded border border-white/5">
                  No skills assigned yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeSkillsData?.map((es: any) => (
                    <div
                      key={es.id}
                      className="p-3 bg-slate-900/60 rounded border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-gray-100">{es.skill?.name || 'Skill'} ({es.skill?.code})</div>
                        <div className="text-gray-400 mt-0.5 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {es.proficiencyLevel}
                          </span>
                          {es.certification && <span>Cert: {es.certification}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeSkillMutation.mutate(es.skillId)}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                        title="Remove Skill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Availability section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-accent" /> Availability & Planned Capacity
                </h4>
                <button
                  onClick={() => setShowAddAvailabilityModal(true)}
                  className="px-2.5 py-1 text-xs rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Availability
                </button>
              </div>

              {availabilityData?.data?.length === 0 ? (
                <div className="p-3 text-xs text-gray-400 text-center bg-slate-900/40 rounded border border-white/5">
                  No availability records logged.
                </div>
              ) : (
                <div className="space-y-2">
                  {availabilityData?.data?.map((av: any) => (
                    <div
                      key={av.id}
                      className="p-2.5 bg-slate-900/60 rounded border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-gray-200">{av.workDate}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            av.availabilityType === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : av.availabilityType === 'PLANNED'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {av.availabilityType}
                        </span>
                        <span className="text-gray-400">{av.availableHours ?? 8} hrs</span>
                      </div>
                      {av.notes && <span className="text-gray-400 italic text-[11px] truncate max-w-xs">{av.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Assign Skill to Employee */}
      <Modal isOpen={showAssignSkillModal} onClose={() => setShowAssignSkillModal(false)} title="Assign Skill to Employee">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignSkillMutation.mutate(assignSkillForm);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Select Skill *</label>
            <select
              required
              value={assignSkillForm.skillId}
              onChange={(e) => setAssignSkillForm({ ...assignSkillForm, skillId: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            >
              <option value="">-- Choose Skill --</option>
              {skills.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Proficiency Level *</label>
            <select
              value={assignSkillForm.proficiencyLevel}
              onChange={(e) => setAssignSkillForm({ ...assignSkillForm, proficiencyLevel: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Certification (optional)</label>
            <input
              type="text"
              placeholder="e.g. Mastercam Expert Certified"
              value={assignSkillForm.certification}
              onChange={(e) => setAssignSkillForm({ ...assignSkillForm, certification: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAssignSkillModal(false)}
              className="px-4 py-2 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignSkillMutation.isPending || !assignSkillForm.skillId}
              className="px-4 py-2 text-xs font-medium rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            >
              {assignSkillMutation.isPending ? 'Assigning...' : 'Assign Skill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Availability */}
      <Modal isOpen={showAddAvailabilityModal} onClose={() => setShowAddAvailabilityModal(false)} title="Record Resource Availability">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addAvailabilityMutation.mutate(availabilityForm);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Work Date *</label>
            <input
              type="date"
              required
              value={availabilityForm.workDate}
              onChange={(e) => setAvailabilityForm({ ...availabilityForm, workDate: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Availability Type</label>
              <select
                value={availabilityForm.availabilityType}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, availabilityType: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              >
                <option value="AVAILABLE">Available</option>
                <option value="PLANNED">Planned / Allocated</option>
                <option value="UNAVAILABLE">Unavailable / Leave</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Available Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={availabilityForm.availableHours}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, availableHours: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Assigned to Mold Project tooling prep"
              value={availabilityForm.notes}
              onChange={(e) => setAvailabilityForm({ ...availabilityForm, notes: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddAvailabilityModal(false)}
              className="px-4 py-2 text-xs font-medium rounded bg-white/5 hover:bg-white/10 text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addAvailabilityMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            >
              {addAvailabilityMutation.isPending ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
