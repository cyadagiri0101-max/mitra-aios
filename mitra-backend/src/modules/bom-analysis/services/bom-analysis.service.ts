import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BomAnalysis } from '../entities/bom-analysis.entity';
import { BomItem } from '../entities/bom-item.entity';
import { AnalyzeBomDto, BomAnalysisResponseDto } from '../dto/bom-analysis.dto';

@Injectable()
export class BomAnalysisService {
  private readonly logger = new Logger(BomAnalysisService.name);

  constructor(
    @InjectRepository(BomAnalysis)
    private readonly analysisRepo: Repository<BomAnalysis>,
    @InjectRepository(BomItem)
    private readonly itemRepo: Repository<BomItem>,
  ) {}

  private requireTenant(tenantId?: string | null): string {
    if (!tenantId || tenantId.trim() === '') {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  async analyzeBOM(projectId: string, bomData: Record<string, any>, tenantId?: string | null): Promise<BomAnalysisResponseDto> {
    const scopeTenant = this.requireTenant(tenantId);
    const t0 = Date.now();

    // Simulate AI analysis
    const parts = bomData?.parts ?? [];
    const complexityScore = this.calculateComplexity(parts);
    const riskAreas = this.detectRiskAreas(parts);
    const confidence = Math.min(0.95, 0.6 + parts.length * 0.02);

    const analysis = this.analysisRepo.create({
      projectId,
      tenantId: scopeTenant,
      bomData,
      complexityScore,
      riskAreas,
      confidence,
    });

    const saved = await this.analysisRepo.save(analysis);

    // Generate simulated BOM items
    const items: BomItem[] = parts.map((p: any) => {
      const riskLevel = this.assessRiskLevel(p);
      return this.itemRepo.create({
        analysisId: saved.id,
        partNumber: p.partNumber ?? p.part_number ?? 'UNKNOWN',
        quantity: p.quantity ?? 1,
        material: p.material ?? null,
        vendor: p.vendor ?? null,
        leadTime: p.leadTime ?? p.lead_time ?? null,
        riskLevel,
        substituteSuggestions: this.generateSubstitutes(p, riskLevel),
      });
    });

    await this.itemRepo.save(items);

    this.logger.log(`BOM analysis completed in ${Date.now() - t0}ms for project ${projectId}`);

    return this.mapToResponse(saved, items);
  }

  async getAnalysis(id: string, tenantId?: string | null): Promise<BomAnalysisResponseDto> {
    const scopeTenant = this.requireTenant(tenantId);
    const analysis = await this.analysisRepo.findOne({
      where: { id, deletedAt: IsNull(), tenantId: scopeTenant },
      relations: ['items'],
    });
    if (!analysis) throw new NotFoundException(`BOM Analysis ${id} not found`);
    return this.mapToResponse(analysis, analysis.items ?? []);
  }

  async getProjectAnalyses(projectId: string, tenantId?: string | null): Promise<BomAnalysisResponseDto[]> {
    const scopeTenant = this.requireTenant(tenantId);
    const analyses = await this.analysisRepo.find({
      where: { projectId, deletedAt: IsNull(), tenantId: scopeTenant },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return analyses.map((a) => this.mapToResponse(a, a.items ?? []));
  }

  // ── Simulated AI logic ───────────────────────────────────────────────────────

  private calculateComplexity(parts: any[]): number {
    if (!parts.length) return 0;
    const uniqueMaterials = new Set(parts.map((p) => p.material)).size;
    const totalQty = parts.reduce((sum, p) => sum + (p.quantity ?? 1), 0);
    const vendorCount = new Set(parts.map((p) => p.vendor).filter(Boolean)).size;
    const raw = (uniqueMaterials * 2 + totalQty * 0.1 + vendorCount * 1.5) / parts.length;
    return Math.min(10, Math.round(raw * 10) / 10);
  }

  private detectRiskAreas(parts: any[]): Record<string, any>[] {
    const risks: Record<string, any>[] = [];
    if (parts.length > 50) {
      risks.push({ type: 'HIGH_PART_COUNT', severity: 'medium', message: 'High part count increases assembly complexity' });
    }
    const noVendor = parts.filter((p) => !p.vendor).length;
    if (noVendor > 0) {
      risks.push({ type: 'MISSING_VENDOR', severity: 'high', message: `${noVendor} parts lack vendor information`, affectedParts: noVendor });
    }
    const longLead = parts.filter((p) => (p.leadTime ?? 0) > 30).length;
    if (longLead > 0) {
      risks.push({ type: 'LONG_LEAD_TIME', severity: 'high', message: `${longLead} parts have lead time > 30 days`, affectedParts: longLead });
    }
    return risks;
  }

  private assessRiskLevel(part: any): string {
    if (!part.vendor) return 'CRITICAL';
    if ((part.leadTime ?? 0) > 30) return 'HIGH';
    if ((part.leadTime ?? 0) > 14) return 'MEDIUM';
    return 'LOW';
  }

  private generateSubstitutes(part: any, riskLevel: string): Record<string, any>[] | null {
    if (riskLevel === 'LOW') return null;
    const suggestions: Record<string, any>[] = [];
    if (!part.vendor) {
      suggestions.push({ reason: 'No vendor assigned', action: 'Identify approved vendor or use in-house fabrication' });
    }
    if ((part.leadTime ?? 0) > 30) {
      suggestions.push({ reason: 'Long lead time', action: 'Consider alternative material or local supplier' });
    }
    return suggestions.length ? suggestions : null;
  }

  private mapToResponse(analysis: BomAnalysis, items: BomItem[]): BomAnalysisResponseDto {
    return {
      id: analysis.id,
      projectId: analysis.projectId,
      bomData: analysis.bomData,
      complexityScore: analysis.complexityScore ?? undefined,
      riskAreas: analysis.riskAreas ?? undefined,
      confidence: analysis.confidence ?? undefined,
      items: items.map((i) => ({
        partNumber: i.partNumber,
        quantity: i.quantity ?? undefined,
        material: i.material ?? undefined,
        vendor: i.vendor ?? undefined,
        leadTime: i.leadTime ?? undefined,
      })),
      createdAt: analysis.createdAt,
    };
  }
}
