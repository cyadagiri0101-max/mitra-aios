# Drawing Architecture — MITRA v3.4 (Sprint 2.3.0)

> **Status:** Approved baseline.
> **Related:** `docs/engineering/ENGINEERING_DOMAIN_MODEL.md` (§3.1 Drawing aggregate), `docs/engineering/ENGINEERING_TRACEABILITY.md` (drawing nodes), `WORKFLOW_ENGINE.md` (seeded `engineering_drawing` graph).

---

## 1. Scope

Defines the architecture for the Drawing sub-domain: revision history, check-in/check-out, version comparison, CAD metadata, attachments, and the approval / release / obsolete workflows — **all workflow definitions are database-driven** (no hardcoded state machines).

---

## 2. Drawing Lifecycle (DB-driven workflow)

The canonical graph is seeded in migration 0017 / `seed.ts` (`workflow_type = 'engineering_drawing'`, states in `workflow_states`, transitions in `workflow_transitions`, fixed UUIDs):

```
                     ┌──────────────────────────────┐
                     ▼                              │
 DRAFT ──► IN_DESIGN ──► PEER_REVIEW ──► LEAD_APPROVAL ──► RELEASED
   ▲            ▲            │ ▲                 │ ▲            │
   │            │            │ └── Rework (IN_DESIGN)           │
   └────────────┴────────────┴── Send Back (IN_DESIGN)          │
                                                                │
                          REVISION_REQUIRED ◄───────────────────┘
                                │
                                ▼ (Revise → IN_DESIGN)
                                
 RELEASED ──► OBSOLETE (final)
```

| Transition | Guard | Approval gate |
|---|---|---|
| DRAFT → IN_DESIGN (`Start Design`) | `engineering:drawing:update` | — |
| IN_DESIGN → PEER_REVIEW (`Submit for Peer Review`) | `engineering:drawing:update` | — |
| PEER_REVIEW → LEAD_APPROVAL (`Approve in Peer Review`) | `engineering:review:approve` | — |
| PEER_REVIEW → IN_DESIGN (`Rework after Peer Review`) | `engineering:drawing:update` | — |
| LEAD_APPROVAL → RELEASED (`Release Drawing`) | `engineering:drawing:release` | **requiresApproval=true, approvalRoles=[MANAGEMENT, DESIGN]** |
| LEAD_APPROVAL → IN_DESIGN (`Send Back to Design`) | `engineering:drawing:update` | — |
| RELEASED → REVISION_REQUIRED (`Require Revision`) | `engineering:drawing:update` | — |
| REVISION_REQUIRED → IN_DESIGN (`Revise Drawing`) | `engineering:drawing:update` | — |
| RELEASED → OBSOLETE (`Mark Obsolete`) | `engineering:drawing:update` | — |

**Rules:**
- The workflow instance (`workflow_instances.entity_type='drawing'`) is the **single source of truth** for status; `engineering_drawings.status` mirrors it (ADR-001/006 pattern via `EngineeringWorkflowService`).
- No controller/service mutates `status` directly.
- Reaching RELEASED stamps `releasedBy`/`releasedAt` and supersedes the previously current revision.
- Marking OBSOLETE requires no open check-out and no RELEASED children referencing the drawing as their basis (BOM release check — Sprint 2.3.1).

---

## 3. Revision Model

### 3.1 Structure

```
engineering_drawings                        engineering_drawing_revisions
├─ id                                       ├─ drawingId
├─ drawingNumber  DRW-YYYY-####             ├─ revision          (letter A, B, C …)
├─ currentRevision ("B")                    ├─ versionNumber     (1, 2, … within letter)
├─ status (mirror)                          ├─ fileName/filePath/mimeType/fileSize
└─ workflowInstanceId                       ├─ checksum
                                            ├─ status (DRAFT/UNDER_REVIEW/RELEASED/SUPERSEDED/OBSOLETE)
                                            ├─ changeSummary
                                            └─ checkedInBy/At, releasedBy/At
```

- **Revision letter** = controlled change to the design intent (goes through the workflow).
- **Version number** = file iteration within the same letter (check-in without intent change).
- Immutability: a written revision row is never updated; corrections append a new row (existing behavior).

### 3.2 Check-in / Check-out (existing, extended)

| Operation | Current behavior | Target (2.3.x) |
|---|---|---|
| `checkOut` | Locks drawing; ConflictException if already out; `DRAWING_CHECKED_OUT` event | unchanged |
| `checkIn` | Appends revision (version+1 within letter); updates CAD metadata + checksum; clears lock; event | unchanged; add MinIO upload path (2.3.2) |
| `cancelCheckOut` | Releases lock; no revision | unchanged |
| **Ownership** | Conflict if checked out by another user | unchanged; plus **stale-lock expiry** policy (configurable `DRAWING_CHECKOUT_MAX_HOURS`, ADMIN override) — 2.3.2 |

### 3.3 Version comparison

- **Metadata diff (exists):** `compareRevisions` → `{differences[], identical}` over fileName/mimeType/size/checksum/status/changeSummary.
- **File-content diff (new, Gap G-6, 2.3.2):** `DrawingDiffService`
  - Always: SHA-256 equality (fast-path identical).
  - Text-based formats (DXF, STEP, IGES, DWG via converter when available): normalized line diff → `{identical, differences: [{line, from, to}], changeCount}`.
  - Binary CAD formats: checksum + size comparison + metadata summary (no byte diff); store diff summary with the revision.
- API: `GET /api/engineering/drawings/:id/compare/:revisionA/:revisionB?content=true` (content=true is gated by `engineering:drawing:compare`).

---

## 4. CAD Metadata

Stored on the drawing header (existing columns): `cadFileType`, `cadAppName`, `cadAppVersion`, `fileSizeBytes`, `lastFileChecksum`, `lengthMm/widthMm/heightMm`, `drawingScale`, `sheetNumber`, `sheetSize`, `weightKg`, plus JSONB `metadata` for vendor-specific keys.

- **Write path (2.3.2):** `CadMetadataExtractor` — optional, pluggable per `CadFileType`; when MinIO object arrives at check-in, an extractor may populate dims/scale/weight. If no extractor configured → metadata stays manual (existing DTO fields). Extraction is **never required** for check-in (offline-safe).
- **Read path:** full-text search over `title`, `drawingNumber`, `tags`, `metadata` (pg_trgm existing).

---

## 5. Attachments (new — Gap G-6, 2.3.2)

New entity `engineering_drawing_attachments`:

```
id, drawingId, revisionLetter (nullable), kind (PDF_VIEW|REFERENCE|MARKUP|CUSTOMER),
minioBucket, minioKey, originalName, mimeType, sizeBytes, checksumSha256,
uploadedBy, uploadedByName, createdAt, tenantId, deletedAt
```

- Upload via existing `MinioService.validateUpload` (whitelist, 50 MB cap, magic numbers).
- Attachments are never part of the revision chain (revisions = design intent files only); markups from reviews may be attached via `kind=MARKUP` and reference `reviewRequestId` in `metadata`.

---

## 6. Drawing ↔ BOM / Routing / Change Relationships

| Link | Column | Rule |
|---|---|---|
| Drawing → BOM | `engineering_boms.drawingId` | A BOM created from a drawing must reference a drawing in DRAFT/IN_DESIGN/PEER_REVIEW/LEAD_APPROVAL/RELEASED (not OBSOLETE) |
| BOM → Drawing revision | BOM header `revision` | The BOM basis revision letter; a new drawing revision does **not** silently re-baseline BOMs — BOMs are revised through the change process |
| Drawing → Routing | `engineering_routings.drawingId` | Same basis rule |
| Drawing → ECR | `engineering_change_requests.drawingId` | ECR against a drawing requires `drawingId` of the drawing being changed + target `newRevision` on affected parts |
| Drawing → Review | `engineering_review_requests` (entityType=DRAWING) | PEER_REVIEW transition requires an APPROVED peer review (Sprint 2.3.1 enforcement hook via workflow `conditions`) |

---

## 7. Workflow Enforcement Points (Sprint 2.3.1)

1. **Release gate:** transition `LEAD_APPROVAL → RELEASED` fails with 409 if any open review (PENDING/IN_REVIEW) exists on the drawing.
2. **Revision gate:** `checkIn` with a new **revision letter** is blocked while drawing status ≠ REVISION_REQUIRED/IN_DESIGN (intent change requires workflow cycle; file iterations within a letter are always allowed).
3. **Obsolete gate:** blocked while `checkedOutBy` is set; blocked if any RELEASED BOM references the drawing as basis (must route through change process).
4. **Review integration:** `EngineeringReviewService.decide` (APPROVED, entityType=DRAWING) emits `REVIEW_DECIDED`; the workflow adapter consumes it to unlock `PEER_REVIEW → LEAD_APPROVAL` when policy `requires review approved` is set.

These gates are implemented as service invariants + optional workflow `conditions` jsonb (`{field, operator, value}`) evaluated by the workflow engine — no hardcoded state machine.

---

## 8. Drawing API Surface (summary — full contracts in ENGINEERING_API_SPECIFICATION.md)

| Method | Route | Permission |
|---|---|---|
| GET | `/api/engineering/drawings` | `engineering:drawing:read` |
| GET | `/api/engineering/drawings/:id` | read |
| GET | `/:id/revisions` · `/:id/revisions/latest` | read |
| GET | `/:id/compare/:revA/:revB` (+ `?content=true` 2.3.2) | `engineering:drawing:compare` |
| POST | `/api/engineering/drawings` | `engineering:drawing:create` |
| PATCH | `/:id` | `engineering:drawing:update` |
| DELETE | `/:id` (soft, cascades revisions) | `engineering:drawing:delete` (ADMIN/MANAGEMENT) |
| POST | `/:id/revisions` (check-in) | `engineering:drawing:checkin` |
| POST | `/:id/checkout` · `/:id/checkout/cancel` | `engineering:drawing:checkout` |
| GET/POST | `/:id/workflow` / `/:id/workflow/transition` | `engineering:workflow:read` / `:write` |
| POST | `/:id/attachments` (2.3.2) | `engineering:drawing:update` |
| GET | `/:id/attachments/:attachmentId/download` (2.3.2) | read |
