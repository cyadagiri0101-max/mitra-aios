import { describe, it, expect } from 'vitest';
import {
  getValidDispatchTransitions,
  canTransitionDispatch,
  isTerminalDispatchStatus,
  dispatchTransitionRequiresCarrier,
  getMissingInstallationGates,
  canCompleteInstallation,
  describeWarrantyCoverage,
  getRemainingCycles,
  validateClaimAdjudication,
  totalVisitHours,
} from '../utils/serviceStatus';

describe('dispatch state machine (mirrors backend dispatch.service transition map)', () => {
  it('exposes PACK/CANCEL from PLANNING only', () => {
    expect(getValidDispatchTransitions('PLANNING')).toEqual(['PACK', 'CANCEL']);
    expect(canTransitionDispatch('PLANNING', 'PACK')).toBe(true);
    expect(canTransitionDispatch('PLANNING', 'SHIP')).toBe(false);
    expect(canTransitionDispatch('PLANNING', 'DELIVER')).toBe(false);
  });

  it('exposes SHIP/CANCEL from PACKED and requires carrier for SHIP', () => {
    expect(getValidDispatchTransitions('PACKED')).toEqual(['SHIP', 'CANCEL']);
    expect(canTransitionDispatch('PACKED', 'SHIP')).toBe(true);
    expect(dispatchTransitionRequiresCarrier('SHIP')).toBe(true);
    expect(dispatchTransitionRequiresCarrier('PACK')).toBe(false);
    expect(dispatchTransitionRequiresCarrier('DELIVER')).toBe(false);
    expect(dispatchTransitionRequiresCarrier('CANCEL')).toBe(false);
  });

  it('exposes DELIVER/CANCEL from SHIPPED', () => {
    expect(getValidDispatchTransitions('SHIPPED')).toEqual(['DELIVER', 'CANCEL']);
    expect(canTransitionDispatch('SHIPPED', 'DELIVER')).toBe(true);
    expect(canTransitionDispatch('SHIPPED', 'SHIP')).toBe(false);
  });

  it('locks terminal states DELIVERED and CANCELLED', () => {
    expect(getValidDispatchTransitions('DELIVERED')).toEqual([]);
    expect(getValidDispatchTransitions('CANCELLED')).toEqual([]);
    expect(isTerminalDispatchStatus('DELIVERED')).toBe(true);
    expect(isTerminalDispatchStatus('CANCELLED')).toBe(true);
    expect(isTerminalDispatchStatus('SHIPPED')).toBe(false);
    expect(canTransitionDispatch('DELIVERED', 'CANCEL')).toBe(false);
  });

  it('fails closed for unknown statuses', () => {
    expect(getValidDispatchTransitions('BOGUS')).toEqual([]);
    expect(canTransitionDispatch('BOGUS', 'PACK')).toBe(false);
  });
});

describe('installation completion gates (mirrors completeInstallation DTO)', () => {
  const validGates = { signoffBy: 'Site Incharge', installationReport: 'report.pdf', checklistCount: 3 };

  it('accepts a fully completed gate set', () => {
    expect(getMissingInstallationGates(validGates)).toEqual([]);
    expect(canCompleteInstallation(validGates)).toBe(true);
  });

  it('rejects when customer sign-off is missing', () => {
    const missing = getMissingInstallationGates({ ...validGates, signoffBy: '   ' });
    expect(missing).toContain('Customer sign-off (signoffBy)');
    expect(canCompleteInstallation({ ...validGates, signoffBy: '' })).toBe(false);
  });

  it('rejects when the installation report is missing', () => {
    const missing = getMissingInstallationGates({ ...validGates, installationReport: '' });
    expect(missing).toContain('Installation / commissioning report');
    expect(canCompleteInstallation({ ...validGates, installationReport: ' ' })).toBe(false);
  });

  it('rejects when the checklist is empty', () => {
    const missing = getMissingInstallationGates({ ...validGates, checklistCount: 0 });
    expect(missing).toContain('Setup / test checklist');
    expect(canCompleteInstallation({ ...validGates, checklistCount: -1 })).toBe(false);
  });

  it('accumulates every missing gate', () => {
    const missing = getMissingInstallationGates({ signoffBy: '', installationReport: '', checklistCount: 0 });
    expect(missing.length).toBe(3);
  });
});

describe('warranty coverage display (backend warranty.rules semantics)', () => {
  const activeWarranty = {
    status: 'ACTIVE',
    warrantyStartDate: '2026-01-01T00:00:00Z',
    warrantyEndDate: '2099-01-01T00:00:00Z',
    maxCycles: 10,
    currentCycles: 2,
  };

  it('reports ACTIVE for an in-term warranty within cycle limit', () => {
    expect(describeWarrantyCoverage(activeWarranty)).toEqual({ state: 'ACTIVE' });
  });

  it('reports CYCLE_LIMIT_EXHAUSTED before expiry when cycles are over the max', () => {
    const result = describeWarrantyCoverage({ ...activeWarranty, currentCycles: 11 });
    expect(result.state).toBe('CYCLE_LIMIT_EXHAUSTED');
    expect(result.reason).toContain('cycle limit');
  });

  it('reports EXPIRED when the end date has passed', () => {
    const result = describeWarrantyCoverage({
      status: 'ACTIVE',
      warrantyStartDate: '2020-01-01T00:00:00Z',
      warrantyEndDate: '2020-12-31T00:00:00Z',
    });
    expect(result.state).toBe('EXPIRED');
    expect(result.reason).toContain('expiration');
  });

  it('reports INACTIVE when the warranty status is not ACTIVE', () => {
    const result = describeWarrantyCoverage({ status: 'DRAFT' });
    expect(result.state).toBe('INACTIVE');
    expect(result.reason).toContain('DRAFT');
  });

  it('fails closed for null warranty objects', () => {
    const result = describeWarrantyCoverage(null as any);
    expect(result.state).toBe('INACTIVE');
  });

  it('computes remaining cycles with a floor of zero', () => {
    expect(getRemainingCycles({ maxCycles: 10, currentCycles: 2 })).toBe(8);
    expect(getRemainingCycles({ maxCycles: 3, currentCycles: 9 })).toBe(0);
    expect(getRemainingCycles({ maxCycles: 5 })).toBe(5);
    expect(getRemainingCycles({ maxCycles: null, currentCycles: 2 })).toBeNull();
    expect(getRemainingCycles({})).toBeNull();
  });
});

describe('warranty claim adjudication validation (mirrors adjudicateClaim rules)', () => {
  it('approves a claim with financial data and positive approved amount', () => {
    const result = validateClaimAdjudication({ decision: 'APPROVE', rejectionReason: '', claimAmount: 5000, approvedAmount: 4000 });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('allows a zero/omitted approvedAmount on APPROVE (backend DTO: optional)', () => {
    const result = validateClaimAdjudication({ decision: 'APPROVE', rejectionReason: '', claimAmount: 5000, approvedAmount: null });
    expect(result.valid).toBe(true);
  });

  it('rejects APPROVE without claim financial data', () => {
    const result = validateClaimAdjudication({ decision: 'APPROVE', rejectionReason: '', claimAmount: 0, approvedAmount: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain('financial');
  });

  it('rejects negative approved amounts', () => {
    const result = validateClaimAdjudication({ decision: 'APPROVE', rejectionReason: '', claimAmount: 5000, approvedAmount: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain('negative');
  });

  it('REJECT requires a rejection reason', () => {
    const noReason = validateClaimAdjudication({ decision: 'REJECT', rejectionReason: '   ', claimAmount: 5000 });
    expect(noReason.valid).toBe(false);
    expect(noReason.errors.join()).toContain('Rejection reason');

    const withReason = validateClaimAdjudication({ decision: 'REJECT', rejectionReason: 'Out of coverage window', claimAmount: 5000 });
    expect(withReason.valid).toBe(true);
  });
});

describe('visit effort hours', () => {
  it('sums travel and service hours, defaulting nulls to zero', () => {
    expect(totalVisitHours({ travelHours: 2, serviceHours: 6 })).toBe(8);
    expect(totalVisitHours({ travelHours: 0.5, serviceHours: 1.25 })).toBeCloseTo(1.75);
    expect(totalVisitHours({ travelHours: null, serviceHours: 4 })).toBe(4);
    expect(totalVisitHours({})).toBe(0);
  });
});