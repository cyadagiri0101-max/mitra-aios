# MITRA v4.0 — AI Capability Matrix

**Sprint 2.8.3 · Verified repository behavior**

Source of truth: `src/modules/ai/copilots/copilot-capability.data.ts`
(verified: **56 capabilities across 7 domains**).

| Domain | Copilot | Capabilities |
|---|---|---|
| `engineering` | Engineering Copilot | 15 |
| `manufacturing` | Manufacturing Copilot | 8 |
| `quality` | Quality Copilot | 7 |
| `commercial` | Commercial Copilot | 7 |
| `project` | Project Copilot | 6 |
| `service` | Service Copilot | 6 |
| `executive` | Executive Copilot | 7 |
| **Total** | | **56** |

---

## Capability → Prompt Task & Auto-Tools (extracted verbatim)

### engineering (15)

| Capability key | Prompt task | Auto tools |
|---|---|---|
| `engineering.drawings.explain` | `engineering.explain_drawing` | engineering.drawings |
| `engineering.drawings.revision_compare` | `engineering.compare_revisions` | engineering.drawings |
| `engineering.drawings.manufacturing_impact` | `engineering.manufacturing_impact` | engineering.drawings, engineering.routings, manufacturing.work_orders |
| `engineering.drawings.similar` | `engineering.find_similar_drawings` | engineering.drawings |
| `engineering.bom.explain` | `engineering.explain_bom` | engineering.boms |
| `engineering.bom.gap_analysis` | `engineering.bom_gap_analysis` | engineering.boms, engineering.drawings |
| `engineering.bom.cost_analysis` | `engineering.bom_cost_analysis` | engineering.boms, engineering.routings |
| `engineering.bom.alternate_materials` | `engineering.alternate_materials` | engineering.boms, knowledge.search |
| `engineering.routing.explain` | `engineering.summarize_process_plans` | engineering.routings |
| `engineering.routing.cycle_time` | `engineering.cycle_time_analysis` | engineering.routings, manufacturing.work_orders |
| `engineering.routing.optimization` | `engineering.operation_optimization` | engineering.routings, manufacturing.work_orders |
| `engineering.routing.machine_selection` | `engineering.machine_selection` | engineering.routings, knowledge.search |
| `engineering.review.design_review` | `engineering.design_review` | engineering.drawings, engineering.boms |
| `engineering.review.dfm` | `engineering.dfm_recommendations` | engineering.drawings, engineering.routings |
| `engineering.review.risk` | `engineering.risk_identification` | engineering.drawings, engineering.boms, quality.ncrs |

### manufacturing (8)

| Capability key | Prompt task | Auto tools |
|---|---|---|
| `manufacturing.work_orders.status` | `manufacturing.production_summary` | manufacturing.work_orders |
| `manufacturing.machines.utilization` | `manufacturing.machine_utilization` | manufacturing.work_orders |
| `manufacturing.delays.analysis` | `manufacturing.delay_analysis` | manufacturing.work_orders |
| `manufacturing.scrap.explain` | `manufacturing.explain_scrap` | manufacturing.work_orders, quality.ncrs |
| `manufacturing.downtime.analysis` | `manufacturing.downtime_analysis` | manufacturing.work_orders |
| `manufacturing.oee.calculation` | `manufacturing.oee_analysis` | manufacturing.work_orders |
| `manufacturing.schedule.recommendations` | `manufacturing.schedule_recommendation` | manufacturing.work_orders, engineering.routings |
| `manufacturing.capacity.assessment` | `manufacturing.capacity_assessment` | manufacturing.work_orders, engineering.routings |

### quality (7)

| Capability key | Prompt task | Auto tools |
|---|---|---|
| `quality.ncrs.explain` | `quality.ncr_explanation` | quality.ncrs |
| `quality.capas.summary` | `quality.capa_summary` | quality.capas |
| `quality.inspections.summary` | `quality.inspection_summary` | quality.ncrs |
| `quality.ppap.readiness` | `quality.ppap_checklist_guidance` | quality.capas, engineering.drawings |
| `quality.fmea.assistance` | `quality.fmea_assistance` | quality.capas, knowledge.search |
| `quality.root_cause.analysis` | `quality.root_cause_analysis` | quality.ncrs, quality.capas |
| `quality.control_plans.review` | `quality.control_plan_review` | quality.capas, knowledge.search |

### commercial (7)

| Capability key | Prompt task | Auto tools |
|---|---|---|
| `commercial.rfqs.assessment` | `commercial.rfq_assessment` | commercial.rfqs |
| `commercial.quotations.analysis` | `commercial.quotation_analysis` | commercial.quotations |
| `commercial.customers.history` | `commercial.customer_history` | commercial.rfqs, commercial.quotations, service.service_requests |
| `commercial.margins.analysis` | `commercial.margin_analysis` | commercial.quotations |
| `commercial.risk.assessment` | `commercial.risk_assessment` | commercial.rfqs, commercial.quotations |
| `commercial.delivery.feasibility` | `commercial.delivery_feasibility` | commercial.quotations, manufacturing.work_orders |
| `commercial.pipeline.summary` | `commercial.pipeline_summary` | commercial.rfqs, commercial.quotations |

### project (6)

| Capability key | Prompt task | Auto tools |
|---|---|---|
| `project.health.assessment` | `project.health_assessment` | project.projects |
| `project.milestones.prediction` | `project.milestone_prediction` | project.projects |
| `project.delays.analysis` | `project.delay_analysis` | project.projects |
| `project.resources.planning` | `project.resource_planning` | project.projects, engineering.routings |
| `project.risks.identification` | `project.risk_identification` | project.projects, quality.ncrs |
| `project.similar.find` | `project.find_similar_projects` | project.projects |

### service (6)

| Capability | Prompt task | Auto tools |
|---|---|---|
| `service.history.review` | `service.customer_service_timeline` | service.service_requests |
| `service.warranty.analysis` | `service.warranty_summary` | service.service_requests |
| `service.failures.diagnosis` | `service.failure_pattern_summary` | service.service_requests, knowledge.search |
| `service.spare_parts.recommendation` | `service.recommended_spare_parts` | service.service_requests, knowledge.search |
| `service.maintenance.planning` | `service.maintenance_history` | service.service_requests |
| `service.breakdown.assistance` | `service.breakdown_assistance` | service.service_requests, knowledge.search |

### executive (7)

| Capability | Prompt | Auto tools |
|---|---|---|
| `executive.dashboard.briefing` | `executive.dashboard_briefing` | analytics.bi_query |
| `executive.kpi.explanation` | `executive.kpi_explanation` | analytics.bi_query |
| `executive.costs.trends` | `executive.cost_trends` | analytics.bi_query |
| `executive.revenue.overview` | `executive.revenue_overview` | analytics.bi_query |
| `executive.portfolio.health` | `executive.project_portfolio_summary` | analytics.bi_query, project.projects |
| `executive.risks.summary` | `executive.risk_summary` | analytics.bi_query, project.projects |
| `executive.briefing.management` | `executive.company_health_summary` | analytics.bi_query |

---

## Capability Resolution Order (verified in `enterprise-copilot.service.ts`)

1. Explicit `capability` key → capability exists.
2. Intent detection via `detectCapability` (intentPatterns).
3. Intent pattern → resolved if matched.
4. Deterministic default → first capability of the domain.

## Suggested Actions & Every Capability

Each capability declares `suggestedActions` and `followUpQuestions` returned
verbatim by `POST /api/ai/copilots/:domain/chat`; intended for UI chips only,
never auto-executed.

## Evidence

- Counts (15/8/7/7/6/6/7 = 56) and every prompt-key/tool mapping extracted
  verbatim from `copilot-capability.data.ts`.
- E2E explicitly drives `capability: project.health.assessment` and the
  response resolves exactly that key.