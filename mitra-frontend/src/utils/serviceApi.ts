import { api } from './api';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function unwrapList<T>(payload: unknown, fallback: T[] = []): { items: T[]; total: number } {
  if (Array.isArray(payload)) return { items: payload, total: payload.length };
  const p = payload as Paginated<T> | undefined;
  if (p && Array.isArray(p.data)) return { items: p.data, total: p.total ?? p.data.length };
  return { items: fallback, total: fallback.length };
}

// ── Dispatch ────────────────────────────────────────────────────────────────

export function listDispatchPlans() {
  return api.get('/dispatch');
}

export function getDispatchPlan(id: string) {
  return api.get(`/dispatch/${id}`);
}

export function createDispatchPlan(data: Record<string, unknown>) {
  return api.post('/dispatch', data);
}

export function transitionDispatchPlan(id: string, data: Record<string, unknown>) {
  return api.post(`/dispatch/${id}/transition`, data);
}

export function updateDispatchPlan(id: string, data: Record<string, unknown>) {
  return api.patch(`/dispatch/${id}`, data);
}

// ── Installations ───────────────────────────────────────────────────────────

export function listInstallations(params: { page?: number; limit?: number } = {}) {
  return api.get('/service/installations', { params });
}

export function createInstallation(data: Record<string, unknown>) {
  return api.post('/service/installations', data);
}

export function completeInstallation(id: string, data: Record<string, unknown>) {
  return api.post(`/service/installations/${id}/complete`, data);
}

// ── Warranty ────────────────────────────────────────────────────────────────

export function listWarranties(params: { page?: number; limit?: number } = {}) {
  return api.get('/service/warranty', { params });
}

export function checkWarrantyCoverage(id: string, incidentDate: string) {
  return api.get(`/service/warranty/${id}/coverage`, { params: { incidentDate } });
}

export function createWarranty(data: Record<string, unknown>) {
  return api.post('/service/warranty', data);
}

// ── Service Requests ────────────────────────────────────────────────────────

export function listServiceRequests(params: { page?: number; limit?: number } = {}) {
  return api.get('/service/requests', { params });
}

export function createServiceRequest(data: Record<string, unknown>) {
  return api.post('/service/requests', data);
}

export function updateServiceRequest(id: string, data: Record<string, unknown>) {
  return api.patch(`/service/requests/${id}`, data);
}

export function closeServiceRequest(id: string) {
  return api.patch(`/service/requests/${id}/close`);
}

// ── Visits ──────────────────────────────────────────────────────────────────

export function listVisits(params: { page?: number; limit?: number } = {}) {
  return api.get('/service/visits', { params });
}

export function createVisit(data: Record<string, unknown>) {
  return api.post('/service/visits', data);
}

export function updateVisit(id: string, data: Record<string, unknown>) {
  return api.patch(`/service/visits/${id}`, data);
}

// ── Warranty Claims ─────────────────────────────────────────────────────────

export function listWarrantyClaims(params: { page?: number; limit?: number } = {}) {
  return api.get('/service/warranty-claims', { params });
}

export function createWarrantyClaim(data: Record<string, unknown>) {
  return api.post('/service/warranty-claims', data);
}

export function adjudicateWarrantyClaim(id: string, data: Record<string, unknown>) {
  return api.post(`/service/warranty-claims/${id}/adjudicate`, data);
}

// ── AMC / Spare Parts / Lineage ─────────────────────────────────────────────

export function listAmcContracts(params: { page?: number; limit?: number } = {}) {
  return api.get('/service/amc', { params });
}

export function listSpareParts(params: { page?: number; limit?: number } = {}) {
  return api.get('/service/spare-parts', { params });
}

export function getProjectServiceLineage(projectId: string) {
  return api.get(`/service/projects/${projectId}/lineage`);
}