import { EmployeeService } from './employee.service';
import { EmployeeStatus } from '../entities/employee.entity';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let auditService: { logBusinessEvent: jest.Mock };

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'emp-1', ...entity })),
      createQueryBuilder: jest.fn(),
    };
    auditService = { logBusinessEvent: jest.fn().mockResolvedValue({}) };
    service = new EmployeeService(repo as any, auditService as any);
  });

  it('creates a tenant-scoped employee with audit event', async () => {
    const created = await service.create(
      { employeeCode: 'ENG-1001', firstName: 'Rajesh', lastName: 'Kumar', email: 'r.k@mitra.local' },
      'user-1',
      'tenant-1',
    );
    expect(created.tenantId).toBe('tenant-1');
    expect(created.createdBy).toBe('user-1');
    expect(created.status).toBe(EmployeeStatus.ACTIVE);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
      'employee.created',
      'Employee',
      'emp-1',
      'user-1',
      expect.objectContaining({ employeeCode: 'ENG-1001' }),
    );
  });

  it('rejects a duplicate employee code in the same tenant', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'other', employeeCode: 'ENG-1001' });
    await expect(
      service.create({ employeeCode: 'ENG-1001', firstName: 'A', lastName: 'B' }, 'u', 'tenant-1'),
    ).rejects.toThrow('already exists');
  });

  it('throws 403 when no tenant context is provided (fail-closed)', async () => {
    await expect(
      service.create({ employeeCode: 'ENG-X', firstName: 'A', lastName: 'B' }, 'u', null),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('soft-deletes an employee and audits employee.deleted', async () => {
    repo.findOne.mockResolvedValue({ id: 'emp-1', employeeCode: 'ENG-1001', tenantId: 'tenant-1' });
    repo.save.mockImplementation(async (e) => e);
    const result = await service.remove('emp-1', 'user-1', 'tenant-1');
    expect(result.deleted).toBe(true);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith(
      'employee.deleted',
      'Employee',
      'emp-1',
      'user-1',
      expect.anything(),
    );
  });

  it('audits deactivation distinctly from updates', async () => {
    repo.findOne.mockResolvedValue({ id: 'emp-1', employeeCode: 'ENG-1001', tenantId: 'tenant-1', status: EmployeeStatus.ACTIVE });
    repo.save.mockImplementation(async (e) => e);
    await service.update('emp-1', { status: EmployeeStatus.INACTIVE }, 'user-1', 'tenant-1');
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('employee.deactivated', 'Employee', 'emp-1', 'user-1', expect.anything());
  });
});