import { EngineeringDecisionService } from './engineering-decision.service';
import { DecisionStatus, DecisionType } from '../entities/engineering-decision.entity';

describe('EngineeringDecisionService', () => {
  let service: EngineeringDecisionService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let auditService: { logBusinessEvent: jest.Mock; log: jest.Mock };
  let outboxService: { append: jest.Mock };

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'dec-1', ...entity })),
      count: jest.fn().mockResolvedValue(0),
    };
    dataSource = {
      transaction: jest.fn(async (cb) => cb({
        getRepository: jest.fn(() => repo),
      })),
    };
    auditService = {
      logBusinessEvent: jest.fn().mockResolvedValue({}),
      log: jest.fn().mockResolvedValue({}),
    };
    outboxService = { append: jest.fn().mockResolvedValue({}) };
    service = new EngineeringDecisionService(repo as any, dataSource as any, auditService as any, outboxService as any);
  });

  it('creates a DRAFT decision with a DEC-{year}-{NNNN} number, audit and outbox event', async () => {
    const created = await service.create({ title: 'Cooling layout', decisionType: DecisionType.DESIGN }, 'user-1', 'tenant-1');
    expect(created.status).toBe(DecisionStatus.DRAFT);
    expect(created.decisionNumber).toMatch(/^DEC-\d{4}-0001$/);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('engineering_decision.created', 'EngineeringDecision', 'dec-1', 'user-1', expect.anything(), undefined, undefined);
    expect(outboxService.append).toHaveBeenCalledWith('engineering_decision.created', 'engineering_decision', 'dec-1', expect.anything(), expect.anything());
  });

  it('only allows editing DRAFT/SUBMITTED decisions', async () => {
    repo.findOne.mockResolvedValue({ id: 'dec-1', status: DecisionStatus.APPROVED, decisionNumber: 'DEC-2026-0001', tenantId: 'tenant-1' });
    await expect(service.update('dec-1', { title: 'X' }, 'user-1', 'tenant-1')).rejects.toThrow('cannot be edited');
  });

  it('walks the lifecycle DRAFT → SUBMITTED → APPROVED with audit + outbox events', async () => {
    repo.findOne
      .mockResolvedValueOnce({ id: 'dec-1', status: DecisionStatus.DRAFT, decisionNumber: 'DEC-2026-0001', tenantId: 'tenant-1', projectId: null })
      .mockResolvedValueOnce({ id: 'dec-1', status: DecisionStatus.SUBMITTED, decisionNumber: 'DEC-2026-0001', tenantId: 'tenant-1', projectId: null });
    repo.save.mockImplementation(async (e) => e);

    const submitted = await service.submit('dec-1', 'user-1', 'tenant-1');
    expect(submitted.status).toBe(DecisionStatus.SUBMITTED);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('engineering_decision.submitted', 'EngineeringDecision', 'dec-1', 'user-1', expect.anything(), undefined, undefined);
    expect(outboxService.append).toHaveBeenCalledWith('engineering_decision.submitted', 'engineering_decision', 'dec-1', expect.anything(), expect.anything());

    const approved = await service.approve('dec-1', 'user-1', 'tenant-1');
    expect(approved.status).toBe(DecisionStatus.APPROVED);
    expect(approved.approvedBy).toBe('user-1');
  });

  it('rejects an invalid transition (APPROVED → SUBMITTED)', async () => {
    repo.findOne.mockResolvedValue({ id: 'dec-1', status: DecisionStatus.APPROVED, tenantId: 'tenant-1' });
    await expect(service.submit('dec-1', 'user-1', 'tenant-1')).rejects.toThrow('Invalid transition');
  });

  it('rejects without a reason when rejecting', async () => {
    repo.findOne.mockResolvedValue({ id: 'dec-1', status: DecisionStatus.SUBMITTED, tenantId: 'tenant-1' });
    await expect(service.reject('dec-1', '  ', 'user-1', 'tenant-1')).rejects.toThrow('reason is required');
  });

  it('supersedes in one transaction: successor DRAFT + original SUPERSEDED, both audited', async () => {
    const original = { id: 'dec-1', status: DecisionStatus.APPROVED, decisionNumber: 'DEC-2026-0001', tenantId: 'tenant-1', projectId: null, decisionType: DecisionType.DESIGN };
    repo.findOne.mockResolvedValue(original);
    repo.count.mockResolvedValue(1);
    repo.save.mockImplementation(async (e) => ({ id: 'dec-2', ...e }));

    const result = await service.supersede('dec-1', { title: 'Revised layout' }, 'user-1', 'tenant-1');

    expect(result.original.status).toBe(DecisionStatus.SUPERSEDED);
    expect(result.original.supersededByDecisionId).toBe('dec-2');
    expect(result.successor.supersedesDecisionId).toBe('dec-1');
    expect(result.successor.status).toBe(DecisionStatus.DRAFT);
    expect(dataSource.transaction).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledTimes(2);
    expect(outboxService.append).toHaveBeenCalledTimes(2);
  });

  it('fails closed without tenant context', async () => {
    await expect(service.create({ title: 'X' }, 'user-1', null)).rejects.toMatchObject({ status: 403 });
  });
});