import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProjectTeam } from '../entities/projectteam.entity';
import { ProjectTeamMember } from '../entities/projectteammember.entity';
import { Department } from '../entities/department.entity';
import { ProjectActivityLog } from '../entities/projectactivitylog.entity';

/**
 * Team management: teams per project, members, roles, departments,
 * skills and capacity. Availability is computed from committed capacity
 * minus concurrent allocations across the project.
 */
@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(ProjectTeam) private readonly teamRepo: Repository<ProjectTeam>,
    @InjectRepository(ProjectTeamMember) private readonly memberRepo: Repository<ProjectTeamMember>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(ProjectActivityLog) private readonly activityRepo: Repository<ProjectActivityLog>,
  ) {}

  // ── Teams ──────────────────────────────────────────────────────────────────

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  private requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  /**
   * List teams with members. `skill` (case-insensitive) filters members by
   * a skill tag stored in their JSONB `skills` array.
   */
  async findByProject(projectId: string, tenantId?: string | null, skill?: string) {
    const where: any = { projectId, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const teams = await this.teamRepo.find({ where, order: { createdAt: 'ASC' } as any, take: 100 });

    if (skill?.trim()) {
      const members = await this.memberRepo
        .createQueryBuilder('member')
        .where('member.project_id = :projectId', { projectId })
        .andWhere('member.deleted_at IS NULL')
        .andWhere('LOWER(member.skills::text) LIKE :skillPattern', {
          skillPattern: `%${skill.trim().toLowerCase()}%`,
        })
        .orderBy('member.is_lead', 'DESC')
        .limit(200)
        .getMany();
      return { data: this.serializeMembers(members) };
    }

    const withMembers: any[] = [];
    for (const team of teams) {
      const members = await this.memberRepo.find({
        where: { teamId: team.id, deletedAt: IsNull() },
        order: { isLead: 'DESC' } as any,
        take: 200,
      });
      withMembers.push({ ...team, members: this.serializeMembers(members) });
    }
    return { data: withMembers };
  }

  private serializeMembers(members: ProjectTeamMember[]) {
    return members.map((member) => ({
      ...member,
      name: member.userName,
    }));
  }

  async findOne(id: string, tenantId?: string | null): Promise<ProjectTeam> {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const team = await this.teamRepo.findOne({ where });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(projectId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const { name, role, ...rest } = data;
    const team = this.teamRepo.create({
      ...rest,
      projectId,
      teamName: name,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    const saved = await this.teamRepo.save(team);
    await this.logActivity(projectId, 'team.created', `Team created: ${saved.teamName}`, userId, tenantId);
    return saved;
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const team = await this.findOne(id, tenantId);
    Object.assign(team, data, { updatedBy: userId });
    return this.teamRepo.save(team);
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const team = await this.findOne(id, tenantId);
    const memberCount = await this.memberRepo.count({ where: { teamId: id, deletedAt: IsNull() } });
    if (memberCount > 0) {
      throw new BadRequestException('Remove team members before deleting the team');
    }
    team.deletedAt = new Date();
    team.updatedBy = userId;
    await this.teamRepo.save(team);
    await this.logActivity(team.projectId, 'team.deleted', `Team deleted: ${team.teamName}`, userId, tenantId);
    return { deleted: true, id };
  }

  // ── Members ────────────────────────────────────────────────────────────────

  async addMember(teamId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    const team = await this.teamRepo.findOne({
      where: { id: teamId, tenantId, deletedAt: IsNull() },
    });
    if (!team) throw new NotFoundException('Team not found');

    if (data.userId) {
      const dup = await this.memberRepo.findOne({
        where: { teamId, tenantId, userId: data.userId, deletedAt: IsNull() },
      });
      if (dup) throw new BadRequestException('User is already a member of this team');
    }

    const { name, email, ...rest } = data;

    const isLead = data.isLead ?? false;
    if (isLead) {
      await this.memberRepo.update({ teamId, tenantId, isLead: true, deletedAt: IsNull() }, { isLead: false });
    }

    const member = this.memberRepo.create({
      ...rest,
      teamId,
      projectId: team.projectId,
      userName: name ?? rest.userName,
      isLead,
      capacityPct: data.capacityPct ?? 100,
      skills: this.sanitizeSkills(data.skills),
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    const saved = await this.memberRepo.save(member);
    if (isLead) {
      await this.syncTeamLead(team, saved);
    }
    await this.logActivity(team.projectId, 'team.member_added', `Member added: ${saved.userName} → ${team.teamName}`, userId, tenantId);
    return saved;
  }

  async updateMember(memberId: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { id: memberId, tenantId: scopeTenant, deletedAt: IsNull() };
    const member = await this.memberRepo.findOne({ where });
    if (!member) throw new NotFoundException('Team member not found');

    const becomingLead = data.isLead === true && !member.isLead;
    if (becomingLead) {
      await this.memberRepo.update({ teamId: member.teamId, tenantId: scopeTenant, isLead: true, deletedAt: IsNull() }, { isLead: false });
    }

    if (data.skills !== undefined) {
      data = { ...data, skills: this.sanitizeSkills(data.skills) };
    }

    Object.assign(member, data, { updatedBy: userId });
    const saved = await this.memberRepo.save(member);

    if (becomingLead) {
      const team = await this.teamRepo.findOne({ where: { id: member.teamId, tenantId: scopeTenant, deletedAt: IsNull() } });
      if (team) await this.syncTeamLead(team, saved);
    }
    await this.logActivity(member.projectId, 'team.member_updated', `Member updated: ${saved.userName}`, userId, scopeTenant);
    return saved;
  }

  /** Keeps `team.leadUserId` in sync with the sole isLead member. */
  private async syncTeamLead(team: ProjectTeam, leadMember: ProjectTeamMember): Promise<void> {
    if (team.leadUserId !== leadMember.userId) {
      team.leadUserId = leadMember.userId ?? null;
      team.leadUserName = leadMember.userName;
      await this.teamRepo.save(team);
    }
  }

  /**
   * Normalize a skills array: trim, drop empties, dedupe (case-insensitive),
   * cap at 30 tags of max 50 chars each. Keeps the JSONB field clean.
   */
  private sanitizeSkills(skills: unknown): string[] | null {
    if (!Array.isArray(skills)) return null;
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const s of skills) {
      const tag = String(s).trim().slice(0, 50);
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push(tag);
      if (clean.length >= 30) break;
    }
    return clean.length ? clean : null;
  }

  async removeMember(memberId: string, userId: string, tenantId?: string | null) {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { id: memberId, tenantId: scopeTenant, deletedAt: IsNull() };
    const member = await this.memberRepo.findOne({ where });
    if (!member) throw new NotFoundException('Team member not found');
    member.deletedAt = new Date();
    member.updatedBy = userId;
    const saved = await this.memberRepo.save(member);
    const team = await this.teamRepo.findOne({ where: { id: member.teamId, tenantId: scopeTenant, deletedAt: IsNull() } });
    await this.logActivity(
      team?.projectId ?? member.projectId,
      'team.member_removed',
      `Member removed: ${saved.userName}`,
      userId,
      scopeTenant,
    );
    return { deleted: true, id: memberId };
  }

  // ── Departments ────────────────────────────────────────────────────────────

  async findDepartments(tenantId?: string | null) {
    const where: any = { deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return this.departmentRepo.find({ where, order: { name: 'ASC' } as any, take: 100 });
  }

  async createDepartment(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const existing = await this.departmentRepo.findOne({ where: { code: data.code, deletedAt: IsNull() } });
    if (existing) throw new BadRequestException(`Department code already exists: ${data.code}`);
    const department = this.departmentRepo.create({
      ...data,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    return this.departmentRepo.save(department);
  }

  async updateDepartment(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const department = await this.departmentRepo.findOne({ where });
    if (!department) throw new NotFoundException('Department not found');
    Object.assign(department, data, { updatedBy: userId });
    return this.departmentRepo.save(department);
  }

  // ── Capacity & Availability ────────────────────────────────────────────────

  /**
   * Availability per member: committed capacity across ALL teams of the
   * project, plus current task load (open task estimated hours).
   * Returns free capacity percentage.
   */
  async availability(projectId: string, tenantId?: string | null) {
    const members = await this.memberRepo.find({
      where: { projectId, deletedAt: IsNull() },
      take: 1000,
    });

    const byUser = new Map<string, { capacityPct: number; count: number; name: string }>();
    for (const m of members) {
      const key = m.userId ?? m.id;
      const agg = byUser.get(key) ?? { capacityPct: 0, count: 0, name: m.userName };
      agg.capacityPct += m.capacityPct;
      agg.count += 1;
      byUser.set(key, agg);
    }

    // Load open task hours per assignee from the task repository.
    const tasks = await this.taskLoadForProject(projectId);

    const rows = [...byUser.entries()].map(([key, agg]) => {
      const openHours = tasks.get(key) ?? 0;
      const committed = Math.min(100, agg.capacityPct);
      const availablePct = Math.max(0, committed - (openHours > 0 ? 20 : 0));
      return {
        memberId: key,
        name: agg.name,
        teams: agg.count,
        committedCapacityPct: committed,
        openTaskHours: openHours,
        availablePct,
        status: availablePct >= 50 ? 'AVAILABLE' : availablePct > 0 ? 'PARTIALLY_BUSY' : 'OVERLOADED',
      };
    });

    const totalCapacity = rows.reduce((s, r) => s + r.committedCapacityPct, 0);
    return {
      projectId,
      members: rows,
      totalCommittedCapacityPct: totalCapacity,
      summary: {
        available: rows.filter((r) => r.status === 'AVAILABLE').length,
        partiallyBusy: rows.filter((r) => r.status === 'PARTIALLY_BUSY').length,
        overloaded: rows.filter((r) => r.status === 'OVERLOADED').length,
      },
    };
  }

  /** Sum of estimated hours of non-closed tasks per assignee. */
  private async taskLoadForProject(projectId: string): Promise<Map<string, number>> {
    const rows: { assigneeId: string; est: string }[] = await this.memberRepo.manager
      .query(
        `SELECT "assignee_id"::text AS "assigneeId", COALESCE(SUM("estimated_hours"), 0)::text AS "est"
         FROM "project_tasks"
         WHERE "project_id" = $1 AND "deleted_at" IS NULL AND "status" NOT IN ('DONE', 'CANCELLED')
         GROUP BY "assignee_id"`,
        [projectId],
      );
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.assigneeId) map.set(r.assigneeId, parseFloat(r.est || '0'));
    }
    return map;
  }

  private async logActivity(
    projectId: string,
    type: string,
    title: string,
    userId: string,
    tenantId: string | null | undefined,
  ) {
    await this.activityRepo.save(
      this.activityRepo.create({
        projectId,
        activityType: type,
        title,
        actorId: userId ?? null,
        tenantId: tenantId ?? undefined,
      }),
    );
  }
}
