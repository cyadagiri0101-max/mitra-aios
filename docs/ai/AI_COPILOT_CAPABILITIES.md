# AI Copilot Capability Matrix — Sprint 2.8.3

56 capabilities across 7 copilots, all mapped to Prompt Registry tasks and
auto-attached tools. Capability keys are intent-detectable; chat requests may
also pin a capability explicitly.

## Engineering Copilot (15)

| Capability key | Title | Prompt task | Auto tools |
|---|---|---|---|
| engineering.drawings.explain | Explain a drawing | engineering.explain_drawing | engineering.drawings |
| engineering.drawings.revision_compare | Compare revisions | engineering.compare_revisions | engineering.drawings |
| engineering.drawings.manufacturing_impact | Manufacturing impact of a change | engineering.manufacturing_impact | engineering.drawings, engineering.routings, manufacturing.work_orders |
| engineering.drawings.similar | Find similar drawings | engineering.find_similar_drawings | engineering.drawings |
| engineering.bom.explain | Explain a BOM | engineering.explain_bom | engineering.boms |
| engineering.bom.gap_analysis | BOM gap analysis | engineering.bom_gap_analysis | engineering.boms, engineering.drawings |
| engineering.bom.cost_analysis | BOM cost analysis | engineering.bom_cost_analysis | engineering.boms, engineering.routings |
| engineering.bom.alternate_materials | Alternate materials | engineering.alternate_materials | engineering.boms, knowledge.search |
| engineering.routing.explain | Explain a process plan / routing | engineering.summarize_process_plans | engineering.routings |
| engineering.routing.cycle_time | Cycle-time analysis | engineering.cycle_time_analysis | engineering.routings, manufacturing.work_orders |
| engineering.routing.optimization | Operation optimization | engineering.operation_optimization | engineering.routings, manufacturing.work_orders |
| engineering.routing.machine_selection | Machine selection advice | engineering.machine_selection | engineering.routings, knowledge.search |
| engineering.review.design_review | Engineering design review | engineering.design_review | engineering.drawings, engineering.boms |
| engineering.review.dfm | DFM recommendations | engineering.dfm_recommendations | engineering.drawings, engineering.routings |
| engineering.review.risk | Engineering risk identification | engineering.risk_identification | engineering.drawings, engineering.boms, quality.ncrs |

## Manufacturing Copilot (8)

| Capability key | Title | Prompt task | Auto tools |
|---|---|---|---|
| manufacturing.work_orders.status | Work order status | manufacturing.production_summary | manufacturing.work_orders |
| manufacturing.machines.utilization | Machine utilization | manufacturing.machine_utilization | manufacturing.work_orders |
| manufacturing.delays.analysis | Production delay analysis | manufacturing.delay_analysis | manufacturing.work_orders |
| manufacturing.scrap.explain | Scrap analysis | manufacturing.explain_scrap | manufacturing.work_orders, quality.ncrs |
| manufacturing.downtime.analysis | Downtime analysis | manufacturing.downtime_analysis | manufacturing.work_orders |
| manufacturing.oee.calculation | OEE analysis | manufacturing.oee_analysis | manufacturing.work_orders |
| manufacturing.schedule.recommendations | Scheduling recommendations | manufacturing.schedule_recommendation | manufacturing.work_orders, engineering.routings |
| manufacturing.capacity.assessment | Capacity assessment | manufacturing.capacity_assessment | manufacturing.work_orders, engineering.routings |

## Quality Copilot (7)

| Capability key | Title | Prompt task | Auto tools |
|---|---|---|---|
| quality.ncrs.explain | NCR assistance | quality.ncr_explanation | quality.ncrs |
| quality.capas.summary | CAPA summary | quality.capa_summary | quality.capas |
| quality.inspections.summary | Inspection summary | quality.inspection_summary | quality.ncrs |
| quality.ppap.readiness | PPAP/APQP readiness | quality.ppap_checklist_guidance | quality.capas, engineering.drawings |
| quality.fmea.assistance | FMEA assistance | quality.fmea_assistance | quality.capas, knowledge.search |
| quality.root_cause.analysis | Root cause analysis | quality.root_cause_analysis | quality.ncrs, quality.capas |
| quality.control_plans.review | Control plan review | quality.control_plan_review | quality.capas, knowledge.search |

## Commercial Copilot (7)

| Capability key | Title | Prompt task | Auto tools |
|---|---|---|---|
| commercial.rfqs.assessment | RFQ assessment | commercial.rfq_assessment | commercial.rfqs |
| commercial.quotations.analysis | Quotation analysis | commercial.quotation_analysis | commercial.quotations |
| commercial.customers.history | Customer history | commercial.customer_history | commercial.rfqs, commercial.quotations, service.service_requests |
| commercial.margins.analysis | Margin analysis | commercial.margin_analysis | commercial.quotations |
| commercial.risk.assessment | Commercial risk assessment | commercial.risk_assessment | commercial.rfqs, commercial.quotations |
| commercial.delivery.feasibility | Delivery feasibility | commercial.delivery_feasibility | commercial.quotations, manufacturing.work_orders |
| commercial.pipeline.summary | Commercial pipeline summary | commercial.pipeline_summary | commercial.rfqs, commercial.quotations |

## Project Copilot (6)

| Capability key | Title | Prompt task | Auto tools |
|---|---|---|---|
| project.health.assessment | Project health assessment | project.health_assessment | project.projects |
| project.milestones.prediction | Milestone prediction | project.milestone_prediction | project.projects |
| project.delays.analysis | Project delay analysis | project.delay_analysis | project.projects |
| project.resources.planning | Resource planning | project.resource_planning | project.projects, engineering.routings |
| project.risks.identification | Project risk identification | project.risk_identification | project.projects, quality.ncrs |
| project.similar.find | Find similar projects | project.find_similar_projects | project.projects |

## Service Copilot (6)

| Capability key | Title | Prompt task | Auto tools |
|---|---|---|---|
| service.history.review | Service history review | service.customer_service_timeline | service.service_requests |
| service.warranty.analysis | Warranty analysis | service.warranty_summary | service.service_requests |
| service.failures.diagnosis | Failure diagnosis | service.failure_pattern_summary | service.service_requests, knowledge.search |
| service.spare_parts.recommendation | Spare part recommendation | service.recommended_spare_parts | service.service_requests, knowledge.search |
| service.maintenance.planning | Maintenance planning | service.maintenance_history | service.service_requests |
| service.breakdown.assistance | Breakdown assistance | service.breakdown_assistance | service.service_requests, knowledge.search |

## Executive Copilot (7)

| Capability key | Title | Prompt task | Auto tools |
|---|---|---|---|
| executive.dashboard.briefing | Dashboard briefing | executive.dashboard_briefing | analytics.bi_query |
| executive.kpi.explanation | KPI explanation | executive.kpi_explanation | analytics.bi_query |
| executive.costs.trends | Cost trends | executive.cost_trends | analytics.bi_query |
| executive.revenue.overview | Revenue overview | executive.revenue_overview | analytics.bi_query |
| executive.portfolio.health | Portfolio health | executive.project_portfolio_summary | analytics.bi_query, project.projects |
| executive.risks.summary | Enterprise risk summary | executive.risk_summary | analytics.bi_query, project.projects |
| executive.briefing.management | Management briefing | executive.company_health_summary | analytics.bi_query |

## Prompt Registry Delta (2.8.2 → 2.8.3)

30 → **61 published templates** (31 new). All new prompts follow the shared
seed template format and seed idempotently at boot; no migration required.
