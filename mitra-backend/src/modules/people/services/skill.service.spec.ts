import { SkillService } from './skill.service';
import { SkillStatus } from '../entities/skill.entity';

describe('SkillService', () => {
  let service: SkillService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let auditService: { logBusinessEvent: jest.Mock };

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'skill-1', ...entity })),
    };
    auditService = { logBusinessEvent: jest.fn().mockResolvedValue({}) };
    service = new SkillService(repo as any, auditService as any);
  });

  it('creates a tenant-scoped skill with audit event', async () => {
    const created = await service.create(
      { code: 'MOLD_DESIGN', name: 'Mold Design', category: 'Design' },
      'user-1',
      'tenant-1',
    );
    expect(created.tenantId).toBe('tenant-1');
    expect(created.status).toBe(SkillStatus.ACTIVE);
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('skill.created', 'Skill', 'skill-1', 'user-1', expect.anything());
  });

  it('rejects a duplicate skill code in the same tenant', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'other', code: 'MOLD_DESIGN' });
    await expect(
      service.create({ code: 'MOLD_DESIGN', name: 'Mold Design' }, 'u', 'tenant-1'),
    ).rejects.toThrow('already exists');
  });

  it('throws 403 when no tenant context is provided (fail-closed)', async () => {
    await expect(service.create({ code: 'X', name: 'Y' }, 'u', null)).rejects.toMatchObject({ status: 403 });
  });

  it('updates an existing skill and audits the change', async () => {
    repo.findOne.mockResolvedValue({ id: 'skill-1', code: 'MOLD_DESIGN', tenantId: 'tenant-1' });
    repo.save.mockImplementation(async (e) => e);
    const updated = await service.update('skill-1', { name: 'Injection Mold Design' }, 'user-1', 'tenant-1');
    expect(updated.name).toBe('Injection Mold Design');
    expect(auditService.logBusinessEvent).toHaveBeenCalledWith('skill.updated', 'Skill', 'skill-1', 'user-1', expect.anything());
  });
});