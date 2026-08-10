import {
  ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EngineeringDrawingService } from '@modules/engineering/services/engineering-drawing.service';
import { EngineeringBomService } from '@modules/engineering/services/engineering-bom.service';
import { EngineeringProcessPlanningService } from '@modules/engineering/services/engineering-process-planning.service';
import { EngineeringDocumentService } from '@modules/engineering/services/engineering-document.service';
import { ProcessPlanService } from '@modules/planning/services/processplan.service';
import { NcrService } from '@modules/quality/services/ncr.service';
import { CapaService } from '@modules/quality/services/capa.service';
import { WorkOrderService } from '@modules/manufacturing/services/workorder.service';
import { ServiceRequestService } from '@modules/service/services/request.service';
import { RfqService } from '@modules/commercial/services/rfq.service';
import { QuotationService } from '@modules/commercial/services/quotation.service';
import { ProjectService } from '@modules/project/services/project.service';
import { AnalyticsDashboardService } from '@modules/analytics/services/analytics-dashboard.service';
import { AnalyticsKpiService } from '@modules/analytics/services/analytics-kpi.service';
import { KnowledgeSearchService } from '@modules/knowledge/services/knowledge-search.service';
import {
  AiTool, AiToolArgs, AiToolContext, AiToolResult,
} from '../tools/ai-tool.interface';

const ENGINEERING_ROLES = ['ADMIN', 'MANAGEMENT', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'];
const MANUFACTURING_ROLES = ['ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION', 'QUALITY'];
const QUALITY_ROLES = ['ADMIN', 'MANAGEMENT', 'QUALITY', 'PRODUCTION', 'PLANNING'];
const SERVICE_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES'];
const COMMERCIAL_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES'];
const PROJECT_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY'];
const EXECUTIVE_ROLES = ['ADMIN', 'MANAGEMENT'];

/**
 * Sprint 2.8.2 Phase 3 — Tool Registry.
 *
 * Registers read-only, permission-checked tools that reuse exported
 * domain services (no new repositories, no recalculation). Execution
 * results are serialized and truncated to a configurable cap
 * (AI_TOOL_RESULT_MAX_BYTES, default 8 KB) so tool output can never blow
 * the prompt budget.
 */
@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, AiTool>();
  private readonly maxResultBytes: number;

  constructor(
    private readonly config: ConfigService,
    private readonly drawings: EngineeringDrawingService,
    private readonly boms: EngineeringBomService,
    private readonly processPlanning: EngineeringProcessPlanningService,
    private readonly documents: EngineeringDocumentService,
    private readonly processPlans: ProcessPlanService,
    private readonly ncrs: NcrService,
    private readonly capas: CapaService,
    private readonly workOrders: WorkOrderService,
    private readonly serviceRequests: ServiceRequestService,
    private readonly rfqs: RfqService,
    private readonly quotations: QuotationService,
    private readonly projects: ProjectService,
    private readonly dashboards: AnalyticsDashboardService,
    private readonly kpis: AnalyticsKpiService,
    private readonly knowledgeSearch: KnowledgeSearchService,
  ) {
    this.maxResultBytes = Math.max(1024, Number(this.config.get('AI_TOOL_RESULT_MAX_BYTES', 8192)));
  }

  onModuleInit(): void {
    for (const tool of this.buildTools()) {
      this.tools.set(tool.name, tool);
    }
    this.logger.log(`✓ Tool registry ready — ${this.tools.size} domain tools registered`);
  }

  listTools(domain?: string): Array<Pick<AiTool, 'name' | 'description' | 'domain'>> {
    return [...this.tools.values()]
      .filter((tool) => !domain || tool.domain === domain)
      .map(({ name, description, domain: toolDomain }) => ({ name, description, domain: toolDomain }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getTool(name: string): AiTool {
    const tool = this.tools.get(name);
    if (!tool) throw new NotFoundException(`AI tool ${name} is not registered`);
    return tool;
  }

  async execute(name: string, args: AiToolArgs, ctx: AiToolContext): Promise<AiToolResult> {
    const tool = this.getTool(name);
    if (!tool.roles.includes(ctx.userRole)) {
      throw new ForbiddenException(`Role ${ctx.userRole} cannot execute tool ${name}`);
    }

    const started = Date.now();
    const raw = await tool.execute(args ?? {}, ctx);
    const { serialized, truncated } = this.truncate(raw);

    return {
      tool: name,
      domain: tool.domain,
      result: serialized,
      truncated,
      durationMs: Date.now() - started,
    };
  }

  private buildTools(): AiTool[] {
    return [
      {
        name: 'engineering.drawings',
        description: 'Search or fetch engineering drawings (status, revisions, project links).',
        domain: 'engineering',
        roles: ENGINEERING_ROLES,
        execute: async (args, ctx) => args.id
          ? this.drawings.findOne(String(args.id), ctx.tenantId)
          : this.drawings.findAllAdvanced(ctx.tenantId, this.queryFrom(args)),
      },
      {
        name: 'engineering.boms',
        description: 'Search or fetch engineering BOMs with release status.',
        domain: 'engineering',
        roles: ENGINEERING_ROLES,
        execute: async (args, ctx) => args.id
          ? this.boms.findOne(String(args.id), ctx.tenantId)
          : this.boms.findAllAdvanced(ctx.tenantId, this.queryFrom(args)),
      },
      {
        name: 'engineering.routings',
        description: 'Search routings or fetch one routing with its operations.',
        domain: 'engineering',
        roles: ENGINEERING_ROLES,
        execute: async (args, ctx) => args.id
          ? this.processPlanning.getRoutingWithOperations(String(args.id), ctx.tenantId)
          : this.processPlanning.findAllAdvanced(ctx.tenantId, this.queryFrom(args)),
      },
      {
        name: 'engineering.documents',
        description: 'Search or fetch controlled engineering documents.',
        domain: 'engineering',
        roles: ENGINEERING_ROLES,
        execute: async (args, ctx) => args.id
          ? this.documents.findOne(String(args.id), ctx.tenantId)
          : this.documents.findAllAdvanced(ctx.tenantId, this.queryFrom(args)),
      },
      {
        name: 'planning.process_plans',
        description: 'Search or fetch process plans (planning domain).',
        domain: 'engineering',
        roles: ENGINEERING_ROLES,
        execute: async (args, ctx) => args.id
          ? this.processPlans.findOne(String(args.id), ctx.tenantId)
          : this.processPlans.findAll(ctx.tenantId, this.pageFrom(args), this.limitFrom(args)),
      },
      {
        name: 'quality.ncrs',
        description: 'List or fetch nonconformance reports (NCR) with status/severity filters.',
        domain: 'quality',
        roles: QUALITY_ROLES,
        execute: async (args, ctx) => args.id
          ? this.ncrs.findOne(String(args.id), ctx.tenantId)
          : this.ncrs.findAll({
              page: this.pageFrom(args),
              limit: this.limitFrom(args),
              status: args.status as any,
              projectId: args.projectId as string | undefined,
              severity: args.severity as string | undefined,
            }, ctx.tenantId),
      },
      {
        name: 'quality.capas',
        description: 'Search or fetch CAPA verification records.',
        domain: 'quality',
        roles: QUALITY_ROLES,
        execute: async (args, ctx) => args.id
          ? this.capas.findOne(String(args.id), ctx.tenantId)
          : this.capas.findAll(ctx.tenantId, this.pageFrom(args), this.limitFrom(args)),
      },
      {
        name: 'manufacturing.work_orders',
        description: 'Search or fetch manufacturing work orders with traceability links.',
        domain: 'manufacturing',
        roles: MANUFACTURING_ROLES,
        execute: async (args, ctx) => args.id
          ? this.workOrders.findOne(String(args.id), ctx.tenantId)
          : this.workOrders.findAll(ctx.tenantId, this.pageFrom(args), this.limitFrom(args)),
      },
      {
        name: 'service.service_requests',
        description: 'Search or fetch customer service requests (service history).',
        domain: 'service',
        roles: SERVICE_ROLES,
        execute: async (args, ctx) => args.id
          ? this.serviceRequests.findOne(String(args.id), ctx.tenantId)
          : this.serviceRequests.findAll(ctx.tenantId, this.pageFrom(args), this.limitFrom(args)),
      },
      {
        name: 'commercial.rfqs',
        description: 'Search RFQs or fetch one RFQ with product details.',
        domain: 'commercial',
        roles: COMMERCIAL_ROLES,
        execute: async (args, ctx) => args.id
          ? this.rfqs.findOneWithDetails(String(args.id), ctx.tenantId)
          : this.rfqs.findAllFiltered(ctx.tenantId, this.pageFrom(args), this.limitFrom(args), this.searchFrom(args)),
      },
      {
        name: 'commercial.quotations',
        description: 'Search quotations or fetch one quotation with line items.',
        domain: 'commercial',
        roles: COMMERCIAL_ROLES,
        execute: async (args, ctx) => args.id
          ? this.quotations.findOneWithItems(String(args.id), ctx.tenantId)
          : this.quotations.findAllFiltered(ctx.tenantId, this.pageFrom(args), this.limitFrom(args), this.searchFrom(args)),
      },
      {
        name: 'project.projects',
        description: 'Search or fetch projects with stage and health context.',
        domain: 'project',
        roles: PROJECT_ROLES,
        execute: async (args, ctx) => args.id
          ? this.projects.findOne(String(args.id), ctx.tenantId)
          : this.projects.findAll(ctx.tenantId, this.pageFrom(args), this.limitFrom(args)),
      },
      {
        name: 'analytics.bi_query',
        description: 'Read-only executive BI snapshot (dashboard + KPIs). Never recalculated.',
        domain: 'executive',
        roles: EXECUTIVE_ROLES,
        execute: async (args, ctx) => ({
          dashboard: await this.dashboards.getExecutiveDashboard(ctx.tenantId),
          kpis: await this.kpis.getKpis(ctx.tenantId, String(args.period ?? '30d')),
        }),
      },
      {
        name: 'knowledge.search',
        description: 'Semantic search across indexed tenant knowledge.',
        domain: 'project',
        roles: PROJECT_ROLES,
        execute: async (args, ctx) => this.knowledgeSearch.search({
          query: String(args.query ?? args.search ?? ''),
          tenantId: ctx.tenantId,
          topK: Math.min(20, Math.max(1, Number(args.limit ?? 8))),
          page: 1,
          limit: Math.min(20, Math.max(1, Number(args.limit ?? 8))),
        }),
      },
    ];
  }

  private queryFrom(args: AiToolArgs): Record<string, any> {
    const query: Record<string, any> = {
      page: this.pageFrom(args),
      limit: this.limitFrom(args),
    };
    const search = this.searchFrom(args);
    if (search) query.search = search;
    if (args.status) query.status = args.status;
    if (args.projectId) query.projectId = args.projectId;
    return query;
  }

  private searchFrom(args: AiToolArgs): string | undefined {
    const value = args.search ?? args.query;
    return value ? String(value) : undefined;
  }

  private pageFrom(args: AiToolArgs): number {
    return Math.max(1, Number(args.page ?? 1));
  }

  private limitFrom(args: AiToolArgs): number {
    return Math.min(50, Math.max(1, Number(args.limit ?? 10)));
  }

  private truncate(raw: unknown): { serialized: unknown; truncated: boolean } {
    const json = JSON.stringify(raw ?? null);
    if (json.length <= this.maxResultBytes) {
      return { serialized: raw, truncated: false };
    }

    if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) {
      const list = raw as { data: unknown[] } & Record<string, unknown>;
      let kept = list.data.length;
      while (kept > 0 && JSON.stringify({ ...list, data: list.data.slice(0, kept) }).length > this.maxResultBytes) {
        kept = Math.floor(kept / 2);
      }
      return {
        serialized: { ...list, data: list.data.slice(0, kept), truncated: true, originalCount: list.data.length },
        truncated: true,
      };
    }

    return {
      serialized: { truncated: true, note: `Tool result exceeded ${this.maxResultBytes} bytes.`, sizeBytes: json.length },
      truncated: true,
    };
  }
}
