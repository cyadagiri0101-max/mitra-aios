# Engineering Gap Analysis

> **Sprint:** 2.3.0 — Engineering Domain Foundation
> **Author:** MITRA Architecture Team
> **Status:** Baseline for ENGINEERING_ARCHITECTURE.md
> **Scope:** Repository inspection of `mitra-backend` (NestJS v11 / TypeORM 0.3 / PostgreSQL) and `mitra-frontend` (React + Vite), focused on existing Engineering capability, duplication, and integration readiness.

---

## 1. Purpose

This document records the inspection result of the MITRA repository before the Engineering Domain Foundation is finalized. It identifies:

- Existing Engineering entities, services, and API surfaces.
- Existing BOM, Drawing, Document, Workflow, AI-hook, and Knowledge implementations.
- Duplicate functionality across modules that must be consolidated or deprecated — not re-built.
- Gaps the foundation must close without re-implementing what already works.

The inspection is the source of truth for the remaining deliverables in this sprint.

---

## 2. Inspection Method

| Area | Evidence |
|---|---|
| Engineering module | `mitra-backend/src/modules/engineering/**` (16 entities, 12 services, 11 controllers, 3 spec suites) |
| Change management | `mitra-backend/src/modules/ecr-eco/**` (6 entities, 2 services, 2 controllers) |
| Legacy design | `mitra-backend/src/modules/design/**` (6 entities, 1 wired service) |
| Analysis shells | `bom-analysis`, `drawing-analysis` |
| Mold / tooling | `mold` (5 entities), `tool-master` (1 entity + importers), `engineering-file-indexer`, `folder-intelligence` |
| Reviews / CPS | `cps` (5 entities), engineering review entities |
| Workflow engine | `modules/workflow` (3 entities), seed data in `src/database/seed.ts`, migrations 0015–0017 |
| Cross-domain | `commercial`, `project`, `manufacturing`, `quality`, `dispatch`, `service`, `machine`, `planning`, `knowledge`, `ai`, `search`, `collaboration`, `document`, `storage`, `platform`, `audit`, `supplier`, `product`, `customer` |
| Schema | Migrations `1700000000000` … `1700000000017`; `DB_SCHEMAS.md`, `DATABASE_ARCHITECTURE.md` |
| Specs | `BOM_SPEC.md`, `DOMAIN_MODEL.md`, `TRACEABILITY_MODEL.md`, `WORKFLOW_ENGINE.md`, `EVENT_CATALOG.md`, `API_CONTRACTS.md`, `API_STANDARDS.md`, `MODULE_SPECIFICATIONS.md`, `PROJECT_CONSTITUTION.md` |

---

## 3. What Already Exists (Working, Do Not Duplicate)

### 3.1 Engineering module (`engineering`) — the authoritative domain core

**Entities (tables `engineering_*`):**

| Entity | Table | Key capabilities |
|---|---|---|
| EngineeringDrawing | `engineering_drawings` | Type (PART/ASSEMBLY/MOLD_BASE/CAVITY/CORE/FIXTURE/ELECTRODE/LAYOUT/STANDARD/OTHER), CAD file metadata, dimensions, check-out/check-in fields, approval stamps, `workflowInstanceId`, `status` |
| EngineeringDrawingRevision | `engineering_drawing_revisions` | Append-only revision rows (letter + version number), checksum, change summary, release stamps |
| EngineeringBom | `engineering_boms` | `bomNumber` auto `BOM-YYYY-####`, `effectiveFrom/To`, `isCurrent`, `totalCost`, currency, workflow instance |
| EngineeringBomRevision | `engineering_bom_revisions` | Immutable JSON snapshot of BOM + items, cost, change summary |
| EngineeringBomItem | `engineering_bom_items` | Multi-level via `parentItemId`, item types incl. STANDARD_COMPONENT/PURCHASED_COMPONENT/SUBSTITUTE/ALTERNATE/TOOLING, MAKE/BUY/SUB_CONTRACT, qty/uom/baseUom/conversionFactor, unit/extended cost, supplier link, drawing/material/component links |
| EngineeringComponent | `engineering_components` | STANDARD/PURCHASED/MANUFACTURED, vendor mapping, drawing refs, spec |
| EngineeringComponentAlternate | `engineering_component_alternates` | SUBSTITUTE / ALTERNATE relations |
| EngineeringMaterial | `engineering_materials` | Category/grade/standard, density, mechanical/thermal JSONB properties, suppliers, MOQ, lead time |
| EngineeringRouting | `engineering_routings` | `routingNumber` auto `RTG-YYYY-####`, totals, workflow instance |
| EngineeringOperation | `engineering_operations` | Sequence 10/20/30, setup/cycle/standard time, cost/hour, tool & material requirements, quality checkpoints, machine link |
| EngineeringWorkCenter | `engineering_work_centers` | MACHINING/EDM/GRINDING/ASSEMBLY/INSPECTION/HEAT_TREATMENT/…, cost/hour, capacity |
| EngineeringDocument | `engineering_documents` | CAD/PDF/SPECIFICATION/STANDARD/CALCULATION/…, versioned, released stamps |
| EngineeringDocumentVersion | `engineering_document_versions` | Append-only versions, checksum |
| EngineeringReviewRequest | `engineering_review_requests` | Polymorphic target (DRAWING/BOM/ROUTING/CHANGE/DOCUMENT), peer/lead/design-rule/customer review, decision, markups, attachments |
| EngineeringReviewComment | `engineering_review_comments` | Body + markup JSONB, resolution tracking |
| EngineeringAiHook | `engineering_ai_hooks` | 8 seeded hooks (disabled), registry + dispatch counters |

**Services (all tenant-aware, audited, event-publishing):**

| Service | Capabilities that exist today |
|---|---|
| `EngineeringBomService` | CRUD, multi-level tree, cost roll-up, revision snapshots, revision compare, clone, CSV import/export, RELEASED write-guards |
| `EngineeringDrawingService` | CRUD, revision list, check-in (ownership enforced), check-out, cancel check-out, metadata compare, latest revision |
| `EngineeringProcessPlanningService` | Work centers CRUD, routings CRUD, operations CRUD, cost recompute, totals |
| `EngineeringReviewService` | Review requests, single-reviewer decisions, comments/markups |
| `EngineeringTraceabilityService` | Project-level aggregation (raw SQL across manufacturing/quality), entity-level upstream/downstream |
| `EngineeringWorkflowService` | DB-driven transition for drawing/bom/routing; mirrors `status`; releases stamps; post-commit events |
| `EngineeringChangeService` (in ecr-eco) | ECR/ECO/ECN lifecycle, DB-driven change workflow, impact analysis, audit, events |
| `EngineeringAiHooksService` | Hook registry, dispatch with counters (no inference) |
| `EngineeringEventBus` | In-process typed event bus, dedupe, isolated subscriber errors |
| `EngineeringDashboardService` | Stats/KPIs/pending reviews |
| `EngineeringComponentService` / `EngineeringMaterialService` / `EngineeringDocumentService` | CRUD + alternates; bulk findByIds for BOM lines |

**API surface (11 controllers):** `engineering/drawings`, `engineering/boms`, `engineering/materials`, `engineering/components`, `engineering/reviews`, `engineering/documents`, `engineering/work-centers`, `engineering/routings`, `engineering/workflow`, `engineering/traceability`, `engineering/dashboard`, `engineering/ai-hooks`, `engineering-changes/*`.

### 3.2 Workflow engine (working, reusable as-is)

- `workflow_states` / `workflow_transitions` / `workflow_instances` with role, permission, and approval gates (`requiresApproval`, `approvalRoles`), `@VersionColumn` optimistic locking, JSONB history.
- Seeded graphs: `mold_project` (17 stages), `rfq`, `project_management`, `engineering_drawing` (7 states incl. OBSOLETE), `engineering_bom` (5 states), `engineering_routing` (4 states), `engineering_change` (7 states).
- `EngineeringWorkflowService`/`ProjectWorkflowService` pattern: transactional transition → entity status mirror → audit → post-commit event. **This is the pattern every new Engineering workflow must follow.**

### 3.3 Change management (working)

ECR → ECO → ECN with impact entities (`engineering_change_impacts`, `ecr_affected_parts`, `eco_implementations`), transactional `engineering_change` workflow, approval gates, `CHANGE_REQUESTED/APPROVED/NOTICE_ISSUED` events.

### 3.4 Infrastructure

- `IndustrialBaseEntity` (uuid, created/updated/deleted, createdBy/updatedBy, tenantId), `TenantAwareService`, global `JwtAuthGuard`/`RolesGuard`/`PermissionsGuard`, `@AuditEvent`, global `AuditInterceptor`, `OptimisticLockFilter`, `SchemaIntegrityService`.
- MinIO storage service with extension whitelist, 50 MB cap, checksums, presigned URLs, buckets `mitra-documents`, `mitra-design`, `mitra-quality`, `mitra-customer`, `mitra-knowledge`.
- 56 seeded engineering permissions (`engineering:*`) granted to both role systems (upper + lower).
- `notification_queue` (write-only outbox for notifications), `audit_logs` with BUSINESS events.
- AI module with `knowledge_embeddings` (pgvector), Ollama provider, RAG search — generic entity embeddings.

---

## 4. Capability Coverage Matrix

Legend: ✅ exists & functional · 🟡 partial (gap noted) · ❌ missing

| Sprint 2.3.0 requirement | Status | Evidence / Gap |
|---|---|---|
| Revision history (drawings) | ✅ | `engineering_drawing_revisions`, check-in/out |
| Check-in / Check-out | ✅ | `checkIn/checkOut/cancelCheckOut`, ownership conflict |
| Version comparison (drawings) | 🟡 | Metadata-level compare only; no file-content diff |
| CAD metadata | 🟡 | Stored on drawing header; no extraction pipeline |
| Attachments | 🟡 | Review markups/attachments JSONB; drawings use file path fields, not MinIO keys |
| Approval workflow | ✅ | DB-driven `engineering_drawing` states + review gate |
| Release workflow | ✅ | `engineering:drawing:release` transition, `requiresApproval` |
| Obsolete workflow | ✅ | `RELEASED → OBSOLETE` transition seeded |
| Unlimited BOM levels | ✅ | `parentItemId` self-reference, tree API |
| Alternate parts | 🟡 | Component-level alternates exist; **no BOM-item-level alternate selection logic** |
| Substitute parts | 🟡 | `itemType=SUBSTITUTE/ALTERNATE` flags + component alternates; **no swap/selection operation** |
| Effective dates | 🟡 | Columns exist (`effectiveFrom/To`); **no date-window query/activation logic** |
| Cost roll-up | ✅ | `rollupCost` (leaf × qty, parent Σ, BOM total) |
| Unit conversion | 🟡 | Columns exist (`baseUom`, `conversionFactor`); **no shared conversion service** |
| BOM comparison | ✅ | `compareRevisions` (added/removed/changed) |
| BOM cloning | ✅ | `clone` (new number, item copies, re-link) |
| BOM revision history | ✅ | `engineering_bom_revisions` snapshots |
| ERP/MES integration prep | ❌ | No exchange contract, no external part-number mapping, no unit conversion API |
| ECR | ✅ | Full lifecycle + workflow + impacts |
| ECO | ✅ | Derived from ECR, implementation tasks schema exists |
| ECN | ✅ | Issued, effective date, notified-to JSONB |
| Impact analysis | 🟡 | Impact records exist; no automated affected-artifact discovery |
| Approval matrix | 🟡 | `approvalRoles` on transitions; no per-entity-type approval policy table |
| Linked drawings/BOMs/process plans/projects | 🟡 | FKs exist on ECR header; **not enforced/validated consistently** |
| Transactional workflows | ✅ | Single-transaction transitions (ADR-001/006) |
| Engineering project aggregate | ✅ | Reuse Project domain (`projectId`) — do NOT create a parallel project |
| Process plans | ✅ | `engineering_routings`/`engineering_operations`; **no revision table, predecessor links unused** |
| Standard parts | 🟡 | `EngineeringComponent` type STANDARD/PURCHASED exists; no supplier catalog model |
| Thin wall / IBM / mold bases / fixtures | 🟡 | Representable via `DrawingType`, BOM item types, tool registry; no dedicated taxonomies |
| AI extension points | 🟡 | Hook registry + event bus exist; **no outbox, no global bus, no embedding of engineering artifacts** |
| Engineering reviews | 🟡 | Single reviewer only; DTO declares `assignees[]` — engine must support multi-reviewer |
| Documents | 🟡 | Versioned but **no workflow/approval linkage** (`workflowInstanceId` absent) |

---

## 5. Duplicate Functionality Inventory

These MUST NOT be re-implemented in the foundation. Each is given a disposition:

| # | Duplicate | Overlaps | Disposition |
|---|---|---|---|
| D1 | `design` module (parts/revisions/files/boms/approvals/standards) | Engineering drawings, BOM, reviews | **Legacy.** `engineering_drawings.partId` is the documented integration point. Freeze; migrate read-only; deprecate in Sprint 2.4. `design_revisions.ecrNumber` string link → replace with FK to `engineering_change_requests`. |
| D2 | `bom-analysis` / `drawing-analysis` (simulated heuristics) | `engineering_boms`, `engineering_drawings` | **Keep as analysis snapshots.** Re-point inputs at engineering entities; they are projections, never the source of truth. |
| D3 | `mold` module (structures/assemblies/components/component_materials/specifications) | `tool_master`, `engineering_components`, `engineering_materials`, BOM items | **Consolidate.** `mold_structures` becomes the tooling registry extension anchored to `tool_master`; `component_materials` folds into `engineering_materials`; `mold_components` folds into BOMs/engineering components. |
| D4 | `tool-master` + external `pmm_data_library.db` (SQLite part lists) | `engineering_boms` cost data | **Keep tool registry** as the tooling anchor; **migrate part-list cost data into engineering BOMs**; keep PMM import as one-time importer only. |
| D5 | `folder-intelligence` scan jobs | `engineering-file-indexer` (`engineering_file_index`) | **Deprecate** generic scan-job pipeline (no runner). Single indexer is the file ingestion surface. |
| D6 | `cps` reviews/checklists/approvals | Engineering reviews + quality checklists | **Keep CPS as the quality-side trial gate** (Sprint 2.5), but define its relationship to `EngineeringReviewRequest` (CPS executes against released drawings). |
| D7 | `ecr` legacy controller (generic CRUD) vs `engineering-changes/ecr` (lifecycle) | ECR entities | **Deprecate** the generic `ecr` surface; lifecycle service is authoritative. |
| D8 | `document_versions` (generic) vs `engineering_documents` | Documents | **Distinct by intent**: generic document store vs engineering-controlled documents. Keep both; engineering documents gain workflow linkage. |
| D9 | `products` catalog | BOM items / components | Distinct (finished goods). Keep; add optional FK from BOM items later. |
| D10 | `tool-master-metadata.service.old.ts`, `importers/import-tool-master.ts`, `cps.dto.ApproveCPSDto` (unused) | — | **Delete** dead code. |
| D11 | Two RBAC role systems (upper/lower) | Roles | Governance issue, not engineering. Tracked in TECH_DEBT; engineering uses uppercase system with both grants (existing). |

---

## 6. Integration Gaps (Traceability)

The biggest structural gap: downstream domains reference **only `projectId` + string fields**, not engineering artifact IDs.

| Table | Current links | Missing links (foundation must add) |
|---|---|---|
| `work_orders` | `project_id`, `part_id`, `drawing_revision` (string) | `drawing_id`, `bom_id`, `bom_item_id`, `routing_id`, `process_plan_id` |
| `inspection_reports` | `project_id`, `work_order_id` | `part_id`, `drawing_id`, `bom_item_id` |
| `trial_observations` | `project_id` | `part_id`, `drawing_id`, `routing_id`, `work_order_id` |
| `dispatch_plans` | `project_id` | `customer_id`, `packing_list` typed against BOM items |
| `service_requests` / `service_reports` | `mold_id`/`mold_number`, `project_id` | typed `drawing_id`/`part_id` in `parts_replaced` |
| `process_plans` (planning) | `project_id`, `part_id` | `drawing_id`, `bom_id`, and eventual consolidation with `engineering_routings` |
| `machine_bookings` | `project_id`, `work_order_id` | `drawing_id` (optional) |
| `knowledge_embeddings` | polymorphic entity link | engineering entity types must be embeddable (entity_type enum extension) |
| `engineering_change_requests` | `drawing_id`, `bom_id`, `work_order_id`, `routing_id` | validate + enforce; add `part_id`, `material_id`, `component_id` |

**Consequence:** the traceability chain Customer → RFQ → Quotation → Project → Drawing → Revision → BOM → Process Plan → Manufacturing Order → Inspection → Trial → Dispatch → Service is **project-anchored but not artifact-linked** below Project. Sprint 2.3.1 implements the artifact-level links.

---

## 7. AI Readiness Status

| Requirement | Status | Gap |
|---|---|---|
| Hook registry (8 engineering hooks) | ✅ seeded, disabled | None |
| Event-driven dispatch | 🟡 | In-process bus only; no persistence (outbox), no retry, no dead-letter |
| Similar drawing search | ❌ | No embedding of drawing metadata; `knowledge_embeddings` accepts any entity type but nothing indexes engineering data |
| BOM / material recommendations | ❌ | No recommendation extension point beyond hook registry |
| Design rule validation | ❌ | Hook exists; no rule engine/interface |
| Engineering document embeddings | ❌ | No indexing pipeline for `engineering_documents` |
| Knowledge graph sync | 🟡 | `engineering-ai-hooks` event codes exist; no consumer |
| Local Phi-3 integration | ❌ | Ollama provider exists for chat; no engineering-specific model routing |

All AI work remains **optional and event-driven**; nothing AI is implemented in Sprint 2.3.0.

---

## 8. Prioritized Gap Register (feeds Sprint 2.3.1)

| ID | Gap | Severity | Sprint |
|---|---|---|---|
| G-1 | Artifact-level traceability FKs in manufacturing/quality (drawing/bom/routing on work orders, trials, inspections) | High | 2.3.1 |
| G-2 | BOM effective-date activation & point-in-time selection | High | 2.3.1 |
| G-3 | BOM substitute/alternate selection operation (item-level swap) | High | 2.3.1 |
| G-4 | Routing revision history (snapshot table) + predecessor sequencing | Medium | 2.3.1 |
| G-5 | Multi-reviewer review engine (assignees → reviewer decisions) | High | 2.3.1 |
| G-6 | Drawing file content diff + MinIO-backed attachments on drawings/revisions | Medium | 2.3.2 |
| G-7 | Engineering documents workflow linkage (release/obsolete) | Medium | 2.3.2 |
| G-8 | Unit conversion service (shared UOM registry) | Medium | 2.3.1 |
| G-9 | Standard part supplier catalog model | Medium | 2.3.2 |
| G-10 | Tooling registry unification (tool_master + mold_structures + engineering taxonomies) | High | 2.3.2 |
| G-11 | Impact-analysis automation (affected artifact discovery from links) | Medium | 2.3.3 |
| G-12 | Approval matrix as data (per artifact-type approval policy table) | Medium | 2.3.3 |
| G-13 | Transactional outbox for domain events | High | 2.3.1 |
| G-14 | Engineering artifact embeddings (drawings/BOMs/documents) | Low | 2.3.3 |
| G-15 | ERP/MES integration contract (part number mapping, UOM, exchange envelope) | Low | 2.4 |
| G-16 | Legacy consolidation: design module deprecation, PMM part-list migration into BOMs | Medium | 2.4 |

---

## 9. Conclusion

MITRA already contains a substantial, working Engineering core: DB-driven workflows, revisioned drawings and BOMs, cost roll-up, change management, tenant isolation, RBAC, audit, and AI hook registry. **The foundation sprint must NOT rebuild these.** It must:

1. Formalize the bounded context and domain model around what exists (deliverables 2–3).
2. Close the traceability articulation gap below the Project node (deliverable 4).
3. Extend the Drawing, BOM, and Change architectures with the partial gaps above (deliverables 5–7).
4. Codify API contracts and the testing strategy (deliverables 8–9).
5. Consolidate/retire duplicates (D1–D11) on the roadmap, not in this sprint.
