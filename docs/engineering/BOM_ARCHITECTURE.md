# BOM Architecture — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Approved baseline.
> **Related:** `docs/engineering/ENGINEERING_DOMAIN_MODEL.md` (§3.2 BOM aggregate), `docs/engineering/Engineering_Gap_Analysis.md` (gaps G-2, G-3, G-8, G-15), `WORKFLOW_ENGINE.md` (seeded `engineering_bom` graph).

---

## 1. Scope

The BOM is the material spine of a mold project: from mold base to cavity inserts, standard components, fasteners, and purchased parts. This architecture covers:

1. Unlimited BOM levels
2. Alternate parts
3. Substitute parts
4. Effective dates
5. Cost roll-up
6. Unit conversion
7. BOM comparison
8. BOM cloning
9. Revision history
10. ERP/MES integration readiness

---

## 2. Lifecycle (DB-driven workflow)

Seeded graph `engineering_bom` (migration 0017 / seed.ts):

```
                 ┌────────────────────────────┐
                 ▼                            │
 DRAFT ──► UNDER_REVIEW ──► APPROVED ──► RELEASED ──► OBSOLETE (final)
   ▲            │ ▲                            │
   └────────────┘ └── Request Changes (DRAFT)  └── Send Back (DRAFT)
```

| Transition | Guard | Approval gate |
|---|---|---|
| DRAFT → UNDER_REVIEW (`Submit for Review`) | `engineering:bom:update` | — |
| UNDER_REVIEW → APPROVED (`Approve BOM`) | `engineering:review:approve` | — |
| UNDER_REVIEW → DRAFT (`Request BOM Changes`) | `engineering:bom:update` | — |
| APPROVED → RELEASED (`Release BOM`) | `engineering:bom:release` | **requiresApproval=true, approvalRoles=[MANAGEMENT, DESIGN]** |
| APPROVED → DRAFT (`Send BOM Back`) | `engineering:bom:update` | — |
| RELEASED → OBSOLETE (`Mark BOM Obsolete`) | `engineering:bom:update` | — |

**Write guards:** items/revisions/clone/import are blocked while status = RELEASED (existing behavior). Only the change process (ECR/ECO/ECN) modifies released BOMs — implemented as: ECO `APPROVED & Implement` creates a **new BOM revision**; the old revision stays RELEASED with `effectiveTo` set by the ECN.

---

## 3. Unlimited Levels

- `engineering_bom_items.parentItemId` (self-reference) gives an arbitrary-depth tree; `lineNumber` ("1", "1.1", "1.1.2") mirrors the hierarchy and is regenerated on structural moves.
- `getTree(bomId)` returns the nested tree (`BomTreeNode`); `importCsv`/`exportCsv` round-trip the hierarchy via `parentLineNumber`.
- **Cycle guard (2.3.1):** `addItem`/`updateItem` with `parentItemId` validates the target is not a descendant of the moved node (DFS), 409 on cycle.
- **Level cap (config):** `BOM_MAX_DEPTH` (default 20) as a defensive bound, not a design limit.

---

## 4. Alternates & Substitutes

### 4.1 Concepts

| Concept | Level | Semantics |
|---|---|---|
| **Alternate** | Component master (`engineering_component_alternates`, relationType=ALTERNATE) | Approved-but-not-identical part; requires review/approval before use |
| **Substitute** | Component master (`relationType=SUBSTITUTE`) | Drop-in replacement; may be used without drawing change |
| **Item-level substitution** (new, Gap G-3, 2.3.1) | BOM item (`engineering_bom_substitutions`) | Explicit selection on a specific BOM line with effective window |

### 4.2 Component-level (exists)

`listAlternates(componentId)`, `addAlternate` (self/duplicate rejection), `removeAlternate`. Both-directional soft-delete cascade on component removal.

### 4.3 Item-level substitution (new — Gap G-3)

New entity `engineering_bom_substitutions`:

```
id, bomId, itemId, substituteComponentId (nullable), substitutePartNumber (nullable),
substituteDescription, relationType (SUBSTITUTE|ALTERNATE), effectiveFrom, effectiveTo,
reason, createdBy, createdByName, tenantId, deletedAt
UNIQUE (bomId, itemId, relationType, effectiveFrom)
```

Operations (BomSubstitutionService):
- `addSubstitution(bomId, itemId, dto)` — validates the component exists (or partNumber present), window ⊆ BOM effective window, no overlap with an active substitution.
- `applySubstitution(bomId, itemId, substitutionId, asOf)` — **approval-gated** (permission `engineering:bom:substitute`), sets item's effective component/part/cost within window, appends audit + `BOM_SUBSTITUTION_APPLIED` event.
- `selectItem(bomId, itemId, asOf)` — point-in-time resolution (see §5).
- Substitution never mutates the base item; it layers a time-boxed override so revisions and cost history remain intact.

---

## 5. Effective Dates (new — Gap G-2, 2.3.1)

### 5.1 Model

- `engineering_boms.effectiveFrom` / `effectiveTo` already exist (currently unused).
- Rule: a BOM revision is **active** for date `d` iff `effectiveFrom ≤ d ≤ effectiveTo` (effectiveTo null = open-ended).
- `isCurrent` becomes **derived**, not stored: current = latest released revision active at the query date. Migration 0018 adds a partial unique index on active released revisions: `UNIQUE (projectId) WHERE status='RELEASED' AND effectiveTo IS NULL` (soft constraint; conflicts flagged by integrity job until data cleaned).

### 5.2 Point-in-time selection (BomEffectiveDateService)

```
selectBomFor(projectId | drawingId, asOfDate) → EngineeringBom
  candidates = RELEASED boms for project with effective window containing asOfDate
  pick max(createdAt) among candidates (tie-break: highest revision letter)
```

- Used by: work order creation (basis BOM for MO), manufacturing BOM explosion, cost reports as-of date, ERP sync.
- `asOf` default = today; validation rejects asOf outside project lifecycle window.

### 5.3 Change-driven windowing

- When an ECN issues with `effectiveDate`, the ECO implementation closes the current BOM revision (`effectiveTo = effectiveDate − 1 day`) and opens the successor (`effectiveFrom = effectiveDate`) — done in the change workflow adapter (see ENGINEERING_CHANGE_ARCHITECTURE.md §5).

---

## 6. Cost Roll-up

Algorithm (existing `rollupCost`, formalized):

```
leaf:      extendedCost  = quantityPer × unitCost (converted to baseUom, then to cost currency)
parent:    extendedCost  = Σ children extendedCost × quantityPer(parent)  [Σ over direct children]
BOM total: totalCost     = Σ top-level items extendedCost
```

- Currency: single BOM currency (`currency` header); item `costCurrency` converted via `UnitConversionService.currencyRate` when present (rates table optional; default 1 when same currency).
- Roll-up is **recomputed**, never trusted from input; runs automatically after item add/update/remove/import and after workflow release.
- **Cost views (2.3.1):** `getCostBreakdown(bomId)` → by itemType (STANDARD_COMPONENT/PURCHASED_COMPONENT/RAW_MATERIAL/TOOLING/CONSUMABLE), by supplier, by sourceType (MAKE/BUY/SUB_CONTRACT) — feeds dashboard + quotation margin analysis.

---

## 7. Unit Conversion (new — Gap G-8, 2.3.1)

- New table `uom_conversions`: `(fromUom, toUom, factor, validFrom, validTo)`; seeded with SI/imperial families (g↔kg↔lb, mm↔in, pcs↔dozen, etc.); factor = `to = from × factor`.
- New `UnitConversionService`: `convert(qty, fromUom, toUom, asOf?)` — exact match → family lookup → error 422 listing available UOMs.
- BOM items already carry `uom`, `baseUom`, `conversionFactor`; on item write, if `baseUom` set and `uom ≠ baseUom`, `conversionFactor` is validated/derived from the service (rejects user-supplied inconsistent factors).
- Exposed API: `GET /api/engineering/uom/conversion?from=kg&to=lb` (read), `POST /api/engineering/uom/conversions` (ADMIN, `engineering:uom:update`).

---

## 8. Comparison, Cloning, Revision History

### 8.1 Comparison (exists)

`compareRevisions(bomId, revA, revB)` → `{added, removed, changed[{item, fields}]}`. Extended in 2.3.1 with:
- `?cost=true` — include extendedCost deltas (currently excluded by default) with currency-aware totals.
- Substitution/effective-date awareness: identical base items with different active substitutions are reported as `changed(fields: [substituteComponentId, effectiveFrom…])`.

### 8.2 Cloning (exists)

`clone(bomId, data)` — new number, fresh items, parent re-link by (partNumber, lineNumber) match, full roll-up, **no revision history copied**. Extended in 2.3.1:
- `cloneStructure` (items only, no cost) for "copy as draft" scenarios.
- Cross-project clone allowed only if target project exists (projectId validation).

### 8.3 Revision history (exists)

- `createRevision` — immutable JSON snapshot (header + items), version bump or letter bump.
- `listRevisions` DESC; snapshots are the audit-grade record (supplements `audit_logs`).
- **Snapshot schema versioning (2.3.1):** snapshots gain `schemaVersion` (int, default 1) so future item-field additions don't break comparators.

---

## 9. BOM → Downstream Contracts

| Consumer | Contract |
|---|---|
| Work orders (2.3.1) | `work_orders.bom_id`/`bom_item_id` set from `selectBomFor(project, MO date)`; item snapshot (part number, uom, qty) copied at MO creation — downstream reads stay stable |
| Manufacturing explosion | `getTree` filtered by MAKE/SUB_CONTRACT items; `TOOLING` items excluded from material issues but included in cost |
| Quality inspection | `inspection_reports.bom_item_id` (2.3.1) |
| ERP/MES (2.4) | Exchange envelope §10 |
| Cost/quote analytics | Cost breakdown views §6 |

---

## 10. ERP/MES Integration Readiness (target — Gap G-15)

Prepared seams (no implementation in 2.3.x unless requested):

| Seam | Mechanism |
|---|---|
| Stable identity | `bomNumber` + item `lineNumber` (business keys) alongside UUIDs |
| External part mapping | `engineering_components.externalCodes` jsonb (`erpPartNo`, `mesPartNo`, `customerPartNo`); BOM items inherit via `componentId` |
| UOM parity | `UnitConversionService`; `uom_conversions` seeded to match ERP UOMs |
| Change propagation | ECN `effectiveDate` + `notifiedTo` jsonb; `CHANGE_NOTICE_ISSUED` outbox event |
| Exchange envelope (2.4) | `engineering_exchange_headers` (entityType, entityId, direction, status, externalId, payloadRef) + export/import jobs (XML/JSON/CSV) |
| Idempotency | Every exchange job keyed by (entityType, entityId, externalId, hash) with replay-safe upserts |

---

## 11. BOM API Surface (summary — full contracts in ENGINEERING_API_SPECIFICATION.md)

Existing: CRUD, `items`, `tree`, `cost`, `revisions`, `compare/:a/:b`, `export`, `import`, `clone`.
New (2.3.1): `POST /:id/substitutions`, `POST /:id/substitutions/:sid/apply`, `GET /:id/substitutions`, `GET /:id/select?asOf=`, `GET /:id/cost-breakdown`, `GET /:id/revisions/:revA/compare/:revB?cost=true`, `GET /uom/conversion`, `POST /uom/conversions`.
Permissions: existing `engineering:bom:*` + new `engineering:bom:substitute`, `engineering:uom:*`.
