import { NotFoundException } from '@nestjs/common';
import { Repository, IsNull, FindOptionsWhere } from 'typeorm';
import { IndustrialBaseEntity } from '../entities/industrial-base.entity';

/**
 * Abstract base for all tenant-scoped domain services.
 *
 * IDOR protection: findOne() verifies the requested record belongs to the
 * caller's tenant. A cross-tenant request returns 404 (not 403) to avoid
 * leaking that the record exists.
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

  // ── List ───────────────────────────────────────────────────────────────────
  async findAll(tenantId?: string | null, page = 1, limit = 20) {
    const where: FindOptionsWhere<E> = { deletedAt: IsNull() } as FindOptionsWhere<E>;
    if (tenantId) (where as Record<string, unknown>)['tenantId'] = tenantId;

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
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;

    const entity = await this.repo.findOne({ where });
    if (!entity) throw new NotFoundException(`${this.entityName} not found`);

    return entity;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(
    data: Record<string, unknown>,
    userId?: string,
    tenantId?: string | null,
  ): Promise<E> {
    const allowed = this.extractAllowedFields(data);
    const entity = this.repo.create({
      ...allowed,
      ...(tenantId ? { tenantId } : {}),
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
    const entity = await this.findOne(id, tenantId);
    (entity as unknown as Record<string, unknown>)['deletedAt'] = new Date();
    if (userId) (entity as unknown as Record<string, unknown>)['updatedBy'] = userId;
    await this.repo.save(entity);
    return { deleted: true, id };
  }
}
