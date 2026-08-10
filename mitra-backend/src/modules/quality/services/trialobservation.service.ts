import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TrialObservation } from '../entities/trialobservation.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';

/**
 * Trial observations (Quality). Sprint 2.3.1 G-1: trials reference the
 * part / drawing / BOM item / routing under evaluation. Links are
 * existence-validated against the engineering tables (raw reads — no
 * relations). Trials are part of the release process, so RELEASED status
 * is NOT required.
 */
@Injectable()
export class TrialObservationService extends TenantAwareService<TrialObservation> {
  constructor(
    @InjectRepository(TrialObservation)
    repo: Repository<TrialObservation>,
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'TrialObservation');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    await this.validateArtifactLinks(data);
    return super.create(data, userId, tenantId);
  }

  async update(id: string, data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    await this.validateArtifactLinks(data);
    return super.update(id, data, userId, tenantId);
  }

  private async validateArtifactLinks(data: Record<string, unknown>): Promise<void> {
    if (data.drawingId) await this.assertExists('engineering_drawings', data.drawingId, 'Drawing');
    if (data.bomItemId) await this.assertExists('engineering_bom_items', data.bomItemId, 'BOM item');
    if (data.routingId) await this.assertExists('engineering_routings', data.routingId, 'Routing');
  }

  private async assertExists(table: string, id: unknown, label: string) {
    const rows = await this.dataSource.query(
      `SELECT id FROM "${table}" WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!rows?.length) throw new BadRequestException(`${label} not found — no orphan trial links`);
  }
}
