export type DispatchTransition = 'PACK' | 'SHIP' | 'DELIVER' | 'CANCEL';

export const DISPATCH_STATUSES = ['PLANNING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export const DISPATCH_TRANSITIONS: Record<string, DispatchTransition[]> = {
  PLANNING: ['PACK', 'CANCEL'],
  PACKED: ['SHIP', 'CANCEL'],
  SHIPPED: ['DELIVER', 'CANCEL'],
  DELIVERED: [],
  CANCELLED: [],
};

export const DISPATCH_TRANSITION_LABELS: Record<DispatchTransition, string> = {
  PACK: 'Pack',
  SHIP: 'Ship',
  DELIVER: 'Deliver',
  CANCEL: 'Cancel',
};

export function getValidDispatchTransitions(status: string): DispatchTransition[] {
  return DISPATCH_TRANSITIONS[status] ?? [];
}

export function canTransitionDispatch(status: string, transition: DispatchTransition): boolean {
  return getValidDispatchTransitions(status).includes(transition);
}

export function isTerminalDispatchStatus(status: string): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

export function dispatchTransitionRequiresCarrier(transition: DispatchTransition): boolean {
  return transition === 'SHIP';
}

export interface InstallationGates {
  signoffBy: string;
  installationReport: string;
  checklistCount: number;
}

export function getMissingInstallationGates(gates: InstallationGates): string[] {
  const missing: string[] = [];
  if (!gates.signoffBy.trim()) missing.push('Customer sign-off (signoffBy)');
  if (!gates.installationReport.trim()) missing.push('Installation / commissioning report');
  if (gates.checklistCount <= 0) missing.push('Setup / test checklist');
  return missing;
}

export function canCompleteInstallation(gates: InstallationGates): boolean {
  return getMissingInstallationGates(gates).length === 0;
}

export type WarrantyCoverageDisplay =
  | { state: 'ACTIVE'; reason?: string }
  | { state: 'EXPIRED'; reason: string }
  | { state: 'CYCLE_LIMIT_EXHAUSTED'; reason: string }
  | { state: 'INACTIVE'; reason: string };

export function describeWarrantyCoverage(warranty: {
  status?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  maxCycles?: number | null;
  currentCycles?: number | null;
}): WarrantyCoverageDisplay {
  if (!warranty || warranty.status !== 'ACTIVE') {
    return { state: 'INACTIVE', reason: `Warranty status is ${warranty?.status ?? 'unknown'}` };
  }
  if (warranty.maxCycles != null && warranty.currentCycles != null && warranty.currentCycles > warranty.maxCycles) {
    return { state: 'CYCLE_LIMIT_EXHAUSTED', reason: 'Warranty cycle limit exhausted' };
  }
  const end = warranty.warrantyEndDate ? new Date(warranty.warrantyEndDate) : null;
  if (end && end < new Date()) {
    return { state: 'EXPIRED', reason: 'Warranty expiration date has passed' };
  }
  return { state: 'ACTIVE' };
}

export function getRemainingCycles(warranty: {
  maxCycles?: number | null;
  currentCycles?: number | null;
}): number | null {
  if (warranty.maxCycles == null) return null;
  return Math.max(0, warranty.maxCycles - (warranty.currentCycles ?? 0));
}

export interface ClaimAdjudicationInput {
  decision: 'APPROVE' | 'REJECT';
  rejectionReason: string;
  approvedAmount?: number | null;
  claimAmount?: number | null;
}

export function validateClaimAdjudication(input: ClaimAdjudicationInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.decision === 'REJECT' && !input.rejectionReason.trim()) {
    errors.push('Rejection reason is mandatory to REJECT a warranty claim');
  }
  if (input.decision === 'APPROVE') {
    const claimAmount = Number(input.claimAmount ?? 0);
    if (!(claimAmount > 0)) {
      errors.push('Claim has no valid financial data (claimAmount > 0 required)');
    }
    if (input.approvedAmount != null && Number(input.approvedAmount) < 0) {
      errors.push('Approved amount cannot be negative');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function totalVisitHours(visit: { travelHours?: number | null; serviceHours?: number | null }): number {
  return Number(visit.travelHours ?? 0) + Number(visit.serviceHours ?? 0);
}

export const SERVICE_REQUEST_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'] as const;
export const SERVICE_REQUEST_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const SERVICE_TYPES = ['REPAIR', 'MAINTENANCE', 'MODIFICATION', 'INSPECTION', 'EMERGENCY'] as const;