import { ResourceAvailabilityService } from './resource-availability.service';
import { AvailabilityType } from '../entities/resource-availability.entity';

describe('ResourceAvailabilityService', () => {
  let service: ResourceAvailabilityService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let employeeService: { findOne: jest.Mock };
  let auditService: { logBusinessEvent: jest.Mock };

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'ra-1', ...entity })),
    };
    employeeService = {
      findOne: jest.fn().mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1' }),
    };
    auditService = { logBusinessEvent: jest.fn().mockResolvedValue({}) };
    service = new ResourceAvailabilityService(repo as any, employeeService as any, auditService as any);
  });

  it('creates availability for a tenant-scoped employee with audit', async () => {
    const row = await service.createForEmployee(
      'emp-1',
      { workDate: '2026-09-01', availabilityType: AvailabilityType.PLANNED, availableHours: 6 },
      'user-1',
      'tenant-1',
    );
    expect(row.tenantId).toBe('tenant-1');
    expect(row.availabilityType).toBe(AvailabilityType.PLANNED);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('availability.created', 'ResourceAvailability', 'ra-1', 'user-1', expect.anything());
  });

  it('rejects duplicate (employee, date, tenant) with a clear message', async () => {
    repo.findOne.mockResolvedValue({ id: 'ra-0' });
    await expect(
      service.createForEmployee('emp-1', { workDate: '2026-09-01' }, 'user-1', 'tenant-1'),
    ).rejects.toThrow('already exists');
  });

  it('fails closed without tenant context', async () => {
    await expect(
      service.createForEmployee('emp-1', { workDate: '2026-09-01' }, 'user-1', null),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('updates an existing availability row and audits the change', async () => {
    repo.findOne.mockResolvedValue({ id: 'ra-1', employeeId: 'emp-1', workDate: new Date('2026-09-01'), tenantId: 'tenant-1' });
    repo.save.mockImplementation(async (e) => e);
    const updated = await service.updateForEmployee('emp-1', '2026-09-01', { availableHours: 8 }, 'user-1', 'tenant-1');
    expect(updated.availableHours).toBe(8);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('availability.updated', 'ResourceAvailability', 'ra-1', 'user-1', expect.anything());
  });
});