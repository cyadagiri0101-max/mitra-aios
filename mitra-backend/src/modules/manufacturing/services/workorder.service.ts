import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkOrder } from '../entities/workorder.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

/**
 * Work orders (Manufacturing). Sprint 2.3.1 G-1: work orders carry
 * artifact traceability links (drawing / BOM / BOM item / routing /
 * process plan). Links are validated against the engineering + planning
 * tables (raw reads — cross-module convention, no relations) and may only
 * reference RELEASED artifacts, per the traceability contract: "MO
 * manufactured against released drawing/BOM/routing".
 */
@Injectable()
export class WorkOrderService extends TenantAwareService<WorkOrder> {
  constructor(
    @InjectRepository(WorkOrder)
    repo: Repository<WorkOrder>,
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'WorkOrder');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    await this.validateArtifactLinks(data, tenantId);
    const withNumber = { ...data, woNumber: data.woNumber ?? this.nextNumber('WO') };
    return super.create(withNumber, userId, tenantId);
  }

  private nextNumber(prefix: string): string {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
  }

  async update(id: string, data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    await this.validateArtifactLinks(data, tenantId);
    return super.update(id, data, userId, tenantId);
  }

  private async validateArtifactLinks(data: Record<string, unknown>, tenantId?: string | null): Promise<void> {
    const scopeTenant = this.requireTenant(tenantId);
    if (data.drawingId) await this.assertReleased('engineering_drawings', data.drawingId, 'Drawing', scopeTenant);
    if (data.bomId) await this.assertReleased('engineering_boms', data.bomId, 'BOM', scopeTenant);
    if (data.bomItemId) {
      const item = await this.assertExists('engineering_bom_items', data.bomItemId, 'BOM item', 'id, bom_id, status', scopeTenant);
      if (data.bomId && String(item.bom_id) !== String(data.bomId)) {
        throw new BadRequestException('bomItemId does not belong to the given bomId');
      }
    }
    if (data.routingId) await this.assertReleased('engineering_routings', data.routingId, 'Routing', scopeTenant);
    if (data.processPlanId) await this.assertReleased('process_plans', data.processPlanId, 'Process plan', scopeTenant);
  }

  private async assertExists(table: string, id: unknown, label: string, select = 'id, status', tenantId?: string | null) {
    const rows = await this.dataSource.query(
      `SELECT ${select} FROM "${table}" WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
    if (!rows?.length) throw new BadRequestException(`${label} not found — no orphan work order links`);
    return rows[0];
  }

  /** Public for the WorkOrderEngineService (release re-validates artifacts). */
  async assertReleased(table: string, id: unknown, label: string, tenantId?: string | null) {
    const row = await this.assertExists(table, id, label, 'id, status', tenantId);
    if (String(row.status) !== 'RELEASED') {
      throw new BadRequestException(`${label} must be RELEASED before use in a work order`);
    }
    return row;
  }
}
