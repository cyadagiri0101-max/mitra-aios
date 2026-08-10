# MITRA v4.0 — AI Prompt Catalog

**Sprint 2.8.3 · Verified repository behavior**

Source of truth: `src/modules/ai/services/prompt-seed.data.ts`
(verified: **61 prompt templates**, seeded idempotently at startup by
`PromptRegistryService` — no migration required).

Per-domain distribution (extracted verbatim):

| Domain | Templates |
|---|---|
| engineering | 15 |
| manufacturing | 11 |
| quality | 8 |
| commercial | 7 |
| project | 6 |
| service | 6 |
| executive | 8 |
| **Total** | **61** |

---

## Complete Template Key List

### engineering (15)

```
engineering.explain_drawing
engineering.explain_bom
engineering.compare_revisions
engineering.find_similar_drawings
engineering.summarize_process_plans
engineering.manufacturing_impact
engineering.bom_gap_analysis
engineering.bom_cost_analysis
engineering.alternate_materials
engineering.cycle_time_analysis
engineering.operation_optimization
engineering.machine_selection
engineering.design_review
engineering.dfm_recommendations
engineering.risk_identification
```

### manufacturing (11)

```
manufacturing.production_summary
manufacturing.downtime_analysis
manufacturing.machine_utilization
manufacturing.material_variance
manufacturing.explain_scrap
manufacturing.explain_rework
manufacturing.cycle_time_review
manufacturing.delay_analysis
manufacturing.oee_analysis
manufacturing.schedule_recommendation
manufacturing.capacity_assessment
```

### quality (8)

```
quality.inspection_summary
quality.ncr_explanation
quality.capa_summary
quality.fmea_assistance
quality.ppap_checklist_guidance
quality.supplier_quality_summary
quality.root_cause_analysis
quality.control_plan_review
```

### commercial (7)

```
commercial.pipeline_summary
commercial.rfq_assessment
commercial.quotation_analysis
commercial.customer_history
commercial.margin_analysis
commercial.risk_assessment
commercial.delivery_feasibility
```

### project (6)

```
project.find_similar_projects
project.health_assessment
project.milestone_prediction
project.delay_analysis
project.resource_planning
project.risk_identification
```

### service (6)

```
service.warranty_summary
service.failure_pattern_summary
service.recommended_spare_parts
service.maintenance_history
service.customer_service_timeline
service.breakdown_assistance
```

### executive (8)

```
executive.company_health_summary
executive.project_portfolio_summary
executive.revenue_overview
executive.quality_trends
executive.risk_summary
executive.dashboard_briefing
executive.kpi_explanation
executive.cost_trends
```

---

## Template Registry (verified in `prompt-registry.service.ts`)

| Feature | Verified behavior |
|---|---|
| Seeding | Idempotent on startup; `PROMPT_SEED_DEFINITIONS` |
| Lifecycle | DRAFT → PUBLISHED → ARCHIVED |
| Locality | Templates resolved preferring the requested locale |
| Versioning | Versioned keys (e.g. `v1`, `v2`) |
| Variables | `PROMPT_SEED_VARIABLES` (e.g. `{{message}}`) |
| Degradation | In-memory seed definitions when DB is unreachable |
| Conflict handling | Duplicate key / short template rejected with `ConflictException` |

## Execution Path

`POST /api/ai/platform/chat` (and copilot chat) → task key → `findTemplate` →
published template resolved → rendered with context → sent to model router.

## Evidence

- Key counts verified verbatim from `prompt-seed.data.ts`.
- E2E asserts the prompt catalogue endpoint lists the seeded entries.
- Unit spec `prompt-registry.service.spec.ts` covers create, resolve,
  localized versions, publishing lifecycle, conflicts.