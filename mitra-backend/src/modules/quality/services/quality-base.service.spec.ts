import { ForbiddenException } from '@nestjs/common';
import { QualityBaseService } from './quality-base.service';

describe('QualityBaseService', () => {
  let service: QualityBaseService<any>;
  let repo: any;

  const makeQb = (rows: any[] = [], count = rows.length) => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, count]),
    };
    return qb;
  };

  beforeEach(() => {
    repo = {
      createQueryBuilder: jest.fn(() => makeQb([{ id: 'rec-1', tenantId: 't-1' }])),
      findOne: jest.fn(),
      create: jest.fn((e: any) => ({ ...e })),
      save: jest.fn((e: any) => Promise.resolve({ ...e, id: e.id ?? 'rec-9' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    service = new QualityBaseService<any>(repo);
  });

  it('rejects tenantless findAll (fail closed)', async () => {
    await expect(service.findAll({})).rejects.toThrow(ForbiddenException);
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('scopes findAll to the caller tenant', async () => {
    const qb = repo.createQueryBuilder();
    repo.createQueryBuilder = jest.fn(() => qb);
    await service.findAll({}, 't-1');
    expect(qb.andWhere).toHaveBeenCalledWith('e.tenant_id = :tenantId', { tenantId: 't-1' });
  });

  it('rejects tenantless findOne (fail closed)', async () => {
    await expect(service.findOne('rec-1')).rejects.toThrow(ForbiddenException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('scopes findOne to the caller tenant', async () => {
    repo.findOne.mockResolvedValue({ id: 'rec-1', tenantId: 't-1' });
    await service.findOne('rec-1', 't-1');
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'rec-1', tenantId: 't-1' }) }),
    );
  });

  it('rejects tenantless create (fail closed)', async () => {
    await expect(service.create({ title: 'x' }, 'u-1')).rejects.toThrow(ForbiddenException);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('persists the caller tenant on create', async () => {
    await service.create({ title: 'x' }, 'u-1', 't-1');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-1' }));
  });

  it('rejects tenantless update (fail closed)', async () => {
    await expect(service.update('rec-1', { title: 'y' }, 'u-1')).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('updates only within the caller tenant', async () => {
    repo.findOne.mockResolvedValue({ id: 'rec-1', tenantId: 't-1' });
    await service.update('rec-1', { title: 'y' }, 'u-1', 't-1');
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rec-1', tenantId: 't-1' }),
      expect.objectContaining({ title: 'y' }),
    );
  });
});