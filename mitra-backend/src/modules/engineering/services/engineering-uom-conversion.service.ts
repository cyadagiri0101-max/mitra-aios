import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  EngineeringUomConversion, UomConversionType,
} from '../entities/engineering-uom-conversion.entity';

/**
 * Unit-of-measure conversion catalog (G-8). Provides CRUD over
 * `uom_conversions` and a `convert()` that resolves the factor via
 * direct lookup → reverse lookup → identity, preferring tenant-specific
 * rows over the global seed (tenant_id IS NULL).
 */
@Injectable()
export class EngineeringUomConversionService {
  constructor(
    @InjectRepository(EngineeringUomConversion)
    private readonly conversionRepo: Repository<EngineeringUomConversion>,
  ) {}

  async findAll(tenantId?: string | null, query: Record<string, any> = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const qb = this.conversionRepo.createQueryBuilder('u').where('u.deleted_at IS NULL');
    if (query.search) {
      qb.andWhere('(u.from_uom ILIKE :search OR u.to_uom ILIKE :search)', { search: `%${query.search}%` });
    }
    qb.orderBy('u.from_uom', 'ASC').addOrderBy('u.to_uom', 'ASC');
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId?: string | null) {
    const where: any = { id, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    const conversion = await this.conversionRepo.findOne({ where });
    if (!conversion) throw new NotFoundException('UoM conversion not found');
    return conversion;
  }

  async create(data: Record<string, any>, userId: string, tenantId?: string | null) {
    const fromUom = String(data.fromUom ?? '').trim().toUpperCase();
    const toUom = String(data.toUom ?? '').trim().toUpperCase();
    if (!fromUom || !toUom) throw new BadRequestException('fromUom and toUom are required');
    const factor = Number(data.conversionFactor);
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new BadRequestException('conversionFactor must be a positive number');
    }
    const where: any = { fromUom, toUom, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    if (await this.conversionRepo.findOne({ where })) {
      throw new BadRequestException(`Conversion ${fromUom} → ${toUom} already exists`);
    }
    const conversion = this.conversionRepo.create({
      ...data,
      fromUom,
      toUom,
      conversionFactor: factor,
      conversionType: data.conversionType ?? UomConversionType.EXACT,
      createdBy: userId,
      updatedBy: userId,
      tenantId: tenantId ?? undefined,
    });
    return this.conversionRepo.save(conversion);
  }

  async update(id: string, data: Record<string, any>, userId: string, tenantId?: string | null) {
    const conversion = await this.findOne(id, tenantId);
    if (data.conversionFactor !== undefined) {
      const factor = Number(data.conversionFactor);
      if (!Number.isFinite(factor) || factor <= 0) {
        throw new BadRequestException('conversionFactor must be a positive number');
      }
      conversion.conversionFactor = factor;
    }
    if (data.conversionType !== undefined) conversion.conversionType = data.conversionType;
    if (data.source !== undefined) conversion.source = data.source ?? null;
    if (data.notes !== undefined) conversion.notes = data.notes ?? null;
    conversion.updatedBy = userId;
    return this.conversionRepo.save(conversion);
  }

  async remove(id: string, userId: string, tenantId?: string | null) {
    const conversion = await this.findOne(id, tenantId);
    conversion.deletedAt = new Date();
    conversion.updatedBy = userId;
    await this.conversionRepo.save(conversion);
    return { deleted: true, id };
  }

  /**
   * Convert a quantity from one UoM to another.
   * Resolution order: direct factor → reverse factor → identity (same UoM)
   * → throw. Tenant-specific rows win over the global seed.
   */
  async convert(value: number, fromUom: string, toUom: string, tenantId?: string | null): Promise<number> {
    const from = String(fromUom ?? '').trim().toUpperCase();
    const to = String(toUom ?? '').trim().toUpperCase();
    if (!from || !to) throw new BadRequestException('from and to UoM are required');
    const input = Number(value);
    if (!Number.isFinite(input)) throw new BadRequestException('value must be a number');
    if (from === to) return input;

    const lookup = async (f: string, t: string): Promise<EngineeringUomConversion | null> => {
      if (tenantId) {
        const tenantRow = await this.conversionRepo.findOne({
          where: { fromUom: f, toUom: t, deletedAt: IsNull(), tenantId },
        });
        if (tenantRow) return tenantRow;
      }
      return this.conversionRepo.findOne({
        where: { fromUom: f, toUom: t, deletedAt: IsNull(), tenantId: IsNull() },
      });
    };

    const direct = await lookup(from, to);
    if (direct) return Number((input * Number(direct.conversionFactor)).toFixed(6));

    const reverse = await lookup(to, from);
    if (reverse) return Number((input / Number(reverse.conversionFactor)).toFixed(6));

    throw new BadRequestException(`No conversion rule found for ${from} → ${to}`);
  }
}
