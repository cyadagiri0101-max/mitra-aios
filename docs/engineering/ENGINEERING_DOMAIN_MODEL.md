# Engineering Domain Model — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Approved baseline.
> **Related:** `docs/engineering/ENGINEERING_ARCHITECTURE.md` (context & layers), `docs/engineering/Engineering_Gap_Analysis.md` (inventory of existing implementation).

This document defines the complete Engineering bounded context in DDD terms: aggregate roots, entities, value objects, domain services, domain events, and repositories — mapped 1:1 to the existing TypeORM implementation so the foundation **formalizes what exists** and **defines what is added** without re-architecting the data model.

---

## 1. Ubiquitous Language

| Term | Definition |
|---|---|
| **Drawing** | Authoritative 2D/3D representation of a mold component or assembly; an aggregate root with revision history, check-in/out, CAD metadata, and workflow state. |
| **DrawingRevision** | One immutable, versioned state of a Drawing's file(s), identified by revision letter + version number. |
| **BOM** | Bill of Materials — the project-scoped, multi-level item tree describing what a mold is built from. |
| **BOMItem** | A node in the BOM tree; may reference a Drawing, Material, or Component. |
| **BOMRevision** | Immutable snapshot of BOM header + item tree. |
| **Component** | Master-data part (STANDARD / PURCHASED / MANUFACTURED) reusable across projects. |
| **ComponentAlternate** | SUBSTITUTE (drop-in) or ALTERNATE (approved) relation between components. |
| **Material** | Master-data material with mechanical/thermal properties. |
| **StandardPart** | A Component of type STANDARD, optionally carrying supplier catalog metadata (HASCO/DME/Meusburger…). |
| **ProcessPlan (Routing)** | Ordered set of Operations that manufactures a part. |
| **Operation** | One step in a Routing: sequence, work center, machine, times, cost, tooling. |
| **WorkCenter** | Physical/functional manufacturing cell (MACHINING, EDM, …) with cost/capacity. |
| **EngineeringChange** | ECR → ECO → ECN lifecycle governing all engineering artifact changes. |
| **EngineeringReview** | Request for decision (peer/lead/design-rule/customer) on an engineering artifact. |
| **Tooling** | The mold/tool itself (BM/IM/IBM/Mold Base/Fixture) — anchored to the tool registry. |

---

## 2. Aggregate Roots

```
┌─────────────────────────── AGGREGATE MAP ───────────────────────────┐
│                                                                    │
│  Project (Project domain — external, referenced by projectId)      │
│    ▲ projectId (NOT NULL on every engineering aggregate)           │
│    │                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Drawing    │  │     BOM      │  │    EngineeringChange     │  │
│  │ (AR)         │  │ (AR)         │  │ (AR) ECR→ECO→ECN         │  │
│  ├ DrawingRev.  │  ├ BOMItem(ent) │  ├ Impacts, AffectedParts,  │  │
│  ├ DrawingFile  │  ├ BOMRevision  │  │ Implementations (ent)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│         │                 │                      │                │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────────▼──────────────┐  │
│  │ ProcessPlan  │  │  Component   │  │   EngineeringReview (AR)  │  │
│  │ (Routing,AR) │  │ (AR)         │  │   + ReviewComment (ent)   │  │
│  │ + Operation  │  │ + Alternates │  └──────────────────────────┘  │
│  │ + WorkCenter │  └──────┬───────┘                                │
│  └──────────────┘         │                                        │
│                ┌──────────▼──────────┐                             │
│                │      Material (AR)  │   StandardPart = Component  │
│                │                     │   (type STANDARD) + catalog │
│                └─────────────────────┘                             │
│                                                                    │
│  EngineeringDocument (AR) + DocumentVersion (ent) — engineering-   │
│  controlled documents (CAD exports, calculations, standards)       │
│                                                                    │
│  Tooling Registry — anchor: tool_master (AR); extension:           │
│  mold_structures; linked to Drawing (mold-level layout drawings)   │
└────────────────────────────────────────────────────────────────────┘
```

### 2.1 Aggregate rules

| # | Rule |
|---|---|
| A-1 | **Drawing** owns its revisions. All changes to revision content happen through Drawing service methods (`checkIn`, `checkOut`, `cancelCheckOut`, `createRevision`); revisions are immutable once written. |
| A-2 | **BOM** owns its items and revision snapshots. `BOMItem` can only be mutated while BOM status ≠ RELEASED/OBSOLETE (existing guard). Item sub-trees are owned by the aggregate (delete cascades). |
| A-3 | **EngineeringChange** owns impacts, affected parts, ECO, and ECN records. ECR/ECO/ECN transitions are transactional and workflow-driven. |
| A-4 | **Component** and **Material** are reference-data aggregates, tenant-scoped, not project-owned; referenced (never embedded) by BOM items. |
| A-5 | **ProcessPlan (Routing)** owns Operations; operation cost derives from work center cost rates; totals are aggregate-derived, never stored independently (recomputed on change). |
| A-6 | **EngineeringReview** is a standalone aggregate referencing any artifact via `entityType` + `entityId` (polymorphic). |
| A-7 | **Tooling** is anchored to `tool_master` (master registry); mold-level detail (assemblies/components/specifications) lives in the tooling sub-domain, consolidated from the legacy `mold` module (Gap D3). |
| A-8 | Cross-aggregate references are UUID columns + indexes (existing convention); invariants are enforced by services and traceability integrity checks. |

---

## 3. Entities and Value Objects

### 3.1 Drawing aggregate

| Type | Name | Key fields | Notes |
|---|---|---|---|
| AR | `EngineeringDrawing` | id, drawingNumber, title, drawingType, projectId, bomId, currentRevision, status, workflowInstanceId, checkedOutBy/At, cad metadata (cadFileType, cadAppName/Version, fileSizeBytes, checksum, dims, scale, sheet), approvedBy/At, releasedBy/At, tags, metadata | Status driven by `engineering_drawing` workflow |
| Entity | `EngineeringDrawingRevision` | drawingId, revision, versionNumber, fileName, filePath, mimeType, fileSize, checksum, status (DRAFT/UNDER_REVIEW/RELEASED/SUPERSEDED/OBSOLETE), changeSummary, checkedInBy/At, releasedBy/At | Append-only; unique (drawingId, revision, versionNumber) |
| VO | `RevisionLetter` | letter | Derived from existing revision lettering (A…Z) |
| VO | `CadMetadata` | cadFileType, cadAppName, cadAppVersion, fileSizeBytes, checksum | Encapsulated on header for search |
| VO | `Dimensions` | lengthMm, widthMm, heightMm, weightKg, drawingScale, sheetSize | |

**Planned additions (Sprint 2.3.2, Gap G-6):**
- Entity `EngineeringDrawingAttachment` (drawingId, kind, minioBucket, minioKey, checksumSha256, uploadedBy) — attachments beyond the primary CAD file.

### 3.2 BOM aggregate

| Type | Name | Key fields | Notes |
|---|---|---|---|
| AR | `EngineeringBom` | bomNumber, name, projectId, drawingId, revision, versionNumber, status, workflowInstanceId, effectiveFrom, effectiveTo, totalCost, currency, isCurrent, releasedBy/At | |
| Entity | `EngineeringBomItem` | bomId, parentItemId, lineNumber, partNumber, partName, itemType, sourceType, drawingId, materialId, componentId, supplierId/Name, quantityPer, quantity, uom, baseUom, conversionFactor, unitCost, extendedCost, costCurrency, leadTimeDays, reference | Multi-level tree; line numbers like "1.2" |
| Entity | `EngineeringBomRevision` | bomId, revision, versionNumber, snapshot(jsonb), totalCost, changeSummary, releasedBy/At | Immutable |
| VO | `EffectivePeriod` | from, to | Valid on header; point-in-time selection (Sprint 2.3.1) |
| VO | `LineNumber` | "1", "1.1", "1.1.2" | Hierarchical, sortable |
| VO | `Money` | amount, currency | Used for unit/extended/total cost |
| VO | `QuantityUom` | quantity, uom, baseUom, conversionFactor | Convertible via UnitConversionService (Gap G-8) |

**Planned additions (Sprint 2.3.1, Gaps G-2/G-3):**
- Entity `EngineeringBomSubstitution` (bomId, itemId, substituteComponentId|substitutePartNumber, relationType, effectiveFrom/To, reason, createdBy) — explicit item-level substitution with activation window.
- Service `selectItem(bomId, itemId, asOfDate)` — point-in-time BOM resolution honoring effective dates + substitutions.

### 3.3 Component / Material / StandardPart aggregates

| Type | Name | Key fields | Notes |
|---|---|---|---|
| AR | `EngineeringComponent` | componentCode, componentName, componentType (STANDARD/PURCHASED/MANUFACTURED), category, manufacturer, modelNumber, uom, unitCost, costCurrency, vendorMapping(jsonb), drawingIds(jsonb), specification, isActive | |
| Entity | `EngineeringComponentAlternate` | componentId, alternateComponentId, relationType (SUBSTITUTE/ALTERNATE), notes | Directional |
| AR | `EngineeringMaterial` | materialCode, materialName, category, grade, standard, density, unitCost, costCurrency, supplierIds, preferredSupplier, mechanicalProperties(jsonb), thermalProperties(jsonb), availableSizes(jsonb), leadTimeDays, moq, status | |
| VO | `VendorMapping` | vendorId, vendorPartNo, cost, currency | On component.vendorMapping |
| VO | `MaterialProperties` | mechanical/thermal jsonb subsets | |
| — | `StandardPart` | realized as Component(type=STANDARD) + catalog metadata | Gap G-9: `engineering_standard_catalogs` (catalogCode, supplierId, componentId, catalogPartNo, supersededBy, drawingIds) |

### 3.4 ProcessPlan aggregate

| Type | Name | Key fields | Notes |
|---|---|---|---|
| AR | `EngineeringRouting` | routingNumber, name, projectId, partId, drawingId, bomId, version, status, workflowInstanceId, totalSetupHours, totalCycleHours, totalStandardHours, totalCost, approvedBy/At, releasedBy/At | |
| Entity | `EngineeringOperation` | routingId, operationNumber (10/20/30), operationCode, description, workCenterId, machineId, setupTimeMinutes, cycleTimeMinutes, standardTimeMinutes, quantityPerCycle, costPerHour, operationCost, toolRequirements(jsonb), materialRequirements(jsonb), inspectionRequired, qualityCheckpoints(jsonb), predecessorOperationId | |
| Entity | `EngineeringWorkCenter` | code, name, workCenterType, location, costPerHour, capacityHoursPerDay, machineIds(jsonb), isActive | Reference data; not project-owned |

**Planned additions (Sprint 2.3.1, Gap G-4):**
- Entity `EngineeringRoutingRevision` — immutable snapshot table mirroring the BOM revision pattern; routing `version` on header is display-only thereafter.
- Operation sequencing becomes derived from `predecessorOperationId` (cycle-safe validation on write).

### 3.5 EngineeringChange aggregate

| Type | Name | Key fields | Notes |
|---|---|---|---|
| AR | `EngineeringChangeRequest` | ecrNumber, projectId, partId, drawingId, bomId, routingId, workOrderId, title, changeType, priority, impactAssessment, costImpact, scheduleImpactDays, status (workflow-mirrored), workflowInstanceId, approvedBy/At, rejectionReason | |
| Entity | `EngineeringChangeOrder` | ecoNumber, ecrId, projectId, drawingId, bomId, implementationPlan, dates, responsiblePersonId, verificationStatus, status | |
| Entity | `EngineeringChangeNotice` | ecnNumber, ecoId, ecrId, projectId, title, description, status, issuedBy/At, effectiveDate, notifiedTo(jsonb), affectedManufacturingOrders(jsonb) | |
| Entity | `EngineeringChangeImpact` | ecrId, impactType (DRAWING/BOM/PROJECT/WORK_ORDER/ROUTING/MATERIAL/COMPONENT/DOCUMENT/OTHER), entityId, entityNumber, severity, disposition, isResolved | |
| Entity | `EcrAffectedPart` | ecrId, partId, partNumber, currentRevision, newRevision, changeDescription, disposition, effectiveDate, isCritical | |
| Entity | `EcoImplementation` | ecoId, taskDescription, taskType, assignedTo, dueDate, verificationRequired, verificationStatus, evidenceNotes, status | |
| VO | `ChangeDisposition` | RETAIN / REVISE / REPLACE / OBSOLETE | |
| VO | `ImpactSeverity` | LOW / MEDIUM / HIGH / CRITICAL | |

**Planned additions (Sprint 2.3.3, Gaps G-11/G-12):**
- Service `ImpactAnalysisService.analyze(ecrId)` — automatic discovery of affected artifacts from links (drawings, BOM items, routings, work orders).
- Entity `EngineeringApprovalPolicy` (artifactType, transitionKey, requiredRoles, order, minApprovals) — approval matrix as data.

### 3.6 EngineeringReview aggregate

| Type | Name | Key fields | Notes |
|---|---|---|---|
| AR | `EngineeringReviewRequest` | reviewNumber, projectId, entityType (DRAWING/BOM/ROUTING/CHANGE/DOCUMENT), entityId, title, description, reviewType (PEER/LEAD/DESIGN_RULE/CUSTOMER), requestedBy/Name, reviewerId/Name, dueDate, completedAt, status, decision, decisionComments, markups(jsonb), attachments(jsonb) | |
| Entity | `EngineeringReviewComment` | reviewRequestId, authorId/Name, body, markupData(jsonb), isResolved, resolvedBy/At | |
| VO | `ReviewDecision` | APPROVE / REJECT / CHANGES_REQUIRED / CONCURRED | |

**Planned additions (Sprint 2.3.1, Gap G-5):**
- Entity `EngineeringReviewAssignment` (reviewId, assigneeId, sequence, status, decision, decidedBy/At) — multi-reviewer support; DTO `assignees[]` already exists. Aggregation policy: ALL-APPROVE (default for LEAD/DESIGN_RULE), ANY-APPROVE (default for PEER), configurable per reviewType.

### 3.7 EngineeringDocument aggregate

| Type | Name | Key fields | Notes |
|---|---|---|---|
| AR | `EngineeringDocument` | documentNumber, projectId, docType, title, description, fileName, mimeType, fileSize, currentVersion, status, drawingId, bomId, releasedBy/At, metadata | |
| Entity | `EngineeringDocumentVersion` | documentId, versionNumber, fileName, filePath, mimeType, fileSize, checksum, uploadedBy/Name, notes | Append-only |

**Planned additions (Sprint 2.3.2, Gap G-7):**
- `workflowInstanceId` on EngineeringDocument + seeded `engineering_document` workflow (DRAFT → UNDER_REVIEW → RELEASED → SUPERSEDED/OBSOLETE) using the same adapter pattern.

---

## 4. Domain Services

| Service | Responsibility | Status |
|---|---|---|
| `EngineeringNumberingService` | Central business-number generation (DRW/BOM/RTG/RVR/ECR/ECO/ECN) with unique retry | Extract to shared service (existing logic in each service) |
| `EngineeringDrawingService` | Drawing aggregate operations incl. check-in/out, revision, compare | ✅ exists |
| `EngineeringBomService` | BOM aggregate operations: tree, cost roll-up, revision, clone, compare, import/export | ✅ exists |
| `BomEffectiveDateService` | Point-in-time BOM resolution (effective period + substitutions) | 🆕 2.3.1 |
| `BomSubstitutionService` | Substitute/alternate selection & swap with history | 🆕 2.3.1 |
| `UnitConversionService` | UOM conversion over `uom_conversions` | 🆕 2.3.1 |
| `EngineeringProcessPlanningService` | Routing/operation/work-center operations | ✅ exists |
| `EngineeringChangeService` | ECR/ECO/ECN lifecycle + workflow + impacts | ✅ exists (ecr-eco) |
| `ImpactAnalysisService` | Automated affected-artifact discovery | 🆕 2.3.3 |
| `ApprovalPolicyService` | Evaluate approval matrix for workflow transitions | 🆕 2.3.3 |
| `EngineeringReviewService` | Review requests, decisions, comments | ✅ exists (extend for multi-reviewer 2.3.1) |
| `EngineeringDocumentService` | Document + version management | ✅ exists |
| `EngineeringTraceabilityService` | Cross-context lineage queries (read-only) | ✅ exists (extend for artifact links 2.3.1) |
| `EngineeringWorkflowService` | DB-driven transition adapters (drawing/bom/routing) | ✅ exists |
| `EngineeringAiHooksService` | Hook registry + dispatch | ✅ exists |
| `DrawingDiffService` | File-level diff (hash comparison + content diff for text formats) | 🆕 2.3.2 |
| `ToolingRegistryService` | Unified tooling registry facade (tool_master + mold_structures + engineering links) | 🆕 2.3.2 |
| `EngineeringEventRelay` | Outbox → bus/subscribers relay | 🆕 2.3.1 |

---

## 5. Domain Events

All events are typed in `events/engineering.events.ts` (`EngineeringDomainEventType`, 22 values) and published via `EngineeringEventBus` post-commit. The outbox (Sprint 2.3.1) persists them transactionally.

| Event | Producer | Consumers (target) |
|---|---|---|
| `DRAWING_CREATED`, `DRAWING_CHECKED_OUT`, `DRAWING_CHECKED_IN`, `DRAWING_STATUS_CHANGED` | Drawing service / workflow adapter | Traceability index, AI hooks, Knowledge context |
| `DRAWING_REVISION_UPLOADED` *(defined, never published — wire in 2.3.1)* | Drawing service | AI hooks, embedding pipeline |
| `BOM_CREATED`, `BOM_REVISIONED`, `BOM_RELEASED` (via status), `BOM_ITEM_CHANGED` | BOM service | Cost views, MES prep |
| `BOM_EFFECTIVE_DATE_ACTIVATED` *(new 2.3.1)* | BomEffectiveDateService | Manufacturing, ERP |
| `BOM_SUBSTITUTION_APPLIED` *(new 2.3.1)* | BomSubstitutionService | Purchasing, MES |
| `ROUTING_CREATED`, `ROUTING_RELEASED` | Process planning service | Manufacturing |
| `CHANGE_REQUESTED`, `CHANGE_APPROVED`, `CHANGE_NOTICE_ISSUED` | Change service | Quality, Manufacturing, Service |
| `CHANGE_RELEASED` *(defined, never published — wire in 2.3.1)* | Change service | Knowledge |
| `REVIEW_REQUESTED`, `REVIEW_DECIDED` | Review service | Notifications |
| `DOCUMENT_UPLOADED`, `DOCUMENT_VERSIONED` | Document service | Search, Knowledge |

`ENGINEERING_AI_HOOKS` (8 codes): SIMILAR_DRAWING_SEARCH, BOM_RECOMMENDATION, MATERIAL_SUGGESTION, DESIGN_RULE_VALIDATION, ENGINEERING_KNOWLEDGE_EXTRACTION, ENGINEERING_DOCUMENT_INDEXING, EMBEDDING_GENERATION, KNOWLEDGE_GRAPH_UPDATE — all optional, disabled by default.

---

## 6. Repositories

Convention: TypeORM repositories injected per entity via `TypeOrmModule.forFeature`; domain services use `Repository<E>` with tenant scoping helpers. Cross-aggregate reads use explicit QueryBuilder (no relations) per the architecture's cross-context rule.

| Repository (target) | Key queries |
|---|---|
| `DrawingRepository` | by project/status/type; latest revision; checked-out-by; obsolete with revision history |
| `DrawingRevisionRepository` | by drawing ASC (revision, version); latest; supersede current on release |
| `BomRepository` | by project/status/revision; **point-in-time active (effectiveFrom≤d≤effectiveTo, Sprint 2.3.1)** |
| `BomItemRepository` | by bom; sub-tree by parentItemId; by component/material/drawing refs |
| `BomRevisionRepository` | snapshots DESC; compare pair fetch |
| `RoutingRepository` / `OperationRepository` | by project; by work center; sequence-ordered operations |
| `ComponentRepository` / `MaterialRepository` | searchable master data; bulk findByIds |
| `ChangeRepository` | ECR/ECO/ECN by project/status; impacts by entityId (reverse index) |
| `ReviewRepository` | by entity (polymorphic); reviewer queue; by status |
| `DocumentRepository` | by project/type; version chain |

---

## 7. Relationships Summary (master table)

| From | To | Kind | Card. | Key |
|---|---|---|---|---|
| Drawing | Project | ref | N:1 | projectId |
| Drawing | BOM | ref | N:1 (opt) | bomId |
| DrawingRevision | Drawing | owned | N:1 | drawingId |
| BOM | Project | ref | N:1 | projectId |
| BOMItem | BOM | owned | N:1 | bomId |
| BOMItem | BOMItem | owned (tree) | N:1 | parentItemId |
| BOMItem | Drawing/Material/Component | ref | N:1 each | drawingId / materialId / componentId |
| BOMRevision | BOM | owned | N:1 | bomId |
| ComponentAlternate | Component | owned | 2×N:1 | componentId / alternateComponentId |
| Routing | Project, Drawing, BOM | ref | N:1 | projectId / drawingId / bomId |
| Operation | Routing, WorkCenter, Machine | ref | N:1 | routingId / workCenterId / machineId |
| ECR | Project, Drawing, BOM, Routing, WO | ref | N:1 | projectId / drawingId / bomId / routingId / workOrderId |
| ECO | ECR | owned | N:1 | ecrId |
| ECN | ECO, ECR | owned | N:1 | ecoId / ecrId |
| ChangeImpact | ECR | owned | N:1 | ecrId |
| Review | Drawing/BOM/Routing/Change/Document | ref (poly) | N:1 | entityType + entityId |
| ReviewComment | Review | owned | N:1 | reviewRequestId |
| Document | Project, Drawing, BOM | ref | N:1 | projectId / drawingId / bomId |
| DocumentVersion | Document | owned | N:1 | documentId |
| Tooling (tool_master) | Project | ref | N:1 | projectId (target 2.3.2) |
| Drawing | Tooling | ref (target) | N:1 | toolId (target 2.3.2) |

---

## 8. Consistency & Invariants

1. **No orphans**: every engineering aggregate requires `projectId` (DTO `ProjectScopeDto` guard).
2. **Released = frozen**: BOM items/routing operations/ECRs cannot be modified in RELEASED/terminal states (existing guards + workflow).
3. **Revision immutability**: revisions and snapshots are append-only; corrections create new versions (Constitution: auditability).
4. **Cost derivation**: extended/total costs are derived values recomputed by `rollupCost`/`recomputeTotals`; never trusted from input.
5. **Single active revision**: releasing a new drawing revision supersedes the previous (status SUPERSEDED).
6. **Cycle safety**: routing predecessor chains and BOM parent/child links are validated against cycles on write.
7. **Effective dates**: a BOM's `effectiveFrom` must be < `effectiveTo`; an item substitution window must lie within the BOM's window (2.3.1).
8. **Tenant isolation**: cross-tenant reads → 404 (existing pattern); writes auto-stamped by subscriber.

---

## 9. Mapped to the Sprint's Required Aggregate List

| Required aggregate | Mapping |
|---|---|
| EngineeringProject | Not a new aggregate — the existing Project domain (`projects`) is the central aggregate (Constitution §2); engineering references it by `projectId` |
| Drawing / DrawingRevision | `EngineeringDrawing` / `EngineeringDrawingRevision` ✅ |
| BOM / BOMRevision | `EngineeringBom` / `EngineeringBomRevision` ✅ |
| Component | `EngineeringComponent` (+ alternates) ✅ |
| Material | `EngineeringMaterial` ✅ |
| EngineeringChange | ECR/ECO/ECN aggregates ✅ |
| ProcessPlan / Operation | `EngineeringRouting` / `EngineeringOperation` ✅ |
| Tooling | Tool registry anchor `tool_master` + tooling sub-domain (consolidated `mold_structures`) — Sprint 2.3.2 |
| StandardPart | Component(type=STANDARD) + `engineering_standard_catalogs` — Sprint 2.3.2 |
| EngineeringReview | `EngineeringReviewRequest` (+ comments) ✅ |
