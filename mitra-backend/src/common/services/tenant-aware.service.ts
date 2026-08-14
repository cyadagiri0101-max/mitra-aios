import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository, IsNull, FindOptionsWhere } from 'typeorm';
import { IndustrialBaseEntity } from '../entities/industrial-base.entity';

/**
 * Abstract base for all tenant-scoped domain services.
 *
 * IDOR protection: findOne() verifies the requested record belongs to the
 * caller's tenant. A cross-tenant request returns 404 (not 403) to avoid
 * leaking that the record exists.
 *
 * FAIL-CLOSED TENANT BOUNDARY:
 * Every method requires a real tenant context. Missing tenantId is a
 * ForbiddenException (403) — never an unfiltered read. Global
 * (tenantId IS NULL) rows are NOT readable by tenant-scoped callers;
 * platform-wide data must be served by dedicated platform services
 * (user/role/tenant/audit), not through this class.
 *
 * Usage:
 *   @Injectable()
 *   export class NoteService extends TenantAwareService<Note> {
 *     constructor(@InjectRepository(Note) repo: Repository<Note>) {
 *       super(repo, 'Note');
 *     }
 *   }
 */
export abstract class TenantAwareService<E extends IndustrialBaseEntity> {
  constructor(
    protected readonly repo: Repository<E>,
    protected readonly entityName: string,
  ) {}

  /** Fail-closed guard — tenant context is mandatory for tenant-scoped data. */
  protected requireTenant(tenantId?: string | null): string {
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required for tenant-scoped operation');
    }
    return tenantId;
  }

  // ── List ───────────────────────────────────────────────────────────────────
  async findAll(tenantId?: string | null, page = 1, limit = 20) {
    const scopeTenant = this.requireTenant(tenantId);
    const where: FindOptionsWhere<E> = {
      deletedAt: IsNull(),
      tenantId: scopeTenant,
    } as FindOptionsWhere<E>;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" } as any,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Tenant-isolated findOne ────────────────────────────────────────────────
  async findOne(id: string, tenantId?: string | null): Promise<E> {
    const scopeTenant = this.requireTenant(tenantId);
    const where: any = { id, deletedAt: IsNull(), tenantId: scopeTenant };

    const entity = await this.repo.findOne({ where });
    if (!entity) throw new NotFoundException(`${this.entityName} not found`);

    // Strict ownership: the record's tenant MUST equal the caller's tenant.
    // Global (tenantId IS NULL) records are not readable through this class.
    if (entity.tenantId !== scopeTenant) {
      throw new NotFoundException(`${this.entityName} not found`);
    }

    return entity;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(
    data: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<E> {
    const scopeTenant = this.requireTenant(tenantId);
    const allowed = this.extractAllowedFields(data);
    const entity = this.repo.create({
      ...allowed,
      tenantId: scopeTenant,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    } as unknown as E);
    return this.repo.save(entity);
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(
    id: string,
    data: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<E> {
    this.requireTenant(tenantId);
    const entity = await this.findOne(id, tenantId);
    const allowed = this.extractAllowedFields(data);
    Object.assign(entity, allowed, userId ? { updatedBy: userId } : {});
    return this.repo.save(entity);
  }

  protected extractAllowedFields(data: Record<string, unknown>): Record<string, unknown> {
    const protectedFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'tenantId'];
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!protectedFields.includes(key)) result[key] = value;
    }
    return result;
  }

  // ── Soft-delete ────────────────────────────────────────────────────────────
  async remove(
    id: string,
    userId?: string,
    tenantId?: string | null,
  ): Promise<{ deleted: true; id: string }> {
    this.requireTenant(tenantId);
    const entity = await this.findOne(id, tenantId);
    (entity as unknown as Record<string, unknown>)['deletedAt'] = new Date();
    if (userId) (entity as unknown as Record<string, unknown>)['updatedBy'] = userId;
    await this.repo.save(entity);
    return { deleted: true, id };
  }
}
