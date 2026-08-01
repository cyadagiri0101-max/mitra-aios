import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeamService } from './team.service';
import { ProjectTeam } from '../entities/projectteam.entity';
import { ProjectTeamMember } from '../entities/projectteammember.entity';
import { Department } from '../entities/department.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';

describe('TeamService', () => {
  let service: TeamService;
  let teamRepo: any;
  let memberRepo: any;
  let departmentRepo: any;
  let activityRepo: any;

  const team = { id: 'team-1', projectId: 'p-1', teamName: 'Design Team', deletedAt: null };

  beforeEach(async () => {
    teamRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((t) => Promise.resolve({ ...t, id: t.id ?? 'team-9' })),
      create: jest.fn((t) => ({ ...t })),
    };
    memberRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn((m) => Promise.resolve({ ...m, id: m.id ?? 'mem-9' })),
      create: jest.fn((m) => ({ ...m })),
      manager: { query: jest.fn().mockResolvedValue([]) },
    };
    departmentRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((d) => Promise.resolve({ ...d, id: 'dep-9' })),
      create: jest.fn((d) => ({ ...d })),
    };
    activityRepo = { create: jest.fn((a) => ({ ...a })), save: jest.fn((a) => Promise.resolve(a)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: getRepositoryToken(ProjectTeam), useValue: teamRepo },
        { provide: getRepositoryToken(ProjectTeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Department), useValue: departmentRepo },
        { provide: getRepositoryToken(ProjectActivityLog), useValue: activityRepo },
      ],
    }).compile();

    service = module.get(TeamService);
  });

  describe('teams', () => {
    it('finds teams with members attached', async () => {
      teamRepo.find.mockResolvedValue([team]);
      memberRepo.find.mockResolvedValue([{ id: 'mem-1', teamId: 'team-1', userName: 'A', isLead: true }]);
      const result = await service.findByProject('p-1', 't-1');
      expect(result[0].members).toHaveLength(1);
      expect(memberRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { teamId: 'team-1', deletedAt: expect.anything() } }));
    });

    it('creates and deletes teams (blocked while members exist)', async () => {
      teamRepo.findOne.mockResolvedValue({ ...team });
      const saved = await service.create('p-1', { teamName: 'QA' }, 'u-1', 't-1');
      expect(saved.projectId).toBe('p-1');
      expect(activityRepo.save).toHaveBeenCalled();

      memberRepo.count.mockResolvedValue(2);
      await expect(service.remove('team-1', 'u-1', 't-1')).rejects.toThrow(BadRequestException);
      memberRepo.count.mockResolvedValue(0);
      await expect(service.remove('team-1', 'u-1', 't-1')).resolves.toEqual({ deleted: true, id: 'team-1' });
    });

    it('throws NotFound for missing team', async () => {
      teamRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nope', 't-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('members', () => {
    it('rejects duplicate member for same user', async () => {
      teamRepo.findOne.mockResolvedValue({ ...team });
      memberRepo.findOne.mockResolvedValue({ id: 'mem-x' });
      await expect(
        service.addMember('team-1', { userId: 'u-1', userName: 'A' }, 'u-1', 't-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('adds a member with defaults', async () => {
      teamRepo.findOne.mockResolvedValue({ ...team });
      memberRepo.findOne.mockResolvedValue(null);
      const saved = await service.addMember('team-1', { userId: 'u-2', userName: 'B' }, 'u-1', 't-1');
      expect(saved.capacityPct).toBe(100);
      expect(saved.isLead).toBe(false);
      expect(saved.projectId).toBe('p-1');
    });

    it('removes members and throws NotFound when missing', async () => {
      memberRepo.findOne.mockResolvedValue({ id: 'mem-1' });
      memberRepo.save.mockImplementation((m: any) => Promise.resolve(m));
      await expect(service.removeMember('mem-1', 'u-1', 't-1')).resolves.toEqual({ deleted: true, id: 'mem-1' });
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.removeMember('nope', 'u-1', 't-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('departments', () => {
    it('rejects duplicate department code', async () => {
      departmentRepo.findOne.mockResolvedValue({ id: 'd-1' });
      await expect(service.createDepartment({ code: 'QA' }, 'u-1', 't-1')).rejects.toThrow(BadRequestException);
    });

    it('creates and updates departments', async () => {
      departmentRepo.findOne.mockResolvedValue(null);
      const saved = await service.createDepartment({ code: 'QA', name: 'Quality' }, 'u-1', 't-1');
      expect(saved.code).toBe('QA');
      departmentRepo.findOne.mockResolvedValue({ id: 'd-1', code: 'QA' });
      departmentRepo.save.mockImplementation((d: any) => Promise.resolve(d));
      const updated = await service.updateDepartment('d-1', { name: 'Quality Assurance' }, 'u-1', 't-1');
      expect(updated.name).toBe('Quality Assurance');
    });
  });

  describe('availability', () => {
    it('computes availability from committed capacity minus load', async () => {
      memberRepo.find.mockResolvedValue([
        { id: 'm-1', userId: 'u-1', userName: 'Alice', capacityPct: 100 },
        { id: 'm-2', userId: null, userName: 'Bob', capacityPct: 60 },
      ]);
      memberRepo.manager.query.mockResolvedValue([
        { assigneeId: 'u-1', est: '30' },
      ]);
      const result = await service.availability('p-1', 't-1');
      expect(result.members).toHaveLength(2);
      const alice = result.members.find((m: any) => m.memberId === 'u-1')!;
      expect(alice.openTaskHours).toBe(30);
      expect(alice.availablePct).toBe(80);
      expect(alice.status).toBe('AVAILABLE');
      expect(result.totalCommittedCapacityPct).toBe(160);
    });

    it('marks members with zero capacity as OVERLOADED', async () => {
      memberRepo.find.mockResolvedValue([{ id: 'm-1', userId: 'u-1', userName: 'X', capacityPct: 0 }]);
      memberRepo.manager.query.mockResolvedValue([]);
      const result = await service.availability('p-1', 't-1');
      expect(result.members[0].status).toBe('OVERLOADED');
    });
  });
});
