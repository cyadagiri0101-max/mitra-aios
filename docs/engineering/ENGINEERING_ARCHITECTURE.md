# Engineering Architecture — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Approved architecture baseline.
> **Related:** `docs/engineering/Engineering_Gap_Analysis.md`, `docs/engineering/ENGINEERING_DOMAIN_MODEL.md`, ADR-001, ADR-006, ADR-009, `PROJECT_CONSTITUTION.md`.

---

## 1. Architectural Context

MITRA is a **project-centric mold development lifecycle platform**. Per the Project Constitution:

> Domains communicate through the project lifecycle, not direct integration. The Project is the central aggregate. Every entity traces back to its originating project and engineering decisions. AI features consume engineering knowledge, explain recommendations, and require explicit human approval before affecting engineering data.

The Engineering domain is the **intellectual core** of MITRA: it produces the drawings, BOMs, process plans, and changes that manufacturing executes, quality verifies, and service maintains. This architecture defines the boundaries, layers, integration contracts, and evolution rules for that domain, and must accommodate — without architectural change — **Blow Molds (BM), Injection Molds (IM), Thin Wall Molds, Injection Blow Molds (IBM), Mold Bases, Fixtures, Standard Components, and Purchased Components**.

### 1.1 Guiding Rules (derived from the Constitution)

1. **Project-centric.** Every engineering aggregate carries `projectId` (NOT NULL, indexed). No engineering entity exists outside a project context (reference data — materials, components, work centers, standard catalogs — is project-scoped master data with `tenantId` isolation, consumed by projects).
2. **Traceability by design.** Drawings → revisions → BOMs → process plans → changes form a navigable graph; downstream domains (manufacturing, quality, service) link to engineering artifact IDs, not strings.
3. **No duplication.** The engineering module is the single source of truth for drawings, BOMs, routings, materials, components, reviews, and engineering documents. Legacy modules (design, mold, bom-analysis, folder-intelligence, generic ECR CRUD) are consolidated or deprecated per the Gap Analysis.
4. **Workflow-driven state.** Every stateful engineering object is governed by DB-driven workflows (`workflow_states`/`workflow_transitions`/`workflow_instances`). Code never mutates lifecycle `status` directly — only via guarded transitions (ADR-001/006).
5. **Event-driven AI readiness.** All AI integrations are optional, event-driven, and require human approval before affecting engineering data.
6. **Tenant isolation, RBAC, audit by default.** Inherited from `IndustrialBaseEntity` + global guards + audit interceptor.

---

## 2. Bounded Context Boundary

```
┌────────────────────────────────────────────────────────────────────┐
│                        ENGINEERING CONTEXT                        │
│                                                                    │
│  Drawing  ◄─── revision/check-in-out/compare/approve/release/      │
│  BOM      ◄─── multi-level/effective-date/alternates/cost/revision │
│  Routing  ◄─── operations/work centers/costing                     │
│  Change   ◄─── ECR → ECO → ECN with impact & approval matrix       │
│  Component/Material/StandardPart  (reference data)                 │
│  Review   (peer/lead/design-rule/customer gates)                   │
│  Document (engineering-controlled documents)                       │
│                                                                    │
│  Shared: WorkflowEngine, Audit, EventBus(+outbox), MinIO, RBAC     │
└────────────────────────────────────────────────────────────────────┘
        ▲ projectId links (Project domain = central aggregate)
        │ artifact links (drawing_id/bom_id/routing_id)
┌───────┴─────────┬──────────────┬──────────────┬──────────────┐
│ Commercial      │ Manufacturing│ Quality      │ Service      │
│ (RFQ→Quotation) │ (MO, Machine)│ (Inspection, │ (Dispatch,   │
│                 │              │ Trial, CAPA) │ Service)     │
└─────────────────┴──────────────┴──────────────┴──────────────┘
        │ optional, event-driven
┌───────▼──────────────────────────────────────────────────────────┐
│ Knowledge Context: knowledge_embeddings, knowledge articles,      │
│ engineering-library (EKL), future Knowledge Graph                 │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 In scope (this bounded context)

| Sub-domain | Aggregate(s) |
|---|---|
| Drawings | Drawing (+ DrawingRevision) |
| BOMs | BOM (+ BOMItem, BOMRevision) |
| Materials | Material |
| Components | Component (+ ComponentAlternate) |
| Standard parts | StandardPart (catalog specialization of Component) |
| Process planning | ProcessPlan/Routing (+ Operation, WorkCenter) |
| Change management | EngineeringChange (ECR → ECO → ECN) |
| Reviews | EngineeringReview (+ ReviewComment) |
| Documents | EngineeringDocument (+ DocumentVersion) |
| Tooling | Tooling registry (unification target; anchor = `tool_master`, extension = `mold_structures`) |

### 2.2 Out of scope (do not build here)

- Project management (milestones/tasks/teams/risks) — Project domain, Sprint 2.2.
- Commercial pipeline (customers/RFQ/quotations) — Commercial domain.
- Manufacturing execution (work orders/job cards/machine booking) — Manufacturing domain (Sprint 2.4); receives artifact links.
- Quality (inspection/trials/CAPA/CPS) — Quality domain (Sprint 2.5); consumes artifact links.
- Service (dispatch/installation/maintenance) — Service domain.
- Knowledge graphs, embeddings pipeline, AI model serving — Knowledge/AI contexts (Sprint 2.6+); MITRA consumes them only through the hook/outbox contract.

---

## 3. Layer Architecture

Each module inside `src/modules/engineering/**` follows the repository's established convention:

```
controllers/     HTTP surface — guards, @Permissions, DTO validation, response shaping
dto/             class-validator DTOs (whitelisted, forbidNonWhitelisted)
services/        application services — transactions, orchestration, numbering, events
entities/        TypeORM entities extending IndustrialBaseEntity
events/          domain event types + AI hook codes
constants/       role/permission constants
tests            *.spec.ts beside services; e2e in mitra-backend/test/
```

Rules:

- **Controllers never contain business logic.** They map DTO → service → response.
- **Services own transactions.** `DataSource.transaction` for multi-entity operations; workflow transitions, audit, and event publication follow the ADR-001/006 pattern (audit inside the tx, events after commit).
- **Cross-module reads only through dedicated query services** (`EngineeringTraceabilityService`); never raw entity access from unrelated modules.
- **No TypeORM relations across bounded contexts** — cross-context links are UUID columns + indexes (existing convention), enforced by service invariants and the traceability integrity checks.
- **Optimistic locking** for mutable concurrent state (workflow instances already `@VersionColumn`); 409 via global filter.

### 3.1 Module layout (target state after Sprint 2.3.x consolidation)

```
src/modules/
  engineering/          ← authoritative engineering domain (existing, extended)
    drawing/            (drawings, revisions, check-in/out, diff, attachments)
    bom/                (boms, items, revisions, alternates, effective dates, cost)
    process-planning/   (routings, operations, work centers, routing revisions)
    materials/          (material master)
    components/         (component master + alternates + standard catalogs)
    reviews/            (review requests, comments, multi-reviewer)
    documents/          (engineering documents + versions + workflow linkage)
    changes/            (ECR/ECO/ECN lifecycle — consolidated from ecr-eco)
    tooling/            (tool registry unification facade over tool_master)
    traceability/       (query-only traceability services)
    workflow/           (drawing/bom/routing/change workflow adapters)
    ai-hooks/           (hook registry + outbox consumer interface)
```

> Note: this is the **logical** layout. Sprint 2.3.x executes it as in-place refactoring of the existing `engineering` module (directory splits) — no data or API changes to existing tables/endpoints during the foundation sprint.

---

## 4. Cross-Cutting Architecture

### 4.1 Tenancy & RBAC

- All engineering tables inherit `IndustrialBaseEntity` (`tenant_id`, soft delete, audit stamps).
- Read/write role split: `ENGINEERING_READ_ROLES`, `ENGINEERING_WRITE_ROLES`; deletes restricted to ADMIN/MANAGEMENT (existing constants).
- Permission model: `engineering:{resource}:{action}` — 56 permissions seeded (migration 0017), granted to both role systems. New resources (e.g., `engineering:routing:revision`, `engineering:standardpart:*`) follow the same seed pattern.
- `PermissionsGuard` uses AND semantics for multiple permissions; workflow transition guards use OR (`some`) — documented behavioral contract, do not "fix" without ADR.

### 4.2 Workflow

- **One engine, many graphs.** `WorkflowService` (generic) + domain adapters (`EngineeringWorkflowService`, change workflow) executing DB-driven transitions with role/permission/approval gates.
- **Seeded graphs** (already in migration 0017 / seed.ts): `engineering_drawing`, `engineering_bom`, `engineering_routing`, `engineering_change`. The Drawing, BOM, and Change architecture docs (deliverables 5–7) treat these graphs as canonical; any graph change is a new migration + seed upsert (fixed UUIDs win).
- **Approval matrix as data** (Gap G-12): Sprint 2.3.3 introduces `engineering_approval_policies` (artifact type × transition × required approvals), evaluated by the workflow adapter before executing transitions flagged `requiresApproval`. Until then, `approvalRoles` on transitions remains the mechanism.

### 4.3 Events & AI readiness

- **In-process buses** (`EngineeringEventBus`, project `DomainEventBus`) remain the immediate delivery mechanism.
- **Transactional outbox** (Gap G-13, Sprint 2.3.1): new `domain_outbox` table; services write events in the same transaction as the business change; a relay publishes to the in-process bus and, when configured, to Redis/NATS subscribers. Subscribers are optional and isolated (existing bus contract preserved: `EngineeringDomainEvent`, dedupe, error isolation).
- **AI hooks** remain a registry (`engineering_ai_hooks`, all disabled) — no inference in this sprint. Contract: any AI capability subscribes to outbox events, computes, and produces **recommendation envelopes** requiring explicit user approval before writing engineering data (Constitution principle 7).
- Events defined: 22 typed `EngineeringDomainEventType` values (drawing/bom/routing/change/review/document) + `ENGINEERING_AI_HOOKS` codes (8).

### 4.4 Storage

- Engineering binary content (drawing files, document files, review markups) → **MinIO** via `MinioService` (bucket `mitra-design` for drawings/CAD; `mitra-documents` for engineering documents). Tables store `minio_bucket` + `minio_key` + `checksum_sha256` (existing pattern used by project documents, design files).
- Gap G-6: engineering drawing revisions and document versions currently carry `filePath` strings — Sprint 2.3.2 migrates to bucket/key + checksum, keeping `filePath` as a display-only legacy field.

### 4.5 Numbering

Central numbering rules (existing implementations to be extracted into a shared `EngineeringNumberingService` for consistency):

| Aggregate | Pattern | Retry |
|---|---|---|
| Drawing | `DRW-YYYY-####` | unique-constraint retry ×5 |
| BOM | `BOM-YYYY-####` | unique-constraint retry ×5 |
| Routing | `RTG-YYYY-####` | unique-constraint retry ×5 |
| Review | `RVR-YYYY-####` | unique-constraint retry ×5 |
| ECR / ECO / ECN | `ECR-YYYY-####` / `ECO-YYYY-####` / `ECN-YYYY-####` | unique-constraint retry ×5 |

---

## 5. Integration Contracts with Other Domains

### 5.1 Project domain (central aggregate)

- `projects.projectId` is the mandatory root link for: drawings, BOMs, routings, reviews, documents, ECR/ECO/ECN.
- Engineering creation is **allowed for projects in any active project state** (`DESIGN_INITIATED` onward); the workflow graph itself gates engineering release relative to project stage via `mold_project` transitions (e.g., `DESIGN_RELEASED`).
- No engineering service may create/modify projects; `ProjectService`/`ProjectWorkflowService` own that context.

### 5.2 Manufacturing domain (receives artifact links — Sprint 2.3.1, Gap G-1)

Target columns (added by migration 0018 in Sprint 2.3.1):

| Table | Added links | Semantics |
|---|---|---|
| `work_orders` | `drawing_id`, `bom_id`, `bom_item_id`, `routing_id`, `process_plan_id` | MO manufactured against released drawing/BOM/routing |
| `job_cards` | `routing_operation_id` | Job card ↔ `engineering_operations.id` |
| `machine_bookings` | (optional) `drawing_id` | capacity bookings traced to design intent |

Invariant: `work_orders.drawing_id` must reference a **RELEASED** drawing revision's drawing; `bom_item_id` must reference a RELEASED BOM's item. Enforced in the MO creation service.

### 5.3 Quality domain (receives artifact links — Sprint 2.3.1, Gap G-1)

| Table | Added links |
|---|---|
| `trial_observations` | `part_id`, `drawing_id`, `routing_id`, `work_order_id` |
| `inspection_reports` | `part_id`, `drawing_id`, `bom_item_id` |
| `retrials` | `drawing_id` (change context), `routing_id` |
| `capa_verifications` | `change_id` (optional: CAPA linked to ECR) |

### 5.4 Service domain (Sprint 2.3.2)

- `service_reports.parts_replaced` jsonb stays, but gains optional `drawing_id`/`component_id` typed entries; spare parts link to `engineering_components` (type STANDARD).

### 5.5 Commercial domain

- Quotation/RFQ acceptance creates the Project (existing `ProjectFactoryService`). Engineering reads commercial context only through `quotations.project_id` — no direct coupling.

### 5.6 Knowledge / AI context

- Contract: **read-only consumption**. Knowledge context indexes engineering artifacts (drawings, BOMs, materials, changes, documents) via outbox events and produces recommendations through the hook contract. It never writes to engineering tables; approval APIs live in the engineering context.
- `knowledge_embeddings.entity_type` enum extended with `drawing`, `bom`, `material`, `engineering_document`, `change` in Sprint 2.3.3 (embedding pipeline itself remains a later sprint).

---

## 6. ERP/MES Integration Readiness (target, not this sprint)

Prepared seams, no implementation:

- **Part number mapping** — `engineering_components` gains `externalCodes` jsonb (`{erpPartNo, mesPartNo, customerPartNo}`) in Sprint 2.4 migration; BOM items inherit via component link.
- **Unit conversion service** — shared `UnitConversionService` (Gap G-8) over a `uom_conversions` table (base uom, factor, valid range); BOM item rows already carry `baseUom`/`conversionFactor`.
- **Exchange envelope** — `engineering_exchange_headers` (entity type, direction, payload ref, status, external id) in Sprint 2.4; both EDI/flat-file and JSON variants.
- Nothing in the engineering data model prevents ERP/MES sync: all aggregates have stable UUIDs + business numbers, revision snapshots, effective dates, and audit trails.

---

## 7. Security & Audit Baseline

- Global `AuditInterceptor` records all mutating requests; engineering business events call `AuditService.logBusinessEvent` inside transactions (eventType BUSINESS).
- Check-in/check-out conflicts → `ConflictException`; cross-tenant access → 404 (IDOR-safe `TenantAwareService` pattern).
- Uploads: MinIO extension whitelist, 50 MB cap, MIME/extension match, magic-number checks (existing `MinioService.validateUpload`).
- No secrets in engineering code; config via env with production guards in `main.ts`.

---

## 8. Evolution Rules (how future domains build on this foundation)

1. **New artifact types** (e.g., CAM programs, simulation results) extend `EngineeringDocument`/drawing `DrawingType` or add a new aggregate under the same conventions — never a parallel "engineering" module.
2. **New mold families** (Thin Wall, IBM, Mold Base, Fixtures) are **data taxonomies**, not code changes: `DrawingType`, BOM `itemType`, tooling registry `toolType` values are extended in migration seeds; workflows unchanged.
3. **Standard components** (HASCO/DME/Meusburger catalogs) are `EngineeringComponent` rows (type STANDARD) plus `engineering_standard_catalogs` (supplier catalog metadata) — Gap G-9, Sprint 2.3.2.
4. **Purchased components** flow through BOM items with `sourceType=BUY` and component alternates for substitution.
5. **Any new workflow** = new seeded graph + adapter service + permission seeds; engine code untouched.
6. **Any new AI capability** = new hook row (disabled by default) + optional outbox subscriber; no changes to core services.
7. **Any new cross-domain link** = FK-style UUID column + index + migration + traceability integrity check; no direct module-to-module service calls (Constitution principle 8).

---

## 9. Sprint 2.3.1 Implementation Roadmap (approved scope)

| # | Work item | Gap | Deliverable |
|---|---|---|---|
| 1 | Migration 0018: artifact-level traceability links (work orders, trials, inspections, retrials) + integrity checks | G-1 | ENGINEERING_TRACEABILITY.md |
| 2 | BOM effective-date activation & point-in-time selection service | G-2 | BOM_ARCHITECTURE.md |
| 3 | BOM item substitute/alternate selection (swap with history + effective dates) | G-3 | BOM_ARCHITECTURE.md |
| 4 | Routing revisions (snapshot table) + operation predecessor sequencing | G-4 | ENGINEERING_DOMAIN_MODEL.md |
| 5 | Multi-reviewer review engine (assignees, individual decisions, aggregation policy) | G-5 | ENGINEERING_DOMAIN_MODEL.md |
| 6 | Transactional outbox (`domain_outbox`) + relay for engineering events | G-13 | ENGINEERING_ARCHITECTURE.md §4.3 |
| 7 | Unit conversion service + `uom_conversions` seed | G-8 | BOM_ARCHITECTURE.md |
| 8 | API implementation per ENGINEERING_API_SPECIFICATION.md (new endpoints) | — | ENGINEERING_API_SPECIFICATION.md |
| 9 | Test suite per ENGINEERING_TEST_STRATEGY.md (engineering coverage ≥ 95%) | — | ENGINEERING_TEST_STRATEGY.md |
| 10 | Release: migration, seeds, release notes | — | docs/reports/ |

**Definition of done for 2.3.1:** all G-1..G-5, G-8, G-13 closed; engineering module coverage ≥ 95%; `tsc --noEmit` clean; full suite green; API docs regenerated.

---

## 10. Architecture Decisions Referenced

- ADR-001 Transactional Workflow Consistency
- ADR-006 Workflow Transaction Architecture
- ADR-009 Project Management Domain (project-centric integration pattern)
- **ADR-010 Engineering Domain Foundation (this sprint)** — documents decisions (a)–(d) below
- This sprint's decisions: (a) engineering stays one bounded context with logical sub-domains; (b) traceability gaps closed by FK-style links, not a new graph DB; (c) AI remains event-driven/optional; (d) legacy duplicates consolidated, not re-built.
