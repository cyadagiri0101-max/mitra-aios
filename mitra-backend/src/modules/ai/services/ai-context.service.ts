import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AiIntent } from '../dto/ai.dto';

/**
 * Fetches live database records to ground AI responses in real data.
 *
 * Design rules:
 *  - Max 20 records per category (keeps prompts under ~8k tokens).
 *  - Every query is wrapped in try/catch — a degraded context is better
 *    than a crashed AI endpoint.
 *  - All queries use TypeORM QueryBuilder (parameterised, schema-aware)
 *    instead of raw SQL strings.
 *  - All queries are tenant-isolated (tenant_id filter on every table).
 */
@Injectable()
export class AiContextService {
  private readonly logger = new Logger(AiContextService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async buildContext(
    intent: AiIntent,
    tenantId: string,
  ): Promise<{ intent: AiIntent; data: Record<string, any[]>; summary: string }> {
    const data: Record<string, any[]> = {};

    switch (intent) {
      // ── Projects ──────────────────────────────────────────────────────────
      case AiIntent.PROJECTS:
      case AiIntent.GENERAL:
        try {
          data.projects = await this.em
            .createQueryBuilder()
            .select([
              'p.project_number    AS "projectNumber"',
              'p.name              AS "name"',
              'p.customer_name     AS "customerName"',
              'p.product_name      AS "productName"',
              'p.stage             AS "currentStage"',
              'p.health_status     AS "healthStatus"',
              "p.target_delivery_date::text AS \"targetDeliveryDate\"",
              'p.days_overdue      AS "daysOverdue"',
              "u.first_name || ' ' || u.last_name AS \"projectManager\"",
            ])
            .from('projects', 'p')
            .leftJoin('users', 'u', 'u.id = p.project_manager_id')
            .where('p.tenant_id = :tenantId', { tenantId })
            .andWhere('p.deleted_at IS NULL')
            .andWhere('p.stage NOT IN (:...excludedStages)', {
              excludedStages: ['DELIVERED', 'CANCELLED'],
            })
            .orderBy('p.created_at', 'DESC')
            .limit(20)
            .getRawMany();
        } catch (err: any) {
          this.logger.warn(`AI context [projects]: ${err.message}`);
          data.projects = [];
        }
        break;

      // ── Trials ────────────────────────────────────────────────────────────
      case AiIntent.TRIALS:
        try {
          data.recent_trials = await this.em
            .createQueryBuilder()
            .select([
              't.trial_date::text          AS "trialDate"',
              't.trial_type                AS "trialType"',
              't.result                    AS "result"',
              't.mold_temperature_c        AS "moldTemperatureC"',
              't.injection_pressure_bar    AS "injectionPressureBar"',
              't.cycle_time_seconds        AS "cycleTimeSeconds"',
              't.shots_taken               AS "shotsTaken"',
              't.good_parts                AS "goodParts"',
              't.rejected_parts            AS "rejectedParts"',
              't.observations              AS "observations"',
              't.corrective_actions        AS "correctiveActions"',
              'p.project_number            AS "projectNumber"',
              'p.product_name              AS "productName"',
            ])
            .from('trial_observations', 't')
            .leftJoin('projects', 'p', 'p.id = t.project_id')
            .where('t.tenant_id = :tenantId', { tenantId })
            .andWhere('t.deleted_at IS NULL')
            .orderBy('t.trial_date', 'DESC')
            .limit(20)
            .getRawMany();
        } catch (err: any) {
          this.logger.warn(`AI context [trials]: ${err.message}`);
          data.recent_trials = [];
        }
        break;

      // ── CAPA ──────────────────────────────────────────────────────────────
      case AiIntent.CAPA:
        try {
          data.open_capas = await this.em
            .createQueryBuilder()
            .select([
              'c.capa_number                       AS "capaNumber"',
              'c.capa_type                         AS "capaType"',
              'c.problem_description               AS "issueDescription"',
              'c.root_cause                        AS "rootCause"',
              'c.corrective_action                 AS "correctiveAction"',
              'c.preventive_action                 AS "preventiveAction"',
              'c.status                            AS "status"',
              'c.target_date::text                 AS "targetCloseDate"',
              "c.created_at::date::text            AS \"raisedOn\"",
              "CURRENT_DATE - c.created_at::date   AS \"ageDays\"",
              'p.project_number                    AS "projectNumber"',
              'p.product_name                      AS "productName"',
              "u.first_name || ' ' || u.last_name  AS \"assignedTo\"",
            ])
            .from('capa_verifications', 'c')
            .leftJoin('projects', 'p', 'p.id = c.project_id')
            .leftJoin('users', 'u', 'u.id = c.responsible_person_id')
            .where('c.tenant_id = :tenantId', { tenantId })
            .andWhere('c.deleted_at IS NULL')
            .andWhere('c.status NOT IN (:...excludedStatuses)', {
              excludedStatuses: ['CLOSED', 'REJECTED'],
            })
            .orderBy('c.created_at', 'DESC')
            .limit(20)
            .getRawMany();
        } catch (err: any) {
          this.logger.warn(`AI context [capa]: ${err.message}`);
          data.open_capas = [];
        }
        break;

      // ── Manufacturing ─────────────────────────────────────────────────────
      case AiIntent.MANUFACTURING:
        try {
          data.work_orders = await this.em
            .createQueryBuilder()
            .select([
              'w.wo_number              AS "workOrderNumber"',
              'w.part_name              AS "partName"',
              'w.operation_type         AS "operationType"',
              'w.status                 AS "status"',
              'w.priority               AS "priority"',
              'w.planned_start_date::text AS "plannedStartDate"',
              'w.planned_end_date::text   AS "plannedEndDate"',
              'w.estimated_hours        AS "estimatedHours"',
              'mt.type_name             AS "machine"',
              'p.project_number         AS "projectNumber"',
            ])
            .from('work_orders', 'w')
            .leftJoin('machine_masters', 'mm', 'mm.id = w.machine_id')
            .leftJoin('machine_types', 'mt', 'mt.id = mm.machine_type_id')
            .leftJoin('projects', 'p', 'p.id = w.project_id')
            .where('w.tenant_id = :tenantId', { tenantId })
            .andWhere('w.deleted_at IS NULL')
            .andWhere('w.status NOT IN (:...excludedStatuses)', {
              excludedStatuses: ['COMPLETED', 'CANCELLED'],
            })
            .orderBy('w.created_at', 'DESC')
            .limit(20)
            .getRawMany();
        } catch (err: any) {
          this.logger.warn(`AI context [manufacturing]: ${err.message}`);
          data.work_orders = [];
        }
        break;

      // ── Dispatch ──────────────────────────────────────────────────────────
      // No dispatch table in the current schema. Returns empty until the
      // dispatch module and migration are added.
      case AiIntent.DISPATCH:
        this.logger.warn('AI context [dispatch]: no dispatch table in schema — returning empty.');
        data.dispatches = [];
        break;

      // ── Service ───────────────────────────────────────────────────────────
      case AiIntent.SERVICE:
        try {
          data.service_requests = await this.em
            .createQueryBuilder()
            .select([
              's.sr_number          AS "serviceNumber"',
              's.customer_name      AS "customerName"',
              's.issue_description  AS "issueDescription"',
              's.service_type       AS "serviceType"',
              's.status             AS "status"',
              's.priority           AS "priority"',
              's.reported_date::text AS "reportedDate"',
              's.warranty_claim     AS "warrantyClaim"',
            ])
            .from('service_requests', 's')
            .where('s.tenant_id = :tenantId', { tenantId })
            .andWhere('s.deleted_at IS NULL')
            .andWhere('s.status NOT IN (:...excludedStatuses)', {
              excludedStatuses: ['CLOSED', 'CANCELLED'],
            })
            .orderBy('s.created_at', 'DESC')
            .limit(20)
            .getRawMany();
        } catch (err: any) {
          this.logger.warn(`AI context [service]: ${err.message}`);
          data.service_requests = [];
        }
        break;

      // ── Workflow ──────────────────────────────────────────────────────────
      case AiIntent.WORKFLOW:
        try {
          data.workflow_summary = await this.em
            .createQueryBuilder()
            .select([
              'wi.entity_type    AS "entityType"',
              'ws.name           AS "currentStage"',
              'COUNT(*)::int     AS "count"',
            ])
            .from('workflow_instances', 'wi')
            .innerJoin('workflow_states', 'ws', 'ws.id = wi.current_state_id')
            .where('wi.tenant_id = :tenantId', { tenantId })
            .andWhere('wi.deleted_at IS NULL')
            .groupBy('wi.entity_type')
            .addGroupBy('ws.name')
            .orderBy('wi.entity_type')
            .addOrderBy('"count"', 'DESC')
            .getRawMany();
        } catch (err: any) {
          this.logger.warn(`AI context [workflow]: ${err.message}`);
          data.workflow_summary = [];
        }
        break;

      // ── Knowledge ─────────────────────────────────────────────────────────
      case AiIntent.KNOWLEDGE:
        try {
          data.articles = await this.em
            .createQueryBuilder()
            .select([
              'ka.title        AS "title"',
              'ka.summary      AS "summary"',
              'ka.article_type AS "category"',
              'ka.view_count   AS "viewCount"',
            ])
            .from('knowledge_articles', 'ka')
            .where('ka.tenant_id = :tenantId', { tenantId })
            .andWhere('ka.deleted_at IS NULL')
            .andWhere("ka.status = 'PUBLISHED'")
            .orderBy('ka.view_count', 'DESC')
            .limit(15)
            .getRawMany();
        } catch (err: any) {
          this.logger.warn(`AI context [knowledge]: ${err.message}`);
          data.articles = [];
        }
        break;
    }

    const recordCount = Object.values(data).reduce((s, arr) => s + arr.length, 0);
    const summary = `Fetched ${recordCount} records from MITRA database (intent: ${intent})`;
    return { intent, data, summary };
  }
}
