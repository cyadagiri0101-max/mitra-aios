import { EmployeeSkillService } from './employee-skill.service';
import { ProficiencyLevel } from '../entities/employee-skill.entity';

describe('EmployeeSkillService', () => {
  let service: EmployeeSkillService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let employeeService: { findOne: jest.Mock };
  let skillService: { findOne: jest.Mock };
  let auditService: { logBusinessEvent: jest.Mock };

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'es-1', ...entity })),
    };
    employeeService = {
      findOne: jest.fn().mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1' }),
    };
    skillService = {
      findOne: jest.fn().mockResolvedValue({ id: 'skill-1', tenantId: 'tenant-1' }),
    };
    auditService = { logBusinessEvent: jest.fn().mockResolvedValue({}) };
    service = new EmployeeSkillService(repo as any, employeeService as any, skillService as any, auditService as any);
  });

  it('assigns a skill only when employee and skill belong to the caller tenant', async () => {
    const row = await service.assign(
      'emp-1',
      { skillId: 'skill-1', proficiencyLevel: ProficiencyLevel.ADVANCED, certification: 'ISO 9001' },
      'user-1',
      'tenant-1',
    );
    expect(row.tenantId).toBe('tenant-1');
    expect(row.proficiencyLevel).toBe(ProficiencyLevel.ADVANCED);
    expect(employeeService.findOne).toHaveBeenCalledWith('emp-1', 'tenant-1');
    expect(skillService.findOne).toHaveBeenCalledWith('skill-1', 'tenant-1');
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('employee_skill.assigned', 'EmployeeSkill', 'es-1', 'user-1', expect.anything());
  });

  it('rejects re-assignment of the same skill to the same employee', async () => {
    repo.findOne.mockResolvedValue({ id: 'es-1', employeeId: 'emp-1', skillId: 'skill-1' });
    await expect(
      service.assign('emp-1', { skillId: 'skill-1' }, 'user-1', 'tenant-1'),
    ).rejects.toThrow('already assigned');
  });

  it('does not resolve cross-tenant employees (404 via employee service)', async () => {
    employeeService.findOne.mockRejectedValue({ status: 404, message: 'Employee not found' });
    await expect(
      service.assign('emp-x', { skillId: 'skill-1' }, 'user-1', 'tenant-1'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('removes an assignment with soft delete + audit', async () => {
    repo.findOne.mockResolvedValue({ id: 'es-1', employeeId: 'emp-1', skillId: 'skill-1', tenantId: 'tenant-1' });
    repo.save.mockImplementation(async (e) => e);
    const result = await service.remove('emp-1', 'skill-1', 'user-1', 'tenant-1');
    expect(result.deleted).toBe(true);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('employee_skill.removed', 'EmployeeSkill', 'es-1', 'user-1', expect.anything());
  });
});