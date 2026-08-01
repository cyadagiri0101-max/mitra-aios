import { api } from './api';

// ── Projects ────────────────────────────────────────────────────────────────

export interface ProjectQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  projectType?: string;
  riskLevel?: string;
  priority?: string;
  businessUnit?: string;
  customerId?: string;
  stage?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export function listProjects(q: ProjectQuery = {}) {
  return api.get('/project', { params: q });
}

export function getProject(id: string) {
  return api.get(`/project/${id}`);
}

export function createProject(data: Record<string, unknown>) {
  return api.post('/project', data);
}

export function updateProject(id: string, data: Record<string, unknown>) {
  return api.patch(`/project/${id}`, data);
}

export function removeProject(id: string) {
  return api.delete(`/project/${id}`);
}

export function getProjectStats() {
  return api.get('/project/dashboard/stats');
}

export function getProjectHealth(id: string) {
  return api.get(`/project/${id}/health`);
}

export function refreshProjectHealth(id: string) {
  return api.post(`/project/${id}/admin/refresh-health`);
}

export function getProjectActivity(id: string, page = 1, limit = 50) {
  return api.get(`/project/${id}/activity`, { params: { page, limit } });
}

// ── Workflow (DB-driven) ────────────────────────────────────────────────────

export function getProjectWorkflow(id: string) {
  return api.get(`/project/${id}/workflow`);
}

export function executeWorkflowTransition(id: string, transitionId: string, remarks?: string) {
  return api.post(`/project/${id}/workflow/transition`, { transitionId, remarks });
}

export function transitionProjectStage(id: string, toStage: string, remarks?: string) {
  return api.post(`/project/${id}/transition`, { toStage, remarks });
}

// ── Milestones ──────────────────────────────────────────────────────────────

export function listMilestones(projectId: string) {
  return api.get(`/project/${projectId}/milestones`);
}

export function updateMilestone(projectId: string, id: string, data: Record<string, unknown>) {
  return api.patch(`/project/${projectId}/milestones/${id}`, data);
}

export function completeMilestone(projectId: string, id: string, data: { actualDate?: string; remarks?: string }) {
  return api.post(`/project/${projectId}/milestones/${id}/complete`, data);
}

export function approveMilestone(projectId: string, id: string) {
  return api.post(`/project/${projectId}/milestones/${id}/approve`, {});
}

export function removeMilestone(projectId: string, id: string) {
  return api.delete(`/project/${projectId}/milestones/${id}`);
}

export function listMilestoneTemplates() {
  return api.get('/project/:projectId/milestones/templates/all'.replace('/:projectId', '') + '');
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export interface TaskQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  milestoneId?: string;
  subtasks?: boolean;
  parentTaskId?: string;
}

export function listTasks(projectId: string, q: TaskQuery = {}) {
  return api.get(`/project/${projectId}/tasks`, { params: q });
}

export function getTask(projectId: string, id: string) {
  return api.get(`/project/${projectId}/tasks/${id}`);
}

export function createTask(projectId: string, data: Record<string, unknown>) {
  return api.post(`/project/${projectId}/tasks`, data);
}

export function updateTask(projectId: string, id: string, data: Record<string, unknown>) {
  return api.patch(`/project/${projectId}/tasks/${id}`, data);
}

export function changeTaskStatus(projectId: string, id: string, status: string, note?: string) {
  return api.patch(`/project/${projectId}/tasks/${id}/status`, { status, note });
}

export function removeTask(projectId: string, id: string) {
  return api.delete(`/project/${projectId}/tasks/${id}`);
}

export function addTaskDependency(projectId: string, id: string, dependsOnTaskId: string) {
  return api.post(`/project/${projectId}/tasks/${id}/dependencies`, { dependsOnTaskId });
}

export function removeTaskDependency(projectId: string, id: string, dependsOnTaskId: string) {
  return api.delete(`/project/${projectId}/tasks/${id}/dependencies/${dependsOnTaskId}`);
}

export function addTaskComment(projectId: string, id: string, body: string) {
  return api.post(`/project/${projectId}/tasks/${id}/comments`, { body });
}

export function listTaskComments(projectId: string, id: string) {
  return api.get(`/project/${projectId}/tasks/${id}/comments`);
}

// ── Timeline / Gantt ────────────────────────────────────────────────────────

export function getTimeline(projectId: string, params: { includeTasks?: boolean; includeMilestones?: boolean; criticalPathOnly?: boolean } = {}) {
  return api.get(`/project/${projectId}/timeline`, { params });
}

// ── Teams ───────────────────────────────────────────────────────────────────

export function listTeams(projectId: string) {
  return api.get(`/project/${projectId}/teams`);
}

export function getTeam(projectId: string, id: string) {
  return api.get(`/project/${projectId}/teams/${id}`);
}

export function createTeam(projectId: string, data: Record<string, unknown>) {
  return api.post(`/project/${projectId}/teams`, data);
}

export function updateTeam(projectId: string, id: string, data: Record<string, unknown>) {
  return api.patch(`/project/${projectId}/teams/${id}`, data);
}

export function removeTeam(projectId: string, id: string) {
  return api.delete(`/project/${projectId}/teams/${id}`);
}

export function addTeamMember(projectId: string, teamId: string, data: Record<string, unknown>) {
  return api.post(`/project/${projectId}/teams/${teamId}/members`, data);
}

export function updateTeamMember(projectId: string, memberId: string, data: Record<string, unknown>) {
  return api.patch(`/project/${projectId}/teams/members/${memberId}`, data);
}

export function removeTeamMember(projectId: string, memberId: string) {
  return api.delete(`/project/${projectId}/teams/members/${memberId}`);
}

export function getTeamAvailability(projectId: string) {
  return api.get(`/project/${projectId}/teams/availability`);
}

export function listDepartments() {
  return api.get('/project/:projectId/teams/departments'.replace('/:projectId', ''));
}

// ── Risks ───────────────────────────────────────────────────────────────────

export interface RiskQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  ownerId?: string;
  minExposure?: number;
}

export function listRisks(projectId: string, q: RiskQuery = {}) {
  return api.get(`/project/${projectId}/risks`, { params: q });
}

export function getRiskDashboard(projectId: string) {
  return api.get(`/project/${projectId}/risks/dashboard`);
}

export function createRisk(projectId: string, data: Record<string, unknown>) {
  return api.post(`/project/${projectId}/risks`, data);
}

export function updateRisk(projectId: string, id: string, data: Record<string, unknown>) {
  return api.patch(`/project/${projectId}/risks/${id}`, data);
}

export function closeRisk(projectId: string, id: string, resolution?: string) {
  return api.post(`/project/${projectId}/risks/${id}/close`, { resolution });
}

export function removeRisk(projectId: string, id: string) {
  return api.delete(`/project/${projectId}/risks/${id}`);
}

// ── Documents ───────────────────────────────────────────────────────────────

export interface DocumentQuery {
  page?: number;
  limit?: number;
  documentType?: string;
  status?: string;
  folderId?: string;
  search?: string;
}

export function listProjectDocuments(projectId: string, q: DocumentQuery = {}) {
  return api.get(`/project/${projectId}/documents`, { params: q });
}

export function getProjectDocument(projectId: string, id: string) {
  return api.get(`/project/${projectId}/documents/${id}`);
}

export function createProjectDocument(projectId: string, data: Record<string, unknown>) {
  return api.post(`/project/${projectId}/documents`, data);
}

export function updateProjectDocument(projectId: string, id: string, data: Record<string, unknown>) {
  return api.patch(`/project/${projectId}/documents/${id}`, data);
}

export function releaseProjectDocument(projectId: string, id: string, remarks?: string) {
  return api.post(`/project/${projectId}/documents/${id}/release`, { remarks });
}

export function archiveProjectDocument(projectId: string, id: string) {
  return api.post(`/project/${projectId}/documents/${id}/archive`, {});
}

export function removeProjectDocument(projectId: string, id: string) {
  return api.delete(`/project/${projectId}/documents/${id}`);
}

export function listDocumentVersions(projectId: string, id: string) {
  return api.get(`/project/${projectId}/documents/${id}/versions`);
}

export function listProjectFolders(projectId: string) {
  return api.get(`/project/${projectId}/documents/folders`);
}

export function createProjectFolder(projectId: string, folderName: string) {
  return api.post(`/project/${projectId}/documents/folders`, { folderName });
}

// ── AI Hooks (Sprint 2.2 integration points) ───────────────────────────────

export function getRiskPrediction(projectId: string) {
  return api.get(`/project/${projectId}/ai/risk-prediction`);
}

export function getDelayPrediction(projectId: string) {
  return api.get(`/project/${projectId}/ai/delay-prediction`);
}
