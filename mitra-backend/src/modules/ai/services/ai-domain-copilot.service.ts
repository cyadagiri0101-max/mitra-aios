import { Injectable } from '@nestjs/common';
import { KnowledgeContextBuilderService } from '@modules/knowledge/services/knowledge-context-builder.service';
import { KnowledgeSearchService } from '@modules/knowledge/services/knowledge-search.service';
import { KnowledgeGraphService } from '@modules/knowledge/services/knowledge-graph.service';
import { EmbeddingEntityType } from '../entities/knowledge-embedding.entity';
import { CopilotDomain } from '../dto/copilot.dto';

@Injectable()
export class AiDomainCopilotService {
  constructor(
    private readonly contextBuilder: KnowledgeContextBuilderService,
    private readonly search: KnowledgeSearchService,
    private readonly graph: KnowledgeGraphService,
  ) {}

  async buildDomainContext(domain: CopilotDomain, entityType: string | undefined, entityId: string | undefined, tenantId: string, query: string) {
    const search = await this.search.search({
      query: this.searchQuery(domain, query, entityType, entityId),
      tenantId,
      types: this.embeddingTypesFor(domain),
      topK: 8,
      page: 1,
      limit: 8,
    });

    if (!entityType || !entityId) {
      return { context: null, search, graph: [] };
    }

    const context = await this.contextBuilder.buildContext(entityType, entityId, tenantId);
    const graph = await this.graph.findByEntity(tenantId, entityType, entityId);
    return { context, search, graph };
  }

  mapTask(domain: CopilotDomain, message: string, requestedTask?: string): string {
    if (requestedTask) return requestedTask;
    const lower = message.toLowerCase();

    if (domain === CopilotDomain.ENGINEERING) {
      if (/bom/.test(lower)) return 'engineering.explain_bom';
      if (/compare|revision|change/.test(lower)) return 'engineering.compare_revisions';
      if (/similar.*drawing|drawing.*similar/.test(lower)) return 'engineering.find_similar_drawings';
      if (/process|routing|plan/.test(lower)) return 'engineering.summarize_process_plans';
      return 'engineering.explain_drawing';
    }

    if (domain === CopilotDomain.MANUFACTURING) {
      if (/downtime/.test(lower)) return 'manufacturing.downtime_analysis';
      if (/utili[sz]ation|machine/.test(lower)) return 'manufacturing.machine_utilization';
      if (/material|variance/.test(lower)) return 'manufacturing.material_variance';
      if (/scrap/.test(lower)) return 'manufacturing.explain_scrap';
      if (/rework/.test(lower)) return 'manufacturing.explain_rework';
      if (/cycle/.test(lower)) return 'manufacturing.cycle_time_review';
      return 'manufacturing.production_summary';
    }

    if (domain === CopilotDomain.QUALITY) {
      if (/ncr|non.?conform/.test(lower)) return 'quality.ncr_explanation';
      if (/capa|corrective|preventive/.test(lower)) return 'quality.capa_summary';
      if (/fmea/.test(lower)) return 'quality.fmea_assistance';
      if (/ppap|apqp/.test(lower)) return 'quality.ppap_checklist_guidance';
      if (/supplier/.test(lower)) return 'quality.supplier_quality_summary';
      return 'quality.inspection_summary';
    }

    if (domain === CopilotDomain.SERVICE) {
      if (/spare/.test(lower)) return 'service.recommended_spare_parts';
      if (/pattern|failure/.test(lower)) return 'service.failure_pattern_summary';
      if (/maintenance/.test(lower)) return 'service.maintenance_history';
      if (/timeline/.test(lower)) return 'service.customer_service_timeline';
      return 'service.warranty_summary';
    }

    if (domain === CopilotDomain.EXECUTIVE) {
      if (/portfolio/.test(lower)) return 'executive.project_portfolio_summary';
      if (/revenue/.test(lower)) return 'executive.revenue_overview';
      if (/quality/.test(lower)) return 'executive.quality_trends';
      if (/risk/.test(lower)) return 'executive.risk_summary';
      return 'executive.company_health_summary';
    }

    if (domain === CopilotDomain.COMMERCIAL) return 'commercial.pipeline_summary';
    if (domain === CopilotDomain.PROJECT) return 'project.find_similar_projects';
    return 'default.fallback';
  }

  private searchQuery(domain: CopilotDomain, query: string, entityType?: string, entityId?: string) {
    return [domain, entityType, entityId, query].filter(Boolean).join(' ');
  }

  private embeddingTypesFor(domain: CopilotDomain): EmbeddingEntityType[] | undefined {
    switch (domain) {
      case CopilotDomain.PROJECT:
      case CopilotDomain.EXECUTIVE:
        return [EmbeddingEntityType.PROJECT, EmbeddingEntityType.KNOWLEDGE];
      case CopilotDomain.SERVICE:
        return [EmbeddingEntityType.SERVICE, EmbeddingEntityType.KNOWLEDGE];
      case CopilotDomain.QUALITY:
        return [EmbeddingEntityType.CAPA, EmbeddingEntityType.TRIAL, EmbeddingEntityType.KNOWLEDGE];
      case CopilotDomain.MANUFACTURING:
        return [EmbeddingEntityType.WORK_ORDER, EmbeddingEntityType.KNOWLEDGE];
      default:
        return undefined;
    }
  }
}
